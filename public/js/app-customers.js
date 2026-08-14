const API_BASE_URL =
  window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
    ? window.location.origin
    : (window.location.hostname.includes("netlify.app")
        ? "https://photohunt-v2-production.up.railway.app"
        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
            : window.location.origin));

const LOCAL_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

const scope = {
  category: localStorage.getItem("customerCategory") || "all",
  city: localStorage.getItem("customerCity") || localStorage.getItem("userCity") || "all",
  searchMode: "manual", // 'manual' or 'ai'

  async loadStudios() {
    try {
      console.log(`📡 Fetching studios from: ${API_BASE_URL}/studios?category=${this.category}&city=${this.city}`);
      const res = await fetch(
        `${API_BASE_URL}/studios?category=${this.category}&city=${this.city}`
      );
      let studios = await res.json();

      // Fallback: If current city/category filter yields 0 studios, automatically fetch all studios as fallback
      if (Array.isArray(studios) && studios.length === 0 && (this.city !== "all" || this.category !== "all")) {
        console.warn(`Filter (city: ${this.city}, category: ${this.category}) returned 0 studios. Falling back to all studios.`);
        const fallbackRes = await fetch(`${API_BASE_URL}/studios?category=all&city=all`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            studios = fallbackData;
          }
        }
      }

      this.renderStudios(studios, false);
    } catch (err) {
      console.error("Gagal memuat studio:", err);
    }
  },

  switchSearchMode(mode) {
    this.searchMode = mode;
    const tabManual = document.getElementById("tab-manual");
    const tabAI = document.getElementById("tab-ai");
    const manualView = document.getElementById("manual-search-view");
    const aiView = document.getElementById("ai-search-view");

    if (mode === "ai") {
      if (tabManual) tabManual.classList.remove("active");
      if (tabAI) tabAI.classList.add("active");
      if (manualView) manualView.style.display = "none";
      if (aiView) aiView.style.display = "block";
      const aiInput = document.getElementById("ai-prompt-input");
      if (aiInput) aiInput.focus();
    } else {
      if (tabManual) tabManual.classList.add("active");
      if (tabAI) tabAI.classList.remove("active");
      if (manualView) manualView.style.display = "block";
      if (aiView) aiView.style.display = "none";
      this.loadStudios();
    }
  },

  switchCategory(category) {
    this.category = category;
    localStorage.setItem("customerCategory", category);
    this.syncCategoryTabUI();
    this.loadStudios();
  },

  filterStudio(city, el) {
    this.city = city;
    localStorage.setItem("customerCity", city);
    localStorage.setItem("userCity", city);

    if (el) {
      document.querySelectorAll(".city-tab").forEach(tab =>
        tab.classList.remove("active")
      );
      el.classList.add("active");
    } else {
      this.syncCityTabUI();
    }

    if (this.searchMode === "ai") {
      this.switchSearchMode("manual");
    } else {
      this.loadStudios();
    }
  },

  showAllStudios() {
    this.category = "all";
    this.city = "all";
    localStorage.setItem("customerCategory", "all");
    localStorage.setItem("customerCity", "all");
    localStorage.setItem("userCity", "all");
    this.syncCategoryTabUI();
    this.filterStudio("all");
  },

  goHome() {
    this.category = "all";
    this.city = "all";
    localStorage.setItem("customerCategory", "all");
    localStorage.setItem("customerCity", "all");
    localStorage.setItem("userCity", "all");

    this.switchSearchMode("manual");
    this.syncCategoryTabUI();
    this.syncCityTabUI();
    this.loadStudios();
  },

  syncCategoryTabUI() {
    const tabAll = document.querySelector(".js-tab-all");
    const tabBox = document.querySelector(".js-tab-photobox");
    const tabStudio = document.querySelector(".js-tab-photostudio");

    if (tabAll) tabAll.classList.toggle("active", this.category === "all");
    if (tabBox) tabBox.classList.toggle("active", this.category === "photobox");
    if (tabStudio) tabStudio.classList.toggle("active", this.category === "photostudio");
  },

  syncCityTabUI() {
    document.querySelectorAll(".city-tab").forEach(tab => {
      const tabText = tab.innerText.trim().toLowerCase();
      if (this.city === "all" && tabText === "semua") {
        tab.classList.add("active");
      } else if (this.city !== "all" && (tabText === this.city.toLowerCase() || this.city.toLowerCase().includes(tabText))) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    const locInput = document.querySelector(".js-input-location");
    if (locInput) {
      if (this.city && this.city !== "all") {
        locInput.value = this.city.charAt(0).toUpperCase() + this.city.slice(1);
      } else {
        locInput.value = "";
      }
    }
  },

  async detectGPSLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { "User-Agent": "PhotoHunt-App/1.0" }
        });
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const fullText = (JSON.stringify(data) + " " + JSON.stringify(addr)).toLowerCase();
          
          let targetCity = null;
          if (fullText.includes("jakarta")) targetCity = "jakarta";
          else if (fullText.includes("bekasi") || fullText.includes("cikarang")) targetCity = "bekasi";
          else if (fullText.includes("tangerang")) targetCity = "tangerang";
          else if (fullText.includes("depok")) targetCity = "depok";
          else if (fullText.includes("bandung")) targetCity = "bandung";
          else if (fullText.includes("bogor")) targetCity = "bogor";

          if (targetCity) {
            localStorage.setItem("customerCity", targetCity);
            localStorage.setItem("userCity", targetCity);
            this.city = targetCity;
            this.syncCityTabUI();
            this.loadStudios();
          }
        }
      } catch (err) {
        console.warn("GPS detection warning:", err);
      }
    }, (err) => {
      console.warn("GPS position warning:", err.message);
    }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
  },

  async handleSearch() {
    if (this.searchMode === "ai") {
      const aiInput = document.getElementById("ai-prompt-input");
      const prompt = aiInput ? aiInput.value.trim() : "";
      if (!prompt) {
        alert("Tuliskan kebutuhan studio kamu terlebih dahulu.");
        return;
      }
      await this.runAISearch(prompt);
    } else {
      const locInput = document.querySelector(".js-input-location");
      const loc = locInput ? locInput.value.toLowerCase().trim() : "";

      const validCities = ["jakarta", "bekasi", "tangerang", "depok"];
      const foundCity = validCities.find(c => loc.includes(c));

      if (foundCity) {
        this.filterStudio(foundCity);
      } else if (loc === "" || loc.includes("semua")) {
        this.filterStudio("all");
      } else {
        // If user typed a natural sentence in manual mode, auto-switch to AI Search
        const aiInput = document.getElementById("ai-prompt-input");
        if (aiInput) aiInput.value = locInput.value;
        this.switchSearchMode("ai");
        await this.runAISearch(locInput.value);
      }
    }
  },

  async runAISearch(promptText) {
    const btnLabel = document.getElementById("search-btn-label");
    const origText = btnLabel ? btnLabel.textContent : "Search...";

    if (btnLabel) btnLabel.textContent = "Analyzing...";

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });
      const data = await res.json();

      if (data.success) {
        this.renderAISearchResults(data);
      } else {
        alert(data.error || "Gagal memproses pencarian AI.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan pada sistem AI Search.");
    } finally {
      if (btnLabel) btnLabel.textContent = origText;
    }
  },

  renderAISearchResults(data) {
    const container = document.querySelector(".js-studio-container");
    container.innerHTML = "";

    // Sync city tab toggle UI if location was detected in AI Intent
    if (data.intent && data.intent.location) {
      this.city = data.intent.location;
      localStorage.setItem("customerCity", data.intent.location);
      localStorage.setItem("userCity", data.intent.location);
      this.syncCityTabUI();
    }

    // 1. Ambiguity Prompt State
    if (data.isAmbiguous) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 24px; border-radius: 12px; text-align: center; margin: 10px 0;">
          <div style="font-size: 24px; margin-bottom: 8px;">🤔</div>
          <p style="font-size: 17px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;">Butuh Klarifikasi Waktu</p>
          <p style="font-size: 15px; color: #1d4ed8; margin-bottom: 16px;">${data.ambiguityMessage}</p>
          <p style="font-size: 13px; color: #3b82f6;">Silakan perjelas di kolom pencarian (contoh: "${data.prompt} malam" atau "${data.prompt} pagi").</p>
        </div>
      `;
      return;
    }

    // 2. Render Transparency Pill Header
    let transparencyHTML = "";
    if (data.summaryMessage) {
      transparencyHTML = `
        <div style="grid-column: 1 / -1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span>${data.summaryMessage}</span>
          <span style="font-size: 12px; color: #64748b; font-weight: 500; background: #e2e8f0; padding: 3px 10px; border-radius: 12px;">${data.studios ? data.studios.length : 0} Studio Sesuai</span>
        </div>
      `;
    }

    // 3. No Results Primary State
    if (!data.studios || data.studios.length === 0) {
      const msg = data.noResultsMessage || `Tidak menemukan studio yang memenuhi kebutuhanmu.`;
      
      let alternativesHTML = "";
      if (data.alternatives && data.alternatives.length > 0) {
        const altCards = data.alternatives.map(studio => {
          let imageSrc = studio.gallery_image ? `${API_BASE_URL}/images/studios/${studio.gallery_image}` : (studio.image ? `${API_BASE_URL}/images/studios/${studio.image}` : LOCAL_PLACEHOLDER);
          const reasonItems = (studio.matchReasons || []).slice(0, 3).map(r => {
            const isMatch = r.startsWith("✓");
            const isPartial = r.startsWith("~");
            const cls = isMatch ? "match" : (isPartial ? "partial" : "unmatch");
            return `<li class="ai-reason-item ${cls}">${r}</li>`;
          }).join("");

          return `
            <div class="studio-card" style="position: relative; display: flex; flex-direction: column; height: 100%; opacity: 0.85; border: 1px solid #e5e7eb;" onclick="window.location.href='detail-studio.html?id=${studio.id}'">
              <img class="studio-img" src="${imageSrc}" alt="${studio.name}" style="width: 100%; height: 190px; object-fit: cover; border-radius: 12px;" onerror="this.onerror=null; this.src='${LOCAL_PLACEHOLDER}';" />
              <div class="ai-match-badge" style="margin-top: 10px; background: #ef4444;">
                <span>⚠️</span>
                <span>Opsi Alternatif</span>
              </div>
              <div class="studio-name" style="font-weight: bold; margin-top: 8px; font-size: 16px;">${studio.name}</div>
              <div class="studio-location" style="color: #666; font-size: 13px;">${studio.location}</div>
              <div class="studio-price" style="font-weight: 700; margin-top: 4px; font-size: 15px;">${studio.price_range || ''}</div>
              <ul class="ai-reasons-list">${reasonItems}</ul>
            </div>
          `;
        }).join("");

        alternativesHTML = `
          <div style="grid-column: 1 / -1; margin-top: 25px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #6b7280; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
              ⚠️ Studio ini tidak memenuhi semua constraint, tapi mungkin bisa jadi pilihan alternatif:
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
              ${altCards}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        ${transparencyHTML}
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #fff5f5; border-radius: 12px; border: 1px dashed #fca5a5; margin: 10px 0;">
          <p style="font-size: 17px; font-weight: 700; color: #991b1b; margin-bottom: 8px;">😔 ${msg}</p>
          <p style="font-size: 14px; color: #7f1d1d; margin-bottom: 16px;">Coba sesuaikan waktu, hari, atau lokasi pada pencarian Anda.</p>
          <button onclick="scope.goHome()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Lihat Semua Studio</button>
        </div>
        ${alternativesHTML}
      `;
      return;
    }

    // 4. Render Primary Candidate Studios
    const primaryCardsHTML = data.studios.map(studio => {
      let imageSrc = studio.gallery_image ? `${API_BASE_URL}/images/studios/${studio.gallery_image}` : (studio.image ? `${API_BASE_URL}/images/studios/${studio.image}` : LOCAL_PLACEHOLDER);
      const reasonItems = (studio.matchReasons || []).slice(0, 4).map(r => {
        const isMatch = r.startsWith("✓");
        const isPartial = r.startsWith("~");
        const cls = isMatch ? "match" : (isPartial ? "partial" : "unmatch");
        return `<li class="ai-reason-item ${cls}">${r}</li>`;
      }).join("");

      return `
        <div class="studio-card" style="position: relative; display: flex; flex-direction: column; height: 100%; cursor: pointer;" onclick="scope.openStudioDetail('${studio.id}')">
          <img class="studio-img" src="${imageSrc}" alt="${studio.name}" style="width: 100%; height: 190px; object-fit: cover; border-radius: 12px;" onerror="this.onerror=null; this.src='${LOCAL_PLACEHOLDER}';" />
          <div class="ai-match-badge" style="margin-top: 10px;">
            <span>✨</span>
            <span>${studio.matchScore}% Match</span>
          </div>
          <div class="studio-name" style="font-weight: bold; margin-top: 8px; font-size: 16px;">${studio.name}</div>
          <div class="studio-location" style="color: #666; font-size: 13px;">${studio.location}</div>
          <div class="studio-price" style="font-weight: 700; margin-top: 4px; font-size: 15px;">${studio.price_range || ''}</div>
          <ul class="ai-reasons-list">${reasonItems}</ul>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      ${transparencyHTML}
      ${primaryCardsHTML}
    `;
  },

  openStudioDetail(studioId) {
    const dateInput = document.querySelector(".js-input-date");
    const paxInput = document.querySelector(".js-input-pax");

    const selectedDate = dateInput ? dateInput.value : "";
    const selectedPax = paxInput ? paxInput.value : "";

    let url = `detail-studio.html?id=${studioId}`;
    if (selectedDate) url += `&date=${encodeURIComponent(selectedDate)}`;
    if (selectedPax) url += `&capacity=${encodeURIComponent(selectedPax)}`;

    window.location.href = url;
  },

  renderStudios(studios, isAISearch = false) {
    const container = document.querySelector(".js-studio-container");
    container.innerHTML = "";

    if (!studios || !studios.length) {
      const cityText = this.city === 'all' ? '' : ` di ${this.city.toUpperCase()}`;
      const catText = this.category === 'all' ? '' : ` ${this.category.toUpperCase()}`;
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #f9fafb; border-radius: 12px; border: 1px dashed #d1d5db; margin: 20px 0;">
          <p style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 8px;">Tidak ada studio yang memenuhi kriteria</p>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">Coba ubah kata kunci pencarian atau tampilkan semua studio.</p>
          <button onclick="scope.goHome()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Lihat Semua Studio</button>
        </div>
      `;
      return;
    }

    studios.forEach(studio => {
      const card = document.createElement("div");
      card.className = "studio-card";
      card.style.position = "relative";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.height = "100%";

      let imageSrc;
      if (studio.gallery_image) {
        imageSrc = `${API_BASE_URL}/images/studios/${studio.gallery_image}`;
      } else if (studio.image) {
        imageSrc = `${API_BASE_URL}/images/studios/${studio.image}`;
      } else {
        imageSrc = LOCAL_PLACEHOLDER;
      }

      let aiBadgeHTML = "";
      let aiReasonsHTML = "";

      if (isAISearch && typeof studio.matchScore === "number") {
        aiBadgeHTML = `
          <div class="ai-match-badge" style="margin-top: 10px;">
            <span>✨</span>
            <span>${studio.matchScore}% Match</span>
          </div>
        `;

        if (studio.matchReasons && studio.matchReasons.length > 0) {
          const reasonItems = studio.matchReasons.slice(0, 3).map(r => {
            const isMatch = r.startsWith("✓");
            const isPartial = r.startsWith("~");
            const cls = isMatch ? "match" : (isPartial ? "partial" : "unmatch");
            return `<li class="ai-reason-item ${cls}">${r}</li>`;
          }).join("");
          aiReasonsHTML = `<ul class="ai-reasons-list">${reasonItems}</ul>`;
        }
      }

      card.innerHTML = `
        <img 
          class="studio-img" 
          src="${imageSrc}" 
          alt="${studio.name}"
          style="width: 100%; height: 190px; object-fit: cover; border-radius: 12px;"
          onerror="this.onerror=null; this.src='${LOCAL_PLACEHOLDER}';" 
        />
        ${aiBadgeHTML}
        <div class="studio-name" style="font-weight: bold; margin-top: 8px; font-size: 16px;">${studio.name}</div>
        <div class="studio-location" style="color: #666; font-size: 13px;">${studio.location}</div>
        <div class="studio-price" style="font-weight: 700; margin-top: 4px; font-size: 15px;">${studio.price_range || ''}</div>
        ${aiReasonsHTML}
      `;

      card.onclick = () => scope.openStudioDetail(studio.id);
      container.appendChild(card);
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // === Dynamic Header Auth Check ===
  const currentUserRaw = localStorage.getItem("currentUser");
  const guestNav = document.getElementById("guest-nav");
  const userNav = document.getElementById("user-nav");

  if (currentUserRaw) {
    if (guestNav) guestNav.style.display = "none";
    if (userNav) userNav.style.display = "flex";
  } else {
    if (guestNav) guestNav.style.display = "flex";
    if (userNav) userNav.style.display = "none";
  }

  scope.syncCategoryTabUI();
  scope.syncCityTabUI();
  scope.loadStudios();

  // Attempt dynamic GPS detection on page load (with maximumAge: 0 to catch live DevTools/GPS sensor changes)
  scope.detectGPSLocation();

  const btnSearch = document.querySelector(".js-btn-search");
  if (!btnSearch) return;

  btnSearch.onclick = () => scope.handleSearch();

  const locInput = document.querySelector(".js-input-location");
  if (locInput) {
    locInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") scope.handleSearch();
    });
  }

  const aiInput = document.getElementById("ai-prompt-input");
  if (aiInput) {
    aiInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter" && !e.shiftKey) scope.handleSearch();
    });
  }
});
