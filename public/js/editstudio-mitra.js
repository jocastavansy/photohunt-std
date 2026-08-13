const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const studioId = urlParams.get('id') || localStorage.getItem("currentStudioId");

    // UI Elements
    const ui = {
        loading: document.getElementById("loadingIndicator"),
        form: document.getElementById("formContent"),
        title: document.getElementById("studioTitle"),
        name: document.getElementById("studioName"),
        desc: document.getElementById("studioDescription"),
        price: document.getElementById("studioPrice"),
        gmapsLink: document.getElementById("studioGmapsLink"), // Pastikan ID ini ada di HTML

        // Logo UI
        logoPreview: document.getElementById("editLogoPreview"),
        logoInput: document.getElementById("editLogoInput"),
        btnChangeLogo: document.getElementById("btnChangeLogo"),

        // Schedule UI
        scheduleList: document.getElementById("scheduleList"),

        // Gallery UI
        galleryContainer: document.getElementById("galleryContainer"),
        photoCounter: document.getElementById("photoCounter"),
        uploadBox: document.getElementById("uploadBox"),
        uploadLimitMsg: document.getElementById("uploadLimitMsg"),
        newPhotoInput: document.getElementById("newPhotoInput"),
        btnSelectPhoto: document.getElementById("btnSelectPhoto"),

        // Facility UI
        facilityList: document.getElementById("facilityList"),
        newFacilityInput: document.getElementById("newFacilityInput"),
        addFacilityBtn: document.getElementById("addFacilityBtn"),

        // Package UI
        packageList: document.getElementById("packageList"),
        addPackageBtn: document.getElementById("addPackageBtn"),

        // Buttons
        saveBtn: document.getElementById("saveEdit"),
        cancelBtn: document.getElementById("cancelEdit"),
        closeBtn: document.getElementById("closeEditModal")
    };

    let currentImages = [];
    const daysOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

    if (!studioId) {
        alert("ID Studio tidak ditemukan.");
        window.location.href = "kelola-studio.html";
        return;
    }

    // --- A. LOAD DATA (SUDAH DIPERBAIKI) ---
    async function loadStudioData() {
        try {
            ui.loading.style.display = "flex";
            ui.form.style.display = "none";

            const response = await fetch(`${API_BASE_URL}/studios/${studioId}/detail`);

            if (response.status === 404) {
                alert("Studio tidak ditemukan atau mungkin sudah dihapus.");
                window.location.href = "kelola-studio.html";
                return;
            }

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const json = await response.json();
            const data = json.studio;

            // 1. Isi Info Dasar
            ui.title.textContent = `Edit Studio: ${data.name}`;
            ui.name.value = data.name || "";
            ui.desc.value = data.description || "";
            ui.price.value = data.price_range || "";
            if (ui.gmapsLink) ui.gmapsLink.value = data.gmaps_link || "";

            // Isi Detail Pembayaran
            if (document.getElementById("paymentBankName")) document.getElementById("paymentBankName").value = data.payment_bank_name || "";
            if (document.getElementById("paymentAccNumber")) document.getElementById("paymentAccNumber").value = data.payment_account_number || "";
            if (document.getElementById("paymentAccHolder")) document.getElementById("paymentAccHolder").value = data.payment_account_holder || "";

            // Logo Preview
            if (data.logo) {
                ui.logoPreview.src = `/images/studios/${data.logo}?t=${new Date().getTime()}`;
            } else {
                ui.logoPreview.src = "https://placehold.co/100x100?text=No+Logo";
            }

            // QRIS Preview
            const qrisPreview = document.getElementById("qrisPreview");
            const qrisPlaceholder = document.getElementById("qrisPlaceholder");
            if (data.qris_image) {
                qrisPreview.src = `/images/studios/${data.qris_image}?t=${new Date().getTime()}`;
                qrisPreview.style.display = "block";
                qrisPlaceholder.style.display = "none";
            } else {
                qrisPreview.style.display = "none";
                qrisPlaceholder.style.display = "block";
            }

            // 2. Isi Jadwal
            renderScheduleTable(json.schedules || []);

            // 3. Isi Fasilitas
            ui.facilityList.innerHTML = "";
            (json.facilities || []).forEach(f => {
                const text = (typeof f === 'object') ? f.facility : f;
                addFacilityRow(text);
            });

            // 4. Isi Packages (NEW & FIXED)
            ui.packageList.innerHTML = "";
            (json.packages || []).forEach(p => {
                addPackageRow(p);
            });

            // 5. Isi Gallery
            currentImages = json.images || [];
            renderGallery();

            // TAMPILKAN FORM (Sukses)
            ui.loading.style.display = "none";
            ui.form.style.display = "block";

        } catch (error) {
            // --- ERROR HANDLING YANG BENAR ---
            console.error(error);
            ui.loading.style.display = "none";
            alert("Gagal memuat data: " + error.message);
        }
    }

    // --- B. LOGIC GANTI LOGO & QRIS ---
    if (ui.btnChangeLogo && ui.logoInput) {
        ui.btnChangeLogo.onclick = () => ui.logoInput.click();

        ui.logoInput.onchange = async () => {
            const file = ui.logoInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("logo", file);

            try {
                const oldSrc = ui.logoPreview.src;
                ui.logoPreview.style.opacity = "0.5";

                const res = await fetch(`${API_BASE_URL}/studios/${studioId}/logo`, {
                    method: "POST",
                    body: formData
                });
                const json = await res.json();

                if (json.success) {
                    ui.logoPreview.src = `/images/studios/${json.logo}?t=${new Date().getTime()}`;
                    alert("Logo berhasil diperbarui!");
                } else {
                    alert(json.message);
                    ui.logoPreview.src = oldSrc;
                }
            } catch (e) {
                alert("Gagal upload logo: " + e.message);
            } finally {
                ui.logoPreview.style.opacity = "1";
                ui.logoInput.value = "";
            }
        };
    }

    // QRIS UPLOAD LOGIC (FIXED)
    const btnChangeQris = document.getElementById("btnChangeQris");
    const editQrisInput = document.getElementById("editQrisInput");
    const qrisPreview = document.getElementById("qrisPreview");

    if (btnChangeQris && editQrisInput) {
        btnChangeQris.onclick = (e) => {
            e.preventDefault();
            console.log("Tombol Ganti QRIS diklik");
            editQrisInput.click();
        };

        editQrisInput.onchange = async () => {
            const file = editQrisInput.files[0];
            if (!file) {
                console.log("Batal pilih file");
                return;
            }

            console.log("File QRIS dipilih:", file.name);

            const formData = new FormData();
            formData.append("qris_image", file);

            try {
                btnChangeQris.textContent = "Uploading...";
                btnChangeQris.disabled = true;

                const res = await fetch(`${API_BASE_URL}/studios/${studioId}/qris`, {
                    method: "POST",
                    body: formData
                });
                const json = await res.json();

                if (json.success) {
                    qrisPreview.src = `/images/studios/${json.qris_image}?t=${new Date().getTime()}`;
                    qrisPreview.style.display = "block";
                    const ph = document.getElementById("qrisPlaceholder");
                    if (ph) ph.style.display = "none";

                    alert("QRIS berhasil diperbarui!");
                } else {
                    alert(json.message);
                }
            } catch (e) {
                console.error("Error upload:", e);
                alert("Gagal upload QRIS: " + e.message);
            } finally {
                btnChangeQris.textContent = "Ganti QRIS";
                btnChangeQris.disabled = false;
                editQrisInput.value = "";
            }
        }
    } else {
        console.warn("Elemen QRIS tidak ditemukan (btnChangeQris atau editQrisInput missing)");
    }

    // --- C. LOGIC JADWAL ---
    function renderScheduleTable(existingSchedules) {
        ui.scheduleList.innerHTML = "";

        const scheduleMap = {};
        existingSchedules.forEach(s => {
            scheduleMap[s.day.toLowerCase()] = s;
        });

        daysOrder.forEach(day => {
            const data = scheduleMap[day] || {};
            const isClosed = !data.open_time || !data.close_time || (data.is_closed === true || data.is_closed === "true");

            const tr = document.createElement("tr");
            tr.className = `schedule-row ${isClosed ? 'closed' : ''}`;
            tr.dataset.day = day;

            tr.innerHTML = `
                <td><span class="day-label">${day}</span></td>
                <td><input type="time" class="inp-open" value="${data.open_time || '09:00'}" ${isClosed ? 'disabled' : ''}></td>
                <td><input type="time" class="inp-close" value="${data.close_time || '21:00'}" ${isClosed ? 'disabled' : ''}></td>
                <td style="text-align: center;">
                    <input type="checkbox" class="inp-closed" ${isClosed ? 'checked' : ''}>
                </td>
            `;

            const checkbox = tr.querySelector(".inp-closed");
            const inpOpen = tr.querySelector(".inp-open");
            const inpClose = tr.querySelector(".inp-close");

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    tr.classList.add("closed");
                    inpOpen.disabled = true;
                    inpClose.disabled = true;
                } else {
                    tr.classList.remove("closed");
                    inpOpen.disabled = false;
                    inpClose.disabled = false;
                }
            });

            ui.scheduleList.appendChild(tr);
        });
    }

    // --- D. LOGIC GALLERY ---
    function renderGallery() {
        ui.galleryContainer.innerHTML = "";
        const count = currentImages.length;
        ui.photoCounter.textContent = count;

        if (count >= 10) {
            ui.uploadBox.style.display = "none";
            ui.uploadLimitMsg.style.display = "block";
        } else {
            ui.uploadBox.style.display = "block";
            ui.uploadLimitMsg.style.display = "none";
        }

        currentImages.forEach(img => {
            const div = document.createElement("div");
            div.className = "gallery-item";
            div.innerHTML = `
                <img src="/images/studios/${img.image}" alt="Foto">
                <button type="button" class="btn-delete-img" title="Hapus">✕</button>
            `;
            div.querySelector(".btn-delete-img").onclick = () => deleteImage(img.id);
            ui.galleryContainer.appendChild(div);
        });
    }

    async function deleteImage(id) {
        if (!confirm("Hapus foto ini?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/studios/images/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                currentImages = currentImages.filter(img => img.id !== id);
                renderGallery();
            } else {
                alert("Gagal hapus foto.");
            }
        } catch (e) {
            alert(e.message);
        }
    }

    if (ui.btnSelectPhoto && ui.newPhotoInput) {
        ui.btnSelectPhoto.onclick = () => ui.newPhotoInput.click();

        ui.newPhotoInput.onchange = async () => {
            const files = ui.newPhotoInput.files;
            if (files.length === 0) return;

            if (currentImages.length + files.length > 10) {
                alert("Maksimal total 10 foto.");
                return;
            }

            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("new_images", files[i]);
            }

            try {
                ui.btnSelectPhoto.innerText = "Uploading...";
                ui.btnSelectPhoto.disabled = true;

                const res = await fetch(`${API_BASE_URL}/studios/${studioId}/images`, {
                    method: 'POST',
                    body: formData
                });
                const json = await res.json();

                if (json.success) {
                    loadStudioData();
                } else {
                    alert(json.message);
                }
            } catch (e) {
                alert(e.message);
            } finally {
                ui.btnSelectPhoto.innerText = "+ Tambah Foto";
                ui.btnSelectPhoto.disabled = false;
                ui.newPhotoInput.value = "";
            }
        };
    }

    // --- E. LOGIC FASILITAS ---
    function addFacilityRow(value = "") {
        const div = document.createElement("div");
        div.className = "mitra-facility-item";
        div.innerHTML = `
            <input type="text" value="${value}" placeholder="Nama fasilitas">
            <button type="button" class="btn-trash" title="Hapus">✕</button>
        `;
        div.querySelector(".btn-trash").onclick = () => div.remove();
        ui.facilityList.appendChild(div);
    }

    ui.addFacilityBtn.onclick = () => {
        if (ui.newFacilityInput.value.trim()) {
            addFacilityRow(ui.newFacilityInput.value.trim());
            ui.newFacilityInput.value = "";
            ui.newFacilityInput.focus();
        } else {
            alert("Silakan ketik nama fasilitas terlebih dahulu.");
            ui.newFacilityInput.focus();
        }
    };

    ui.newFacilityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            ui.addFacilityBtn.click();
        }
    });

    // --- F. LOGIC PACKAGES (DETAILED) ---
    function addPackageRow(pkg = {}) {
        const div = document.createElement("div");
        div.className = "dm-package-card";
        // Inline style untuk memastikan tampilan rapi (card look)
        div.style.border = "1px solid #e5e7eb";
        div.style.padding = "25px"; // PADDING LEBIH BESAR
        div.style.marginBottom = "20px";
        div.style.borderRadius = "12px";
        div.style.background = "#fff";
        div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        div.style.width = "100%"; // FULL WIDTH
        div.style.boxSizing = "border-box"; // IMPORTANT

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h4 style="margin:0; font-size:16px; font-weight:600; color:#333;">Data Paket</h4>
                <button type="button" class="btn-trash" style="background:transparent; border:none; color:#ef4444; font-weight:bold; cursor:pointer;">Hapus ✕</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display:block; font-size:13px; font-weight:500; color:#555; margin-bottom:5px;">Nama Paket</label>
                    <input type="text" class="pkg-name" value="${pkg.name || ''}" placeholder="Contoh: Self Photo 15 Menit" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <div>
                    <label style="display:block; font-size:13px; font-weight:500; color:#555; margin-bottom:5px;">Harga (Rp)</label>
                    <input type="number" class="pkg-price" value="${pkg.price || ''}" placeholder="0" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display:block; font-size:13px; font-weight:500; color:#555; margin-bottom:5px;">Deskripsi Paket</label>
                <textarea class="pkg-desc" placeholder="Jelaskan detail paket ini..." rows="2"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; resize: vertical;">${pkg.description || ''}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="display:block; font-size:13px; font-weight:500; color:#555; margin-bottom:5px;">Durasi Sesi (Menit)</label>
                    <input type="number" class="pkg-duration" value="${pkg.session_duration || 60}" placeholder="60" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                </div>
                <div>
                    <label style="display:block; font-size:13px; font-weight:500; color:#555; margin-bottom:5px;">Durasi Break (Menit)</label>
                    <input type="number" class="pkg-break" value="${pkg.break_duration || 0}" placeholder="0" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                </div>
            </div>
        `;

        div.querySelector(".btn-trash").onclick = () => {
            if (confirm("Hapus paket ini?")) div.remove();
        };

        if (ui.packageList) {
            ui.packageList.appendChild(div);
        }
    }

    if (ui.addPackageBtn) {
        ui.addPackageBtn.onclick = () => addPackageRow();
    }

    // --- G. SAVE LOGIC (PUT) ---
    ui.saveBtn.onclick = async () => {
        if (!confirm("Simpan semua perubahan?")) return;

        // 1. DEFINISI PAYLOAD
        const payload = {
            name: ui.name.value,
            description: ui.desc.value,
            price_range: ui.price.value,
            gmaps_link: ui.gmapsLink ? ui.gmapsLink.value : "",

            // PAYMENTS
            payment_bank_name: document.getElementById("paymentBankName") ? document.getElementById("paymentBankName").value : "",
            payment_account_number: document.getElementById("paymentAccNumber") ? document.getElementById("paymentAccNumber").value : "",
            payment_account_holder: document.getElementById("paymentAccHolder") ? document.getElementById("paymentAccHolder").value : "",

            schedules: [],
            facilities: [],
            packages: [] // Array untuk paket
        };

        // 2. AMBIL FASILITAS
        ui.facilityList.querySelectorAll("input").forEach(inp => {
            if (inp.value.trim()) {
                payload.facilities.push(inp.value.trim());
            }
        });
        if (ui.newFacilityInput && ui.newFacilityInput.value.trim()) {
            payload.facilities.push(ui.newFacilityInput.value.trim());
        }

        // 3. AMBIL JADWAL
        const rows = ui.scheduleList.querySelectorAll(".schedule-row");
        rows.forEach(row => {
            const day = row.dataset.day;
            const isClosed = row.querySelector(".inp-closed").checked;
            const open = row.querySelector(".inp-open").value;
            const close = row.querySelector(".inp-close").value;

            payload.schedules.push({
                day: day,
                is_closed: isClosed,
                open: open,
                close: close
            });
        });

        // 4. AMBIL PACKAGES (DETAILED) & HITUNG DYNAMIC PRICE RANGE
        if (ui.packageList) {
            const validPrices = [];
            ui.packageList.querySelectorAll(".dm-package-card").forEach(row => {
                const name = row.querySelector(".pkg-name").value.trim();
                const price = row.querySelector(".pkg-price").value;
                const desc = row.querySelector(".pkg-desc").value;
                const duration = row.querySelector(".pkg-duration").value;
                const breakDur = row.querySelector(".pkg-break").value;

                if (name && price) {
                    const numPrice = Number(price);
                    if (!isNaN(numPrice) && numPrice > 0) {
                        validPrices.push(numPrice);
                    }

                    payload.packages.push({
                        name: name,
                        price: price,
                        description: desc,
                        session_duration: duration || 60,
                        break_duration: breakDur || 0
                    });
                }
            });

            if (validPrices.length > 0) {
                const minP = Math.min(...validPrices);
                const maxP = Math.max(...validPrices);
                const fmtRp = num => "Rp " + num.toLocaleString("id-ID");

                if (minP === maxP) {
                    payload.price_range = fmtRp(minP);
                } else {
                    payload.price_range = `${fmtRp(minP)} - ${fmtRp(maxP)}`;
                }
                ui.price.value = payload.price_range;
            }
        }

        console.log("Mengirim Data:", payload);

        try {
            ui.saveBtn.textContent = "Menyimpan...";
            ui.saveBtn.disabled = true;

            const res = await fetch(`${API_BASE_URL}/studios/${studioId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                alert("Data berhasil disimpan!");
                window.location.href = "kelola-studio.html";
            } else {
                throw new Error(json.message);
            }
        } catch (e) {
            alert("Gagal simpan: " + e.message);
            ui.saveBtn.textContent = "Simpan Perubahan";
            ui.saveBtn.disabled = false;
        }
    };

    // --- NAVIGATION ---
    const goBack = () => window.location.href = "kelola-studio.html";
    if (ui.cancelBtn) ui.cancelBtn.onclick = goBack;
    if (ui.closeBtn) ui.closeBtn.onclick = goBack;

    // JALANKAN SAAT LOAD
    loadStudioData();
});