// --- HELPER FORMAT ---
const formatRupiah = (number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);

function renderEmptyState(container, message) {
    if (container) {
        container.innerHTML = `<div class="mitra-dashboard-list-item mitra-dashboard-item-simple" style="justify-content:center;"><span class="text-italic text-sm">${message}</span></div>`;
    }
}

const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

// --- FUNGSI FETCH DATA DARI DATABASE ---
async function fetchDashboardData(mitraId) {
    try {
        console.log("Fetching data for Mitra ID:", mitraId);

       const response = await fetch(`${API_BASE_URL}/mitra/dashboard/${mitraId}`);

        if (!response.ok) {
            throw new Error("Gagal mengambil data dashboard");
        }

        const data = await response.json();
        renderDashboard(data); // SUDAH DIPERBAIKI (huruf 'a' dihapus)

    } catch (err) {
        console.error("Error Fetching:", err);
        document.getElementById("ph-mitra-name").innerText = "Gagal memuat data (Cek Console)";
    }
}

// --- FUNGSI RENDER TAMPILAN ---
function renderDashboard(data) {
    // 1. Header & Stats
    document.getElementById("ph-mitra-name").textContent = `Selamat datang, ${data.mitraName || 'Mitra'}`;
    document.getElementById("ph-stats-today").textContent = data.stats.today;
    document.getElementById("ph-stats-pending").textContent = data.stats.pending;
    document.getElementById("ph-stats-cancel").textContent = data.stats.cancellation;
    document.getElementById("ph-stats-revenue").textContent = formatRupiah(data.stats.revenue);

    // 2. Notifikasi
    const badge = document.getElementById("ph-notif-badge");
    if (badge && data.stats.cancellation > 0) {
        badge.style.display = "block";
        badge.textContent = `${data.stats.cancellation} baru`;
        document.getElementById("ph-card-cancel").classList.add("accent-orange");
    }

    // 3. List Pengajuan Cancel
    const listCancel = document.getElementById("ph-list-cancel-requests");
    if (listCancel) {
        listCancel.innerHTML = "";
        if (!data.cancellationRequests || data.cancellationRequests.length === 0) {
            renderEmptyState(listCancel, "Tidak ada pengajuan");
        } else {
            data.cancellationRequests.slice(0, 2).forEach(item => {
                listCancel.innerHTML += `
                <div class="mitra-dashboard-list-item mitra-dashboard-item-orange" style="cursor:pointer;" onclick="window.location.href='pembatalan-mitra.html'">
                    <div class="mitra-dashboard-item-top">
                        <span class="mitra-dashboard-location">${item.location}</span>
                        <span class="mitra-dashboard-tag">ID: ${item.id}</span>
                    </div>
                    <div class="mitra-dashboard-text-row">${item.package} • ${item.date}</div>
                    <div class="mitra-dashboard-item-bottom" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <span class="mitra-dashboard-text-row text-danger" style="margin:0;">Refund: ${formatRupiah(item.refund)}</span>
                        ${item.status === 'pending' ?
                        `<button class="mitra-dashboard-btn-primary" style="padding: 4px 12px; font-size: 12px; font-weight:700;" onclick="event.stopPropagation(); handleQuickRefund('${item.id}')">Konfirmasi</button>` :
                        `<span class="text-sm text-italic" style="color:#666">${item.status === 'refunded' ? 'Selesai' : 'Hangus'}</span>`
                    }
                    </div>
                </div>`;
            });
        }
    }

    // 4. List Jadwal (Upcoming)
    const listSchedule = document.getElementById("ph-list-schedule");
    if (listSchedule) {
        listSchedule.innerHTML = "";
        if (!data.upcomingSchedule || data.upcomingSchedule.length === 0) {
            renderEmptyState(listSchedule, "Belum ada jadwal");
        } else {
            data.upcomingSchedule.forEach(item => {
                const statusClass = item.status === 'confirmed' ? 'status-confirmed' : 'status-waiting';
                listSchedule.innerHTML += `
                <div class="mitra-dashboard-list-item mitra-dashboard-item-simple">
                    <div>
                        <div class="mitra-dashboard-location">${item.location}</div>
                        <div class="mitra-dashboard-date-group"><span>${item.date}</span><span>${item.time}</span></div>
                    </div>
                    <div class="mitra-dashboard-status-pill ${statusClass}">${item.statusLabel}</div>
                </div>`;
            });
        }
    }

    // 5. List Riwayat (History)
    const listHistory = document.getElementById("ph-list-history");
    if (listHistory) {
        listHistory.innerHTML = "";
        if (!data.historyCancellations || data.historyCancellations.length === 0) {
            renderEmptyState(listHistory, "Riwayat kosong");
        } else {
            data.historyCancellations.forEach(item => {
                listHistory.innerHTML += `
                <div class="mitra-dashboard-list-item mitra-dashboard-item-red" style="cursor:pointer;" onclick="window.location.href='pembatalan-mitra.html?tab=refunded'">
                    <div class="mitra-dashboard-item-top"><span class="mitra-dashboard-location">${item.location}</span></div>
                    <div class="mitra-dashboard-text-row text-italic">Alasan: ${item.reason}</div>
                </div>`;
            });
        }
    }
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {

    // 1. CEK LOGIN
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.role !== 'mitra') {
        alert("Anda belum login sebagai Mitra!");
        window.location.href = "../login.html";
        return;
    }

    // 2. FETCH DATA REAL
    fetchDashboardData(currentUser.id);

    // 3. NAVIGASI TOMBOL
    const setLink = (id, url) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => window.location.href = url;
    };

    setLink("ph-card-today", "reservasi-mitra.html");
    setLink("ph-card-pending", "reservasi-mitra.html");
    setLink("ph-card-revenue", "transaksi-mitra.html");

    setLink("ph-action-studio", "kelola-studio.html");
    setLink("ph-action-reservation", "reservasi-mitra.html");
    setLink("ph-action-transaction", "transaksi-mitra.html");
    setLink("ph-action-cancellation", "pembatalan-mitra.html");
    setLink("ph-card-cancel", "pembatalan-mitra.html");
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (confirm("Apakah Anda yakin ingin keluar?")) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('activeMitraId'); 
                window.location.href = '../login.html';
            }
        });
    }
});

async function handleQuickRefund(cancellationId) {
    if (!confirm("Konfirmasi bahwa refund telah diproses ke rekening pelanggan?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/cancellations/${cancellationId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'refunded' })
        });

        if (res.ok) {
            alert("Refund berhasil dikonfirmasi!");
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            fetchDashboardData(currentUser.id);
        } else {
            alert("Gagal memperbarui status");
        }
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat menghubungi server");
    }
}