const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

class Utils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace('.', ':');
    }

    static getIconSvg(iconName) {
        return '';
    }

    static showError(message) {
        const existingError = document.querySelector('.ds-error-message');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'ds-error-message';
        errorDiv.textContent = message;

        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.insertBefore(errorDiv, mainContent.firstChild);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => errorDiv.remove(), 5000);
        } else {
            alert(message);
        }
    }

    static showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'ds-success-message';
        successDiv.textContent = message;

        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.insertBefore(successDiv, mainContent.firstChild);
            setTimeout(() => successDiv.remove(), 5000);
        }
    }

    static getPeopleDisplay(value) {
        const options = {
            '1': '1 Orang',
            '2': '2 Orang',
            '3': '3 Orang',
            '4': '4 Orang',
            '5': '5 Orang',
            '6': '6 - 10 Orang',
            '10+': 'Lebih dari 10'
        };
        return options[value] || 'Jumlah orang';
    }
}

class GalleryManager {
    constructor(app) {
        this.app = app;
        this.currentPhotoIndex = 0;
        this.setupGalleryEvents();
    }

    setupGalleryEvents() {
        const prevBtn = document.getElementById('prevPhoto');
        const nextBtn = document.getElementById('nextPhoto');

        if (prevBtn) prevBtn.addEventListener('click', () => this.prevPhoto());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPhoto());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPhoto();
            if (e.key === 'ArrowRight') this.nextPhoto();
        });
    }

    renderGallery() {
        if (!this.app.currentStudio || !this.app.currentStudio.gallery) return;

        const gallery = this.app.currentStudio.gallery;
        const mainPhoto = document.getElementById('mainPhoto');
        const thumbnailGrid = document.getElementById('thumbnailGrid');

        if (!gallery || gallery.length === 0) {
            if (mainPhoto) mainPhoto.src = 'https://via.placeholder.com/800x600/333333/ffffff?text=No+Image';
            if (thumbnailGrid) thumbnailGrid.innerHTML = '';
            return;
        }

        if (mainPhoto) mainPhoto.src = gallery[this.currentPhotoIndex];
        this.updatePhotoCounter();

        if (thumbnailGrid) {
            thumbnailGrid.innerHTML = '';
            gallery.forEach((photo, index) => {
                const thumbnail = this.createThumbnail(photo, index);
                thumbnailGrid.appendChild(thumbnail);
            });
        }
    }

    createThumbnail(photo, index) {
        const thumbnail = document.createElement('div');
        thumbnail.className = `ds-thumbnail ${index === this.currentPhotoIndex ? 'active' : ''}`;
        thumbnail.dataset.index = index;

        const img = document.createElement('img');
        img.src = photo;
        img.alt = `Foto studio ${index + 1}`;
        img.loading = 'lazy';

        thumbnail.appendChild(img);
        thumbnail.addEventListener('click', () => this.changePhoto(index));

        return thumbnail;
    }

    changePhoto(index) {
        this.currentPhotoIndex = index;
        const mainPhoto = document.getElementById('mainPhoto');
        const gallery = this.app.currentStudio.gallery;

        if (gallery && gallery[index] && mainPhoto) {
            mainPhoto.src = gallery[index];
            this.updatePhotoCounter();
            this.updateActiveThumbnail();
        }
    }

    prevPhoto() {
        const galleryLength = this.app.currentStudio.gallery.length;
        this.currentPhotoIndex = (this.currentPhotoIndex - 1 + galleryLength) % galleryLength;
        this.changePhoto(this.currentPhotoIndex);
    }

    nextPhoto() {
        const galleryLength = this.app.currentStudio.gallery.length;
        this.currentPhotoIndex = (this.currentPhotoIndex + 1) % galleryLength;
        this.changePhoto(this.currentPhotoIndex);
    }

    updatePhotoCounter() {
        const counter = document.getElementById('photoCounter');
        const galleryLength = this.app.currentStudio.gallery.length;
        if (counter) counter.textContent = `${this.currentPhotoIndex + 1} / ${galleryLength}`;
    }

    updateActiveThumbnail() {
        document.querySelectorAll('.ds-thumbnail').forEach((thumb, index) => {
            thumb.classList.toggle('active', index === this.currentPhotoIndex);
        });
    }
}

class TabManager {
    constructor(app) {
        this.app = app;
        this.currentTab = 'overview';
        this.setupTabEvents();
    }

