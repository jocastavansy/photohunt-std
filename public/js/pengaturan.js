document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById('spLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
            if (confirmLogout) {
                alert("Anda telah keluar.");
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            }
        });
    }
});