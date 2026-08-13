    let db;
    const DB_NAME = 'PhotoHuntAuth';
    const DB_VERSION = 2; 
    const USER_STORE = 'users';

    // Data Default (Auto-Seed)
    const defaultUser = {
        name: "Emma Collins", 
        username: "emmacollins",
        email: "emma.collins@gmail.com",
        password: "password123",
        location: "Indonesia",
        gender: "Female",
        birthday: "2006-12-22"
    };

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 1. Initial Setup
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (db.objectStoreNames.contains(USER_STORE)) {
            db.deleteObjectStore(USER_STORE);
        }
        const objectStore = db.createObjectStore(USER_STORE, { keyPath: 'email' });
        
        console.log("Database initialized. Seeding default data...");
        objectStore.add(defaultUser);
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        console.log("Database connected.");
        
        const transaction = db.transaction(USER_STORE, 'readwrite');
        const store = transaction.objectStore(USER_STORE);
        const countRequest = store.count();

        countRequest.onsuccess = () => {
            if (countRequest.result === 0) {
                store.add(defaultUser);
                localStorage.setItem('currentUser', JSON.stringify(defaultUser));
                loadProfile();
            } else {
                if (!localStorage.getItem('currentUser')) {
                    localStorage.setItem('currentUser', JSON.stringify(defaultUser));
                }
                loadProfile();
            }
        };
    };

    request.onerror = (e) => {
        console.error("Database Error:", e.target.error);
    };

    function loadProfile() {
        const userDataString = localStorage.getItem('currentUser');
        if (!userDataString) return;

        const user = JSON.parse(userDataString);
        populateForm(user);
    }

    function populateForm(user) {
        document.getElementById('display-name-header').innerText = user.name || 'User';
        document.getElementById('display-email-header').innerText = user.email || '';
        if(user.photoUrl) document.getElementById('avatar-img').src = user.photoUrl;

        document.getElementById('input-name').value = user.name || ''; 
        document.getElementById('input-username').value = user.username || '';
        
        const emailInput = document.getElementById('input-email');
        emailInput.value = user.email || ''; 
        emailInput.readOnly = true; 
        emailInput.classList.add('input-disabled');

        document.getElementById('input-location').value = user.location || '';
        document.getElementById('input-gender').value = user.gender || ''; 
        document.getElementById('input-birthday').value = user.birthday || '';
    }

    document.getElementById('btn-save-profile').addEventListener('click', () => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) return alert("Error: Sesi hilang.");

        const updatedUser = {
            ...currentUser,
            name: document.getElementById('input-name').value.trim(),
            username: document.getElementById('input-username').value.trim(),
            location: document.getElementById('input-location').value.trim(),
            gender: document.getElementById('input-gender').value,
            birthday: document.getElementById('input-birthday').value
        };

        const tx = db.transaction(USER_STORE, 'readwrite');
        const store = tx.objectStore(USER_STORE);
        const req = store.put(updatedUser);

        req.onsuccess = () => {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser)); 
            document.getElementById('display-name-header').innerText = updatedUser.name;
            alert('Database Updated: Profil berhasil diperbarui!');
        };
        req.onerror = () => alert('Gagal update database.');
    });

    document.getElementById('btn-save-password').addEventListener('click', () => {
        const currentPass = document.getElementById('input-curr-pass').value;
        const newPass = document.getElementById('input-new-pass').value;
        const confirmPass = document.getElementById('input-conf-pass').value;

        if (!currentPass || !newPass || !confirmPass) return alert('Isi semua field password.');
        if (newPass.length < 6) return alert('Password minimal 6 karakter.');
        if (newPass !== confirmPass) return alert('Konfirmasi password tidak cocok.');

        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user.password !== currentPass) return alert('Password lama salah!');

        user.password = newPass;

        const tx = db.transaction(USER_STORE, 'readwrite');
        const store = tx.objectStore(USER_STORE);
        const req = store.put(user);

        req.onsuccess = () => {
            alert('Password berhasil diubah. Silakan login ulang.');
            localStorage.removeItem('currentUser');
            location.reload(); 
        };
    });

    function redirectToSettings() {
        window.location.href = 'halaman_pengaturan.html'; 
    }