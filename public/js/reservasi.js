const appState = {
    studioId: new URLSearchParams(window.location.search).get('studioId'),
    currentStudio: null,
    selectedPackage: null,
    selectedDate: new URLSearchParams(window.location.search).get('date'),
    selectedTime: null,
    jumlahOrang: parseInt(new URLSearchParams(window.location.search).get('capacity')) || 1
};

const preselectPackageId = new URLSearchParams(window.location.search).get('packageId');

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

async function loadStudioData() {
    if (!appState.studioId) {
        alert("ID Studio tidak ditemukan");
        window.location.href = 'customer-app.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/studios/${appState.studioId}/detail`);
        if (!res.ok) throw new Error("Gagal memuat data studio");

        const data = await res.json();
        appState.currentStudio = data;

        renderStudioInfo();
        renderPackages();
        renderDates();
        renderTimeSlots();

        // Auto select orang jika dari URL
        document.getElementById('jumlah-orang-text').innerText = appState.jumlahOrang;

    } catch (err) {
        console.error(err);
        alert("Gagal memuat data studio");
    }
}

function renderStudioInfo() {
    document.getElementById('studio-name').innerText = appState.currentStudio.studio.name;
    document.getElementById('studio-location').innerText = appState.currentStudio.studio.location;
}

function renderPackages() {
    const container = document.getElementById('paket-container');
    container.innerHTML = '';

    let isAnyEvaluated = false;

    appState.currentStudio.packages.forEach((pkg, index) => {
        // Cek logika seleksi (URL parameter atau fallback ke paket pertama jika tidak ada)
        const isUrlMatch = preselectPackageId == (index + 1) || pkg.name === new URLSearchParams(window.location.search).get('packageName');

        // Auto select logic: Jika URL match, ATAU belum ada yang dipilih dan ini adalah paket pertama (opsional, biar tidak null)
        // Namun, user mungkin ingin "pilih sendiri". Tapi biar tidak default 60 menit, lebih baik auto select yang pertama jika tidak ada URL.
        const shouldSelect = isUrlMatch;

        // Tampilkan Durasi di Card agar transparan
        const durationInfo = pkg.session_duration ? `${pkg.session_duration} Menit` : '60 Menit (Default)';
        const breakInfo = pkg.break_duration ? `(+${pkg.break_duration} Menit Break)` : '';

        const cardHTML = `
            <div class="card-choice ${shouldSelect ? 'selected' : ''}" 
                 onclick="selectPackage(this, ${index})">
                <div class="containts">
                    <h5>${pkg.name}</h5>
                    <p class="desc">${pkg.description || 'Pilihan paket terbaik untuk Anda'}</p>
                    <div class="details">
                        <span>Durasi: ${durationInfo}</span>
                    </div>
                </div>
                <div class="price">
                    <h5>${formatRupiah(pkg.price)}</h5>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;

        // Jika terpilih (karena URL), update state
        if (shouldSelect) {
            appState.selectedPackage = pkg;
            appState.sessionDuration = parseInt(pkg.session_duration) || 60;
            appState.breakDuration = parseInt(pkg.break_duration) || 0;
            isAnyEvaluated = true;
        }
    });

    // Fallback: Jika tidak ada paket yang dipilih dari URL, jangan auto-select visual (biarkan user milih),
    // TAPI: set default duration untuk renderTimeSlots agar tidak 60 menit buta?
    // Atau: Auto-select paket pertama agar UX langsung jalan?
    // Keputusan: Auto-select paket pertama jika list ada, supaya slot langsung valid.
    if (!appState.selectedPackage && appState.currentStudio.packages.length > 0) {
        const firstPkg = appState.currentStudio.packages[0];
        appState.selectedPackage = firstPkg;
        appState.sessionDuration = parseInt(firstPkg.session_duration) || 60;
        appState.breakDuration = parseInt(firstPkg.break_duration) || 0;

        // Update visual card pertama jadi selected
        const firstCard = container.querySelector('.card-choice');
        if (firstCard) firstCard.classList.add('selected');
    }

    cekStatusPembayaran();
}

function renderDates() {
    const selectDate = document.getElementById('tanggal-select');
    const today = new Date();

    selectDate.innerHTML = ''; // Reset options

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // FIX: Gunakan Local Time untuk value YYYY-MM-DD agar sinkron dengan Label
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const value = `${year}-${month}-${day}`;

        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const label = date.toLocaleDateString('id-ID', options);

        const optionElem = document.createElement('option');
        optionElem.value = value;
        optionElem.innerText = label;

        // Auto-select if matches state or default to today (first item)
        if (appState.selectedDate === value) {
            optionElem.selected = true;
        } else if (i === 0 && !appState.selectedDate) {
            // Default select hari ini jika belum ada pilihan
            appState.selectedDate = value;
            optionElem.selected = true;
        }

        selectDate.appendChild(optionElem);
    }

    selectDate.addEventListener('change', function () {
        appState.selectedDate = this.value;
        renderTimeSlots();
        cekStatusPembayaran();
    });
}

function renderTimeSlots() {
    const container = document.getElementById('waktu-container');
    container.innerHTML = '';

    if (!appState.selectedDate) return;

    // 1. Tentukan Day of Week berdasarkan Local Date
    const daysMap = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const daysMapEng = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Parse YYYY-MM-DD secara manual agar akurat sebagai local date
    const [y, m, d] = appState.selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d); // Month index 0-11

    const dayIndex = dateObj.getDay();
    const dayNameIndo = daysMap[dayIndex];
    const dayNameEng = daysMapEng[dayIndex];

    // 2. Cari jadwal untuk hari tersebut
    const schedules = appState.currentStudio.schedules || [];
    const todaySched = schedules.find(s =>
        s.day.toLowerCase() === dayNameIndo ||
        s.day.toLowerCase() === dayNameEng
    );

    console.log(`[RENDER SLOTS] Date: ${appState.selectedDate} (${dayNameIndo})`);
    if (todaySched) {
        console.log("--> [DEBUG] Schedule Object Found:", JSON.stringify(todaySched));
    } else {
        console.warn("--> [DEBUG] No schedule found for this day.");
    }

    // DEBUG VISUAL: Jam Operasional
    let infoJam = document.getElementById('info-jam-operasional');
    if (!infoJam) {
        infoJam = document.createElement('div');
        infoJam.id = 'info-jam-operasional';
        infoJam.style.marginBottom = '10px';
        infoJam.style.fontSize = '14px';
        container.parentElement.insertBefore(infoJam, container);
    }

    if (!todaySched || todaySched.is_closed) {
        container.innerHTML = '<div class="jadwal-empty">Studio Tutup pada hari ini</div>';
        infoJam.innerText = `Jam Operasional: Tutup`;
        infoJam.style.color = 'red';
        return;
    }

    infoJam.innerText = `Jam Operasional: ${todaySched.open_time.slice(0, 5)} - ${todaySched.close_time.slice(0, 5)}`;
    infoJam.style.color = '#666';

    // Parse Open & Close Time from Schedule
    const [openHour, openMinute] = todaySched.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = todaySched.close_time.split(':').map(Number);

    // Set Start Time based on Selected Date
    let currentTime = new Date(y, m - 1, d, openHour, openMinute, 0);

    // Set Closing Time based on Selected Date
    let closingTime = new Date(y, m - 1, d, closeHour, closeMinute, 0);

    // Adjust closing time if cross midnight (e.g. 10:00 - 02:00)
    if (closingTime <= currentTime) {
        closingTime.setDate(closingTime.getDate() + 1);
    }

    // Durasi dari State
    const sessionDur = parseInt(appState.sessionDuration) || 60;
    const breakDur = parseInt(appState.breakDuration) || 0;

    console.log(`[SLOT] Start: ${currentTime.toLocaleTimeString()} End Limit: ${closingTime.toLocaleTimeString()} | Session: ${sessionDur}, Break: ${breakDur}`);

    let hasSlots = false;

    // LOOP: Current -> Start + Session. Check Limit. Next = Start + Session + Break.
    while (true) {
        // End Time sesi ini
        const endTime = new Date(currentTime.getTime() + sessionDur * 60000);

        // STRICT Check: Jika sesi berakhir MELEBIHI Closing Time, STOP.
        // Artinya sesi harus selesai SEBELUM atau TEPAT saat tutup.
        if (endTime > closingTime) {
            break;
        }

        const startStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        const endStr = endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        const label = startStr;
        const timeVal = startStr;

        const isSelected = appState.selectedTime === timeVal ? 'selected' : '';
        const timeHTML = `<div class="jadwal-item ${isSelected}" onclick="selectTime(this, '${timeVal}')">${label}</div>`;

        container.innerHTML += timeHTML;
        hasSlots = true;

        // Next Slot Start = End Time + Break
        currentTime = new Date(endTime.getTime() + breakDur * 60000);
    }

    if (!hasSlots) {
        container.innerHTML = '<div class="jadwal-empty">Tidak ada slot tersedia (Periksa durasi paket vs jam operasional).</div>';
    }
}

function selectPackage(element, index) {
    // 1. Reset visual
    document.querySelectorAll('.card-choice').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // 2. Update state
    appState.selectedPackage = appState.currentStudio.packages[index];

    // 3. Update durasi
    appState.sessionDuration = parseInt(appState.selectedPackage.session_duration) || 60;
    appState.breakDuration = parseInt(appState.selectedPackage.break_duration) || 0;

    console.log(`Paket ID ${index} Selected. Pitch Session: ${appState.sessionDuration}, Break: ${appState.breakDuration}`);

    // 4. Render ulang slot
    renderTimeSlots();
    cekStatusPembayaran();
}

function selectTime(element, timeVal) {
    document.querySelectorAll('.jadwal-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    appState.selectedTime = timeVal;
    cekStatusPembayaran();
}

function updateOrang(change) {
    appState.jumlahOrang += change;
    if (appState.jumlahOrang < 1) appState.jumlahOrang = 1;
    document.getElementById('jumlah-orang-text').innerText = appState.jumlahOrang;
}

function cekStatusPembayaran() {
    const btn = document.querySelector('.pay-btn');
    if (appState.selectedPackage && appState.selectedDate && appState.selectedTime) {
        btn.classList.add('active');
        btn.disabled = false;
    } else {
        btn.classList.remove('active');
        btn.disabled = true;
    }
}

async function lanjutkanPembayaran() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert("Silakan login terlebih dahulu");
        window.location.href = 'login.html';
        return;
    }

    const bookingData = {
        studio_id: appState.studioId,
        customer_id: user.id,
        mitra_id: appState.currentStudio.studio.mitra_id,
        booking_date: appState.selectedDate,
        booking_time: appState.selectedTime,
        total_price: appState.selectedPackage.price,
        package_name: appState.selectedPackage.name,
        pax: appState.jumlahOrang
    };

    try {
        const res = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        if (res.ok) {
            const result = await res.json();
            alert("Reservasi Berhasil Diajukan! Selesaikan pembayaran Anda.");
            window.location.href = `pembayaran.html?bookingId=${result.booking_id}`;
        } else {
            alert("Gagal melakukan reservasi");
        }
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan sistem");
    }
}

function openChatFromReservation() {
    if (!appState.currentStudio || !appState.currentStudio.studio) {
        console.error("Data studio belum dimuat");
        return;
    }

    const studioData = appState.currentStudio.studio;
    const images = appState.currentStudio.images;

    const partnerId = studioData.mitra_id || studioData.id;
    const partnerName = encodeURIComponent(studioData.name);

    // Gunakan logo dari studio data (image file name)
    const logo = studioData.logo || (images && images.length > 0 ? images[0].image : '');
    const partnerLogo = encodeURIComponent(logo);

    console.log(`Membuka chat dengan ID: ${partnerId}`);

    window.location.href = `chat.html?partner_id=${partnerId}&partner_name=${partnerName}&partner_logo=${partnerLogo}`;
}

window.onload = loadStudioData;