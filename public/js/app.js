document.addEventListener('DOMContentLoaded', () => {
    // === CEK LOGIN ===
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(currentUser);

    // Tampilkan nama user di header
    document.querySelector('.logo').insertAdjacentHTML('afterend',
        `<span style="margin-left:15px; color:white; font-weight:600;">Hi, ${user.name.split(' ')[0]}!</span>`);

    // === VARIABEL KATEGORI (Photobox / Photostudio) ===
    let currentCategory = 'photobox'; 

    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.type;     
            loadStudios();                         
        });
    });

    // === DATABASE SETUP ===
    let db;
    const dbName = 'PhotoHuntDB';
    const dbVersion = 2;

//     const sampleStudios = [
//     {
//         id: 1,
//         type: 'photostudio',
//         name: 'Selfie Time, Mall Pulo Gadung',
//         location: 'Jakarta',
//         capacity: 4,
//         photos: [
//             'images/selfietime.jpg',
//             'images/selfietime2.jpg',
//             'images/selfietime3.jpg'
//         ],
//         description: 'Studio selfie modern.'
//     },
//     {
//         id: 2,
//         type: 'photostudio',
//         name: 'Dirtyline Studio, Tambun',
//         location: 'Bekasi',
//         capacity: 6,
//         photos: [
//             'images/dirtyline1.jpg',
//             'images/dirtyline2.jpg'
//         ],
//         description: 'Ruang foto kreatif.'
//     },
//     {
//         id: 3,
//         type: 'photobox',
//         name: 'Angel Photobox, Bekasi Timur',
//         location: 'Bekasi',
//         capacity: 2,
//         photos: [
//             'images/angel1.jpg'
//         ],
//         description: 'Photobox cepat & murah.'
//     },
//     {
//         id: 4,
//         type: 'photobox',
//         name: 'Kawaii Box, Pantai Indah Kapuk',
//         location: 'Jakarta',
//         capacity: 3,
//         photos: [
//             'images/kawaii1.jpg',
//             'images/kawaii2.jpg'
//         ],
//         description: 'Tema Jepang lucu.'
//     }
// ];


    function initDB() {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = (e) => { db = e.target.result; loadStudios(); };
        request.onupgradeneeded = (e) => {
        db = e.target.result;

        if (!db.objectStoreNames.contains('studios')) {
            const store = db.createObjectStore('studios', { keyPath: 'id' });
            sampleStudios.forEach(s => store.add(s));
        }
        };

    }

    function loadStudios() {
    const transaction = db.transaction(['studios'], 'readonly');
    const store = transaction.objectStore('studios');
    const request = store.getAll();

    request.onsuccess = () => {
        const filtered = request.result.filter(s => s.type === currentCategory);
        const grid = document.getElementById('results');

        if (filtered.length === 0) {
            grid.innerHTML = `
                <p style="grid-column:1/-1;text-align:center;color:#999;margin:40px;">
                    Belum ada ${currentCategory}
                </p>`;
            return;
        }

        grid.innerHTML = filtered.map(studio => `
            <div class="studio-card" onclick="openModal(${studio.id})">
                <img src="${studio.photos[0]}" alt="${studio.name}">
                <div class="studio-info">
                    <h3>${studio.name}</h3>
                    <p>${studio.location} • ${studio.capacity} orang</p>
                </div>
            </div>
        `).join('');
    };
}
    window.openModal = (id) => {
    const transaction = db.transaction(['studios'], 'readonly');
    const store = transaction.objectStore('studios');
    const request = store.get(id);

        // === MODAL FUNCTIONS ===
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
        console.log('✅ Close button event listener attached');
    }
    
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Close modal dengan ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    function showModal(studio) {
        
        const newCloseBtn = body.querySelector('.close');
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', closeModal);
            console.log('✅ Modal close button re-attached');
        }
        
        modal.style.display = 'block';
    }

    request.onsuccess = () => {
        const studio = request.result;
        const modal = document.getElementById('modal');
        const body = document.getElementById('modalBody');

        body.innerHTML = `
            <h2>${studio.name}</h2>
            <p>${studio.description}</p>

            <div style="display:flex;gap:10px;overflow-x:auto;margin:15px 0;">
                ${studio.photos.map(p => `
                    <img src="${p}" style="height:160px;border-radius:10px;">
                `).join('')}
            </div>

            <button onclick="makeBooking(${studio.id})"
                style="width:100%;padding:12px;border:none;background:#000;color:white;border-radius:8px;cursor:pointer;">
                Booking Sekarang
            </button>
        `;

        modal.style.display = 'block';
    };
};

window.closeModal = () => {
    document.getElementById('modal').style.display = 'none';
};

    window.makeBooking = (id) => { };

    // === LOGOUT ===
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Keluar dari akun?')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    });

    // === START ===
    initDB();
});