    setupTabEvents() {
        document.querySelectorAll('.ds-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        document.querySelectorAll('.ds-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
            content.classList.toggle('hidden', content.id !== `${tabName}Tab`);
        });

        if (tabName === 'packages') {
            this.app.renderPackages();
        } else if (tabName === 'facilities') {
            this.app.renderFacilities();
        } else if (tabName === 'reviews') {
            this.app.renderReviews();
        }
    }
}

class BookingManager {
    constructor(app) {
        this.app = app;
        this.selectedDate = null;
        this.selectedPeople = null;
        this.setupBookingEvents();
        this.initializeDatePicker();
    }

    setupBookingEvents() {
        const reserveBtn = document.getElementById('reserveBtn');
        if (reserveBtn) reserveBtn.addEventListener('click', () => this.startReservation());

        const chatBtn = document.getElementById('chatWithPartnerBtn');
        if (chatBtn) {
            chatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openInternalChat();
            });
        }

        const viewRouteBtn = document.getElementById('viewRouteBtn');
        if (viewRouteBtn) viewRouteBtn.addEventListener('click', () => this.viewRoute());

        const mapPlaceholder = document.getElementById('mapPlaceholder');
        if (mapPlaceholder) mapPlaceholder.addEventListener('click', () => this.openMaps());

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) dateFilter.addEventListener('click', () => this.openDateModal());

        const peopleSelect = document.getElementById('peopleSelect');
        if (peopleSelect) peopleSelect.addEventListener('change', (e) => this.handlePeopleChange(e.target.value));

        const cancelDate = document.getElementById('cancelDate');
        if (cancelDate) cancelDate.addEventListener('click', () => this.closeDateModal());

        const confirmDate = document.getElementById('confirmDate');
        if (confirmDate) confirmDate.addEventListener('click', () => this.confirmDate());

        const closeModal = document.querySelector('.ds-close-modal');
        if (closeModal) closeModal.addEventListener('click', () => this.closeDateModal());

        const modalDatePicker = document.getElementById('modalDatePicker');
        if (modalDatePicker) modalDatePicker.addEventListener('change', (e) => {
            this.tempSelectedDate = e.target.value;
        });
    }

    openInternalChat() {
        if (!this.app.currentStudio) {
            Utils.showError("Data studio belum siap.");
            return;
        }

        const partnerId = this.app.currentStudio.mitra_id || this.app.currentStudio.id;
        const partnerName = encodeURIComponent(this.app.currentStudio.name);

        // Logika Logo: Utamakan logo dari tabel studio, fallback ke gallery[0]
        const logo = this.app.currentStudio.logo || this.app.currentStudio.image || this.app.currentStudio.gallery?.[0] || '';
        const partnerLogo = encodeURIComponent(logo);

        window.location.href = `chat.html?partner_id=${partnerId}&partner_name=${partnerName}&partner_logo=${partnerLogo}`;
    }

    initializeDatePicker() {
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];

        const datePicker = document.getElementById('datePicker');
        if (datePicker) datePicker.min = formattedToday;

        const modalPicker = document.getElementById('modalDatePicker');
        if (modalPicker) modalPicker.min = formattedToday;

        const urlParams = new URLSearchParams(window.location.search);
        const paramDate = urlParams.get('date');
        const paramCapacity = urlParams.get('capacity') || urlParams.get('pax');

        if (paramDate) {
            this.selectedDate = paramDate;
        } else {
            this.selectedDate = formattedToday;
        }
        this.updateDateDisplay();

        if (paramCapacity) {
            this.handlePeopleChange(paramCapacity);
            const peopleSelect = document.getElementById('peopleSelect');
            if (peopleSelect) peopleSelect.value = paramCapacity;
        }
    }

    openDateModal() {
        const modal = document.getElementById('dateModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (this.selectedDate) {
                const modalPicker = document.getElementById('modalDatePicker');
                if (modalPicker) modalPicker.value = this.selectedDate;
            }
        }
    }

    closeDateModal() {
        const modal = document.getElementById('dateModal');
        if (modal) modal.classList.add('hidden');
        this.tempSelectedDate = null;
    }

    confirmDate() {
        if (this.tempSelectedDate) {
            this.selectedDate = this.tempSelectedDate;
            this.updateDateDisplay();
        }
        this.closeDateModal();
    }

    updateDateDisplay() {
        const dateDisplay = document.getElementById('dateDisplay');
        if (this.selectedDate) {
            const date = new Date(this.selectedDate);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            if (dateDisplay) dateDisplay.textContent = date.toLocaleDateString('id-ID', options);

            const datePicker = document.getElementById('datePicker');
            if (datePicker) datePicker.value = this.selectedDate;
        }
    }

    handlePeopleChange(value) {
        this.selectedPeople = value;
        const display = document.getElementById('peopleDisplay');
        if (display) display.textContent = Utils.getPeopleDisplay(value);

        const peopleFilter = document.getElementById('peopleFilter');
        if (peopleFilter) peopleFilter.style.borderColor = '';
    }

    startReservation() {
        if (!this.selectedDate) {
            Utils.showError('Silakan pilih tanggal terlebih dahulu');
            this.openDateModal();
            return;
        }

        if (!this.selectedPeople) {
            Utils.showError('Pilih kapasitas sebelum melakukan reservasi');

            const peopleFilter = document.getElementById('peopleFilter');
            if (peopleFilter) {
                peopleFilter.style.borderColor = 'var(--ds-error)';
                setTimeout(() => peopleFilter.style.borderColor = '', 2000);
            }

            const peopleSelect = document.getElementById('peopleSelect');
            if (peopleSelect) peopleSelect.focus();
            return;
        }

        const params = new URLSearchParams({
            studioId: this.app.currentStudioId,
            date: this.selectedDate,
            capacity: this.selectedPeople,
            package: 'custom'
        });

        window.location.href = `reservasi.html?${params.toString()}`;
    }

    startBooking(packageData) {
        if (!this.selectedDate) {
            Utils.showError('Silakan pilih tanggal terlebih dahulu');
            this.openDateModal();
            return;
        }

        if (!this.selectedPeople) {
            Utils.showError('Pilih kapasitas sebelum melakukan reservasi');

            const peopleFilter = document.getElementById('peopleFilter');
            if (peopleFilter) {
                peopleFilter.style.borderColor = 'var(--ds-error)';
                setTimeout(() => peopleFilter.style.borderColor = '', 2000);
            }

            const peopleSelect = document.getElementById('peopleSelect');
            if (peopleSelect) peopleSelect.focus();
            return;
        }

        const params = new URLSearchParams({
            studioId: this.app.currentStudioId,
            date: this.selectedDate,
            capacity: this.selectedPeople,
            packageId: packageData.id,
            packageName: packageData.name,
            price: packageData.price
        });

        window.location.href = `reservasi.html?${params.toString()}`;
    }

    viewRoute() {
        const studio = this.app.currentStudio;

        // 1. Prioritas Utama: Cek Link Gmaps dari Database
        if (studio.gmaps_link && studio.gmaps_link.trim() !== "") {
            window.open(studio.gmaps_link, '_blank');
            return;
        }

        // 2. Fallback: Jika link kosong, gunakan pencarian Alamat
        this.openMaps();
    }

    openMaps() {
        const studio = this.app.currentStudio;

        // Cek lagi linknya (untuk jaga-jaga jika dipanggil langsung)
        if (studio.gmaps_link && studio.gmaps_link.trim() !== "") {
            window.open(studio.gmaps_link, '_blank');
            return;
        }

        // 3. Opsi Terakhir: Cari manual di Google Maps pakai Nama Kota + Alamat
        if (studio.address || studio.city) {
            const query = encodeURIComponent(`${studio.address || ''}, ${studio.city || ''}`);
            // Menggunakan format pencarian universal Google Maps
            const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
            window.open(url, '_blank');
        } else {
            Utils.showError("Lokasi studio tidak tersedia.");
        }
    }
}

