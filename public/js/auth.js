// Cek Login State saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('currentUser');

    // Halaman yang TIDAK butuh login
    const publicPages = ['login.html', 'signup.html'];
    const currentPage = window.location.pathname.split("/").pop();

    if (currentUser) {
        const user = JSON.parse(currentUser);
        // Kalau sudah login tapi buka halaman login, lempar ke dashboard
        if (publicPages.includes(currentPage)) {
            if (user.role === 'mitra') window.location.href = 'mitra/mitra-dashboard.html';
            else window.location.href = 'customer-app.html';
        }
    } else {
        // Kalau belum login tapi buka halaman dashboard, lempar ke login
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
});

// LOGIC SIGNUP (REGISTER)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ambil data form
        const name = e.target[0].value;
        const phone = e.target[1].value;
        const email = e.target[2].value;
        const password = e.target[3].value;
        const role = e.target.querySelector('input[name="role"]:checked').value;

        try {
            const API_BASE_URL =
                window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                    ? window.location.origin
                    : (window.location.hostname.includes("netlify.app")
                        ? "https://photohunt-v2-production.up.railway.app"
                        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                            : window.location.origin));

            // KIRIM KE SERVER
            const res = await fetch(`${API_BASE_URL}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role, phone })
            });

            const result = await res.json();

            if (res.ok) {
                alert("Registrasi Berhasil! Silakan Login.");
                window.location.href = "login.html";
            } else {
                alert("Gagal: " + result.message);
            }

        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan koneksi server");
        }
    });
}

// LOGOUT FUNCTION (Global)
window.logout = function () {
    if (confirm('Yakin ingin keluar?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
};