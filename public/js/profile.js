const API_BASE_URL =
  window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
    ? window.location.origin
    : (window.location.hostname.includes("netlify.app")
        ? "https://photohunt-v2-production.up.railway.app"
        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
            : window.location.origin));

function getAuthToken() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    return user ? user.id : null; // Asumsi token logic sederhana (bisa diganti JWT)
}

function getHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (response.status === 401) {
            alert("Sesi habis atau belum login. Silakan login kembali.");
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Gagal mengambil data profil');
        }

        const user = await response.json();

        // Update session storage dengan data terbaru
        localStorage.setItem('currentUser', JSON.stringify(user));

        populateForm(user);

    } catch (error) {
        console.error("Error Load Profile:", error);
        // Jangan langsung redirect jika error koneksi, cek token dulu
        if (!getAuthToken()) {
            window.location.href = 'login.html';
        }
    }
}

function populateForm(user) {
    const displayName = document.getElementById('display-name-header');
    const displayEmail = document.getElementById('display-email-header');

    // Gunakan optional chaining (?.) dan OR (||) untuk keamanan
    if (displayName) displayName.innerText = user.name || 'User';
    if (displayEmail) displayEmail.innerText = user.email || '';

    const avatarImg = document.getElementById('avatar-img');
    if (avatarImg) {
        if (user.image) {
            // Tambah timestamp agar gambar tidak cache saat diupdate
            avatarImg.src = `${API_BASE_URL}/images/users/${user.image}?t=${new Date().getTime()}`;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
        }
    }

    const inputName = document.getElementById('input-name');
    if (inputName) inputName.value = user.name || '';

    const inputEmail = document.getElementById('input-email');
    if (inputEmail) {
        inputEmail.value = user.email || '';
        inputEmail.readOnly = true;
        inputEmail.classList.add('input-disabled');
    }

    const inputPhone = document.getElementById('input-phone');
    if (inputPhone) inputPhone.value = user.phone || '';

    const inputGender = document.getElementById('input-gender');
    if (inputGender) inputGender.value = user.gender || '';

    const inputBirthday = document.getElementById('input-birthday');
    if (inputBirthday && user.birthday) {
        // Format tanggal yyyy-MM-dd untuk input type date
        inputBirthday.value = new Date(user.birthday).toISOString().split('T')[0];
    }
}

// UPDATE PROFILE
const btnSaveProfile = document.getElementById('btn-save-profile');
if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
        // Ambil data form (TANPA LOCATION)
        const updatedData = {
            name: document.getElementById('input-name')?.value.trim(),
            phone: document.getElementById('input-phone')?.value.trim(),
            gender: document.getElementById('input-gender')?.value,
            birthday: document.getElementById('input-birthday')?.value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Gagal update profil');

            // Update UI Header
            const headerName = document.getElementById('display-name-header');
            if (headerName) headerName.innerText = updatedData.name;

            // Update LocalStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            const newSessionData = { ...currentUser, ...updatedData };
            localStorage.setItem('currentUser', JSON.stringify(newSessionData));

            alert('Berhasil: Profil telah diperbarui!');
        } catch (error) {
            console.error(error);
            alert(`Gagal: ${error.message}`);
        }
    });
}

// GANTI PASSWORD
const btnSavePassword = document.getElementById('btn-save-password');
if (btnSavePassword) {
    btnSavePassword.addEventListener('click', async () => {
        const currentPass = document.getElementById('input-curr-pass').value;
        const newPass = document.getElementById('input-new-pass').value;
        const confirmPass = document.getElementById('input-conf-pass').value;

        if (!currentPass || !newPass || !confirmPass) return alert('Isi semua field password.');
        if (newPass.length < 6) return alert('Password minimal 6 karakter.');
        if (newPass !== confirmPass) return alert('Konfirmasi password tidak cocok.');

        try {
            const response = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Gagal mengganti password');

            alert('Password berhasil diubah. Silakan login ulang.');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';

        } catch (error) {
            console.error("Password Error:", error);
            alert(`Gagal: ${error.message}`);
        }
    });
}

// UPLOAD FOTO
const fileInput = document.getElementById('file-input-profile');
if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Ukuran file terlalu besar (Max 2MB)");
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
                method: 'POST',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Gagal upload");

            const avatarImg = document.getElementById('avatar-img');
            if (avatarImg) {
                avatarImg.src = `${API_BASE_URL}/images/users/${result.image}?t=${new Date().getTime()}`;
                avatarImg.style.display = 'block';
            }

            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            currentUser.image = result.image;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            alert("Foto profil berhasil diperbarui!");

        } catch (error) {
            console.error(error);
            alert(`Gagal Upload: ${error.message}`);
        } finally {
            fileInput.value = '';
        }
    });
}

function redirectToSettings() {
    window.location.href = 'pengaturan.html';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!getAuthToken()) {
        window.location.href = 'login.html';
    } else {
        loadProfile();
    }
});