class StudioApp {
    constructor() {
        this.currentStudioId = this.getStudioIdFromURL();
        this.currentUser = this.getCurrentUser();
        this.currentStudio = null;
        this.searchQuery = '';

        this.init();
    }

    getStudioIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    getCurrentUser() {
        const user = localStorage.getItem("currentUser");
        return user ? JSON.parse(user) : null;
    }

    init() {
        this.currentUser = this.getCurrentUser();

        if (!this.currentUser) {
            window.location.href = "login.html";
            return;
        }

        this.galleryManager = new GalleryManager(this);
        this.tabManager = new TabManager(this);
        this.bookingManager = new BookingManager(this);

        this.loadStudioData();
        this.setupEventListeners();
    }

    async loadStudioData() {
        if (!this.currentStudioId) {
            Utils.showError("ID Studio tidak ditemukan");
            return;
        }
        try {
            const res = await fetch(
                `${API_BASE_URL}/studios/${this.currentStudioId}/detail`
            );

            if (!res.ok) {
                const errText = await res.text();
                console.error("Server Error Response:", errText);
                throw new Error(`Error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const schedMap = {};
            data.schedules.forEach(s => {
                if (s.day) {
                    schedMap[s.day.toLowerCase()] = s;
                }
            });

            const getHours = (dayName) => {
                const s = schedMap[dayName];
                if (!s) return "Tutup";
                if (!s.open_time || !s.close_time) return "Libur";
                return `${s.open_time.substring(0, 5)} - ${s.close_time.substring(0, 5)}`;
            };

            const isOpenNow = this.checkOpenStatus(schedMap);
            const seninHours = getHours('senin');
            const sabtuHours = getHours('sabtu');

            this.currentStudio = {
                ...data.studio,
                gallery: data.images.map(i => `/images/studios/${i.image}`),
                facilities: data.facilities.map(f => f.facility),
                packages: data.packages,
                schedules: data.schedules,
                reviews: data.reviews,
                hours: {
                    weekdays: seninHours,
                    weekends: sabtuHours,
                    isOpen: isOpenNow
                }
            };

            this.renderStudioData();
            this.galleryManager.renderGallery();
            this.renderPackages();
            this.renderFacilities();
            this.renderReviews();

        } catch (err) {
            console.error("❌ Detail Studio Error:", err);
            Utils.showError(`Gagal memuat data studio: ${err.message}`);
        }
    }

    checkOpenStatus(schedMap) {
        const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const now = new Date();
        const todayName = days[now.getDay()];
        const schedule = schedMap[todayName];

        if (!schedule || !schedule.open_time || !schedule.close_time) {
            return false;
        }

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const openParts = schedule.open_time.split(':');
        const closeParts = schedule.close_time.split(':');

        if (openParts.length < 2 || closeParts.length < 2) {
            return false;
        }

        const openH = parseInt(openParts[0]);
        const openM = parseInt(openParts[1]);
        const closeH = parseInt(closeParts[0]);
        const closeM = parseInt(closeParts[1]);

        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    // ==================== RENDER STUDIO DATA ====================
    renderStudioData() {
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text ?? '-';
        };

        const studio = this.currentStudio || {};

        setText('studioName', studio.name);
        setText('studioLocation', studio.location || studio.city);
        setText('studioAddress', studio.address);
        setText('studioCity', studio.city);
        setText('studioDescription', studio.description || 'Tidak ada deskripsi');
        setText('studioCapacity', `Kapasitas max ${studio.capacity || '-'} orang`);
        setText('phoneNumber', studio.phone || '-');

        const rating = studio.rating !== null &&
            studio.rating !== undefined &&
            !isNaN(studio.rating)
            ? Number(studio.rating)
            : null;

        const totalReviews = studio.totalReviews !== null &&
            studio.totalReviews !== undefined
            ? Number(studio.totalReviews)
            : 0;

        setText('sidebarRating', rating !== null ? rating.toFixed(1) : '-');
        setText('sidebarReviewCount', totalReviews > 0 ? totalReviews.toLocaleString() + ' ulasan' : 'Belum ada ulasan');
        setText('sidebarLocation', studio.location || studio.city);

        // === TAMBAHKAN DI SINI ===
        this.renderDailySchedule();
        this.updateSidebarHours();
    }

    // ==================== TAMBAHKAN 3 METHOD INI ====================
    // Method 1: Render tabel jadwal per hari
    renderDailySchedule() {
        const scheduleTable = document.getElementById('dailyScheduleTable');
        if (!scheduleTable) return;

        const schedules = this.currentStudio?.schedules || [];
        const daysOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

        scheduleTable.innerHTML = '';

        const today = new Date();
        const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const todayName = days[today.getDay()];

        daysOrder.forEach(dayKey => {
            const schedule = schedules.find(s =>
                s.day && s.day.toLowerCase() === dayKey
            );

            const row = document.createElement('tr');

            // Highlight hari ini
            if (dayKey === todayName) {
                row.classList.add('ds-schedule-today');
            }

            const dayCell = document.createElement('td');
            dayCell.textContent = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);

            const timeCell = document.createElement('td');

            if (schedule && schedule.open_time && schedule.close_time) {
                const rawOpen = schedule.open_time;
                const rawClose = schedule.close_time;

                // Logika libur / tutup
                const isLibur = !rawOpen || !rawClose ||
                    rawOpen === '00:00:00' || rawClose === '00:00:00' ||
                    rawOpen === '00:00' || rawClose === '00:00' ||
                    rawOpen === 'Libur' || rawClose === 'Libur' ||
                    schedule.is_closed === true || schedule.is_closed === "true" ||
                    schedule.isClosed === true || schedule.isClosed === "true";

                if (isLibur) {
                    const closedBadge = document.createElement('span');
                    closedBadge.className = 'ds-schedule-closed';
                    closedBadge.textContent = 'LIBUR';
                    timeCell.appendChild(closedBadge);
                } else {
                    const openTime = rawOpen.substring(0, 5);
                    const closeTime = rawClose.substring(0, 5);
                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'ds-schedule-time';
                    timeSpan.textContent = `${openTime} - ${closeTime}`;
                    timeCell.appendChild(timeSpan);
                }
            } else {
                const closedBadge = document.createElement('span');
                closedBadge.className = 'ds-schedule-closed';
                closedBadge.textContent = 'LIBUR';
                timeCell.appendChild(closedBadge);
            }

            row.appendChild(dayCell);
            row.appendChild(timeCell);
            scheduleTable.appendChild(row);
        });

        this.updateStudioStatus();
    }

    // Method 2: Update status buka/tutup
    updateStudioStatus() {
        const schedules = this.currentStudio?.schedules || [];
        const today = new Date();
        const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const todayName = days[today.getDay()];

        const todaySchedule = schedules.find(s =>
            s.day && s.day.toLowerCase() === todayName
        );

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (!statusDot || !statusText) return;

        if (!todaySchedule || !todaySchedule.open_time || !todaySchedule.close_time ||
            todaySchedule.open_time === '00:00:00' || todaySchedule.close_time === '00:00:00') {
            statusDot.style.background = 'var(--ds-error)';
            statusText.textContent = 'Libur Hari Ini';
            statusText.style.color = 'var(--ds-error)';
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const openParts = todaySchedule.open_time.split(':');
        const closeParts = todaySchedule.close_time.split(':');

        const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
        const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

        if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
            statusDot.style.background = 'var(--ds-success)';
            statusText.textContent = 'Buka Sekarang';
            statusText.style.color = 'var(--ds-success)';
        } else {
            statusDot.style.background = 'var(--ds-error)';

            if (currentMinutes < openMinutes) {
                const hoursToOpen = Math.floor((openMinutes - currentMinutes) / 60);
                const minutesToOpen = (openMinutes - currentMinutes) % 60;

                if (hoursToOpen > 0) {
                    statusText.textContent = `Buka dalam ${hoursToOpen} jam ${minutesToOpen} menit`;
                } else {
                    statusText.textContent = `Buka dalam ${minutesToOpen} menit`;
                }
            } else {
                statusText.textContent = 'Tutup - Buka Besok';
            }
            statusText.style.color = 'var(--ds-error)';
        }
    }

    // Method 3: Update sidebar hours
    updateSidebarHours() {
        const schedules = this.currentStudio?.schedules || [];
        const today = new Date();
        const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const todayName = days[today.getDay()];

        const todaySchedule = schedules.find(s =>
            s.day && s.day.toLowerCase() === todayName
        );

        const sidebarHours = document.getElementById('sidebarHours');
        if (!sidebarHours) return;

        if (!todaySchedule || !todaySchedule.open_time || !todaySchedule.close_time ||
            todaySchedule.open_time === '00:00:00' || todaySchedule.close_time === '00:00:00') {
            sidebarHours.textContent = 'Libur Hari Ini';
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const openParts = todaySchedule.open_time.split(':');
        const closeParts = todaySchedule.close_time.split(':');

        const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
        const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

        if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
            sidebarHours.textContent = 'Buka Sekarang';
        } else {
            const openTime = todaySchedule.open_time.substring(0, 5);
            const closeTime = todaySchedule.close_time.substring(0, 5);
            sidebarHours.textContent = `${openTime} - ${closeTime}`;
        }
    }

    // ==================== METHOD-METHOD LAINNYA ====================
    renderPackages() {
        const packagesContainer = document.getElementById('packagesContainer');
        if (!packagesContainer) return;

        packagesContainer.innerHTML = '';

        let packagesToShow = this.currentStudio.packages || [];
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            packagesToShow = packagesToShow.filter(pkg =>
                pkg.name.toLowerCase().includes(query) ||
                (pkg.description || '').toLowerCase().includes(query)
            );
        }

        packagesToShow.forEach(pkg => {
            const packageCard = this.createPackageCard(pkg);
            packagesContainer.appendChild(packageCard);
        });

        if (packagesToShow.length === 0) {
            const message = document.createElement('div');
            message.className = 'ds-body-text';
            message.style.textAlign = 'center';
            message.style.padding = '40px';
            message.textContent = 'Tidak ada paket yang cocok dengan pencarian Anda.';
            packagesContainer.appendChild(message);
        }
    }

    createPackageCard(pkg) {
        const card = document.createElement('div');
        card.className = 'ds-package-card';
        if (pkg.price >= 300000) card.classList.add('popular');

        const priceFormatted = pkg.price
            ? `Rp ${pkg.price.toLocaleString('id-ID')}`
            : 'Harga belum tersedia';

        card.innerHTML = `
            <div class="ds-package-header">
                <h4 class="ds-package-name">${pkg.name}</h4>
                ${pkg.price >= 300000 ? '<span class="ds-popular-badge">Populer</span>' : ''}
            </div>
            <div class="ds-package-price">${priceFormatted}</div>
            <div class="ds-body-text">
                ${pkg.description || 'Tidak ada deskripsi paket.'}
            </div>
            <div class="ds-package-duration">Termasuk akses semua fasilitas</div>
        `;

        card.addEventListener('click', () => this.bookingManager.startBooking(pkg));
        return card;
    }

    renderReviews() {
        if (!this.currentStudio.reviews) return;

        const overallRating = document.getElementById('overallRating');
        const validRating = this.currentStudio.rating || 0;
        if (overallRating) overallRating.textContent = Number(validRating).toFixed(1);

        const totalReviews = document.getElementById('totalReviews');
        if (totalReviews) totalReviews.textContent = this.currentStudio.totalReviews.toLocaleString() + ' ulasan';

        this.renderRatingStars();
        this.renderRatingBars();
        this.renderReviewList();
    }

    renderRatingStars() {
        const starsContainer = document.getElementById('ratingStars');
        if (!starsContainer) return;
        starsContainer.innerHTML = '';

        const rating = this.currentStudio.rating || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            const star = document.createElement('svg');
            star.setAttribute('width', '20');
            star.setAttribute('height', '20');
            star.setAttribute('viewBox', '0 0 24 24');

            if (i < fullStars) {
                star.innerHTML = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>';
                star.setAttribute('fill', '#F5B301');
                star.setAttribute('stroke', '#F5B301');
            } else if (i === fullStars && hasHalfStar) {
                star.innerHTML = '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half-star)"/><defs><linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="50%" stop-color="#F5B301"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>';
                star.setAttribute('stroke', '#F5B301');
            } else {
                star.innerHTML = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>';
                star.setAttribute('fill', 'none');
                star.setAttribute('stroke', '#F5B301');
            }

            star.setAttribute('stroke-width', '2');
            starsContainer.appendChild(star);
        }
    }

    renderRatingBars() {
        const barsContainer = document.getElementById('ratingBars');
        if (!barsContainer) return;
        barsContainer.innerHTML = '';

        const summary = this.currentStudio.reviews.summary;
        const total = Object.values(summary).reduce((a, b) => a + b, 0);

        [5, 4, 3, 2, 1].forEach(rating => {
            const count = summary[rating] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;

            const barRow = document.createElement('div');
            barRow.className = 'ds-rating-bar';

            const ratingLabel = document.createElement('span');
            ratingLabel.className = 'ds-small-text';
            ratingLabel.style.minWidth = '32px';
            ratingLabel.textContent = `${rating} ⭐`;

            const barContainer = document.createElement('div');
            barContainer.className = 'ds-bar-container';

            const barFill = document.createElement('div');
            barFill.className = 'ds-bar-fill';
            barFill.style.width = `${percentage}%`;

            const countLabel = document.createElement('span');
            countLabel.className = 'ds-small-text';
            countLabel.style.minWidth = '40px';
            countLabel.style.textAlign = 'right';
            countLabel.textContent = count.toLocaleString();

            barContainer.appendChild(barFill);
            barRow.appendChild(ratingLabel);
            barRow.appendChild(barContainer);
            barRow.appendChild(countLabel);
            barsContainer.appendChild(barRow);
        });
    }

    renderReviewList() {
        const reviewsContainer = document.getElementById('reviewsContainer');
        if (!reviewsContainer) return;
        reviewsContainer.innerHTML = '';

        const list = (this.currentStudio.reviews && Array.isArray(this.currentStudio.reviews.list)) ? this.currentStudio.reviews.list : [];
        if (list.length === 0) {
            reviewsContainer.innerHTML = `<p class="ds-body-text" style="padding: 20px 0;">Belum ada ulasan untuk studio ini.</p>`;
            return;
        }

        list.forEach(review => {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'ds-review-card';

            const header = document.createElement('div');
            header.className = 'ds-review-header';

            const avatar = document.createElement('div');
            avatar.className = 'ds-reviewer-avatar';
            avatar.textContent = review.initial;

            const info = document.createElement('div');
            info.className = 'ds-reviewer-info';

            const name = document.createElement('div');
            name.className = 'ds-card-title';
            name.style.marginBottom = '4px';
            name.textContent = review.reviewer;

            const stars = document.createElement('div');
            stars.className = 'ds-rating-stars';
            stars.style.justifyContent = 'flex-start';
            stars.style.margin = '0 0 8px 0';

            for (let i = 0; i < 5; i++) {
                const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                star.setAttribute('width', '14');
                star.setAttribute('height', '14');
                star.setAttribute('viewBox', '0 0 24 24');
                star.style.display = 'block';

                if (i < review.rating) {
                    star.innerHTML = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>';
                    star.style.fill = '#F5B301';
                    star.style.stroke = '#F5B301';
                } else {
                    star.innerHTML = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>';
                    star.style.fill = 'none';
                    star.style.stroke = '#ccc';
                }
                star.setAttribute('stroke-width', '2');
                stars.appendChild(star);
            }

            const content = document.createElement('div');
            content.className = 'ds-review-content';
            content.style.marginBottom = '8px';
            content.textContent = review.comment || '';

            const date = document.createElement('div');
            date.className = 'ds-review-date';
            date.style.fontSize = '12px';
            date.style.color = '#6b7280';
            date.textContent = Utils.formatDate(review.date);

            info.appendChild(name);
            info.appendChild(stars);
            info.appendChild(content);
            info.appendChild(date);

            header.appendChild(avatar);
            header.appendChild(info);
            reviewCard.appendChild(header);
            reviewsContainer.appendChild(reviewCard);
        });
    }

    renderFacilities() {
        const mainContainer = document.getElementById("mainFacilities");
        const allContainer = document.getElementById("allFacilities");

        if (mainContainer) mainContainer.innerHTML = "";
        if (allContainer) allContainer.innerHTML = "";

        const facilities = this.currentStudio.facilities || [];

        if (facilities.length === 0) {
            const emptyMsg = `<p class="ds-body-text">Fasilitas belum tersedia</p>`;
            if (mainContainer) mainContainer.innerHTML = emptyMsg;
            if (allContainer) allContainer.innerHTML = emptyMsg;
            return;
        }

        facilities.forEach((facility, index) => {
            const item = document.createElement("div");
            item.className = "facility-item";
            item.innerHTML = `
                <span class="facility-icon">✔</span>
                <span class="facility-text">${facility}</span>
            `;

            if (allContainer) allContainer.appendChild(item.cloneNode(true));
            if (mainContainer && index < 4) {
                mainContainer.appendChild(item);
            }
        });
    }

    setupEventListeners() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.goBack());

        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) notifBtn.addEventListener('click', () => this.showNotifications());

        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) profileBtn.addEventListener('click', () => this.goToProfile());

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderPackages();
        });

        const viewAllReviews = document.getElementById('viewAllReviews');
        if (viewAllReviews) viewAllReviews.addEventListener('click', () => this.viewAllReviews());
    }

    goBack() {
        window.location.href = 'customer-app.html';
    }

    goToProfile() {
        if (!this.currentUser) {
            alert("Silakan login untuk melihat profil.");
            window.location.href = "login.html";
            return;
        }
        window.location.href = `kelolaprofile.html?id=${this.currentUser.id}`;
    }

    viewAllReviews() {
        alert(`Total ${this.currentStudio.totalReviews.toLocaleString()} ulasan tersedia. Fitur ini dalam pengembangan.`);
    }

    showNotifications() {
        // Notifications logic
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.studioApp = new StudioApp();
});