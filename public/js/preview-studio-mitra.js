document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const studioId = urlParams.get('id');

    const ui = {
        loading: document.getElementById("loadingState"),
        content: document.getElementById("contentState"),
        error: document.getElementById("errorState"),
        errorMsg: document.getElementById("errorMsg"),
        galleryScroll: document.getElementById("elGalleryScroll"),
        galleryCount: document.getElementById("galleryCount"),
        category: document.getElementById("elCategory"),
        name: document.getElementById("elName"),
        rating: document.getElementById("elRating"),
        reviews: document.getElementById("elReviews"),
        address: document.getElementById("elAddress"),
        desc: document.getElementById("elDesc"),
        schedules: document.getElementById("elScheduleList"),
        facilities: document.getElementById("elFacilities"),
        packages: document.getElementById("elPackages"),
        btnClose: document.getElementById("btnClose")
    };

    ui.btnClose.addEventListener("click", () => window.history.back());

    if (!studioId) {
        showError("ID Studio tidak ditemukan di URL.");
        return;
    }

    fetchData(studioId);

    async function fetchData(id) {
        try {
            const API_BASE_URL =
                window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                    ? window.location.origin
                    : (window.location.hostname.includes("netlify.app")
                        ? "https://photohunt-v2-production.up.railway.app"
                        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                            : window.location.origin));

            const response = await fetch(`${API_BASE_URL}/studios/${id}/detail`);
            if (!response.ok) throw new Error("Gagal mengambil data dari server");

            const json = await response.json();

            // Gabungkan data studio (termasuk gmaps_link) dengan data lainnya
            const data = {
                ...json.studio,
                schedules: json.schedules,
                facilities: json.facilities,
                packages: json.packages,
                images: json.images
            };

            renderUI(data);

        } catch (err) {
            console.error(err);
            showError("Gagal memuat data. Pastikan server menyala.");
        }
    }

    function renderUI(data) {
        ui.loading.classList.add("hidden");
        ui.content.classList.remove("hidden");

        // --- A. PROFILE INFO ---
        ui.category.textContent = data.category || "Studio Foto";
        ui.name.textContent = data.name;

        const ratingVal = data.rating ? Number(data.rating).toFixed(1) : "0.0";
        ui.rating.textContent = ratingVal;
        ui.reviews.textContent = `(${data.totalReviews || 0} Ulasan)`;

        // Tampilkan Alamat
        ui.address.textContent = data.location || data.city || "Lokasi tidak tersedia";

        // 🔥 LOGIKA KLIK MAPS (BARU) 🔥
        // Hapus event listener lama (jika ada) dengan trik cloneNode, atau cukup override onclick
        ui.address.onclick = () => {
            // 1. Cek Link Database
            if (data.gmaps_link && data.gmaps_link.trim() !== "") {
                window.open(data.gmaps_link, '_blank');
                return;
            }

            // 2. Fallback: Cari Alamat + Kota
            if (data.location || data.city) {
                const query = encodeURIComponent(`${data.location || ''}, ${data.city || ''}`);
                const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
                window.open(url, '_blank');
            } else {
                alert("Lokasi belum diatur.");
            }
        };

        ui.desc.textContent = data.description || "Tidak ada deskripsi.";

        // --- B. RENDER GALLERY ---
        ui.galleryScroll.innerHTML = "";
        let allImages = [];

        if (data.images && data.images.length > 0) {
            allImages = data.images.map(img => img.image);
        }
        // Masukkan foto utama juga jika belum ada di list images (opsional, tergantung struktur DB)
        if (allImages.length === 0 && data.image) {
            allImages.push(data.image);
        }

        if (allImages.length === 0) {
            ui.galleryScroll.innerHTML = `<img class="gallery-img" src="https://placehold.co/480x350?text=No+Image" alt="No Image">`;
            ui.galleryCount.classList.add("hidden");
        } else {
            allImages.forEach(imgName => {
                const imgEl = document.createElement("img");
                imgEl.className = "gallery-img";
                // Pastikan path image sesuai folder backend
                imgEl.src = imgName.startsWith("http") ? imgName : `${API_BASE_URL}/images/studios/${imgName}`;
                imgEl.onerror = function () {
                    this.onerror = null;
                    this.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='350' viewBox='0 0 480 350'%3E%3Crect width='480' height='350' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%239ca3af'%3EImage Error%3C/text%3E%3C/svg%3E";
                };
                ui.galleryScroll.appendChild(imgEl);
            });

            ui.galleryCount.textContent = `1/${allImages.length}`;
            ui.galleryCount.classList.remove("hidden");

            // Event scroll buat update angka indikator (1/3, 2/3, dst)
            ui.galleryScroll.addEventListener("scroll", () => {
                const scrollLeft = ui.galleryScroll.scrollLeft;
                const width = ui.galleryScroll.offsetWidth;
                const index = Math.round(scrollLeft / width) + 1;
                ui.galleryCount.textContent = `${index}/${allImages.length}`;
            });
        }

        // --- C. RENDER LAINNYA ---
        renderSchedules(data.schedules);
        renderFacilities(data.facilities);
        renderPackages(data.packages);
    }

    function renderSchedules(schedules) {
        ui.schedules.innerHTML = "";
        if (schedules && schedules.length > 0) {
            const dayOrder = { 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6, 'minggu': 7 };
            schedules.sort((a, b) => (dayOrder[a.day.toLowerCase()] || 99) - (dayOrder[b.day.toLowerCase()] || 99));

            schedules.forEach(sch => {
                const row = document.createElement("tr");
                const rawOpen = sch.open_time;
                const rawClose = sch.close_time;
                let timeHtml = "";

                // Cek logika tutup/libur
                const isLibur = !rawOpen || !rawClose ||
                    rawOpen === '00:00:00' || rawClose === '00:00:00' ||
                    rawOpen === '00:00' || rawClose === '00:00' ||
                    rawOpen === 'Libur' || rawClose === 'Libur' ||
                    sch.is_closed === true || sch.is_closed === "true" ||
                    sch.isClosed === true || sch.isClosed === "true";

                if (isLibur) {
                    timeHtml = `<span class="closed-badge">LIBUR</span>`;
                } else {
                    timeHtml = `${rawOpen.substring(0, 5)} - ${rawClose.substring(0, 5)}`;
                }

                row.innerHTML = `<td style="text-transform: capitalize;">${sch.day}</td><td>${timeHtml}</td>`;
                ui.schedules.appendChild(row);
            });
        } else {
            ui.schedules.innerHTML = "<tr><td colspan='2' style='text-align:center;'>Jadwal belum diatur</td></tr>";
        }
    }

    function renderFacilities(facilities) {
        ui.facilities.innerHTML = "";
        if (facilities && facilities.length > 0) {
            facilities.forEach(f => {
                const text = (typeof f === 'object') ? f.facility : f;
                const chip = document.createElement("span");
                chip.className = "chip";
                chip.textContent = text;
                ui.facilities.appendChild(chip);
            });
        } else {
            ui.facilities.innerHTML = "<span style='font-size:12px; color:#888;'>Tidak ada fasilitas.</span>";
        }
    }

    function renderPackages(packages) {
        ui.packages.innerHTML = "";
        if (packages && packages.length > 0) {
            packages.forEach(pkg => {
                const card = document.createElement("div");
                card.className = "package-card";
                const price = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pkg.price);
                card.innerHTML = `
                        <div class="pkg-header">
                            <div class="pkg-name">${pkg.name}</div>
                            <div class="pkg-price">${price}</div>
                        </div>
                        <div class="pkg-desc">${pkg.description || "Tidak ada detail paket."}</div>
                    `;
                ui.packages.appendChild(card);
            });
        } else {
            ui.packages.innerHTML = "<div style='text-align:center; padding:20px; color:#888; border:1px dashed #ccc; border-radius:10px;'>Belum ada paket tersedia.</div>";
        }
    }

    function showError(msg) {
        ui.loading.classList.add("hidden");
        ui.content.classList.add("hidden");
        ui.error.classList.remove("hidden");
        ui.errorMsg.textContent = msg;
    }
});