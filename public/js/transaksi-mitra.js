
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.role !== 'mitra') {
        window.location.href = "../login.html";
        return;
    }

    fetchTransactions(currentUser.id);
});

async function fetchTransactions(mitraId) {
    try {
        const API_BASE_URL =
            window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                ? window.location.origin
                : (window.location.hostname.includes("netlify.app")
                    ? "https://photohunt-v2-production.up.railway.app"
                    : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                        ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                        : window.location.origin));

        const response = await fetch(`${API_BASE_URL}/mitra/transactions/${mitraId}`);
        if (!response.ok) throw new Error("Gagal mengambil data transaksi");

        const data = await response.json();
        renderTable(data);
    } catch (err) {
        console.error("❌ Gagal ambil data:", err);
        document.getElementById('table-body').innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:30px;">Gagal memuat data Riwayat Transaksi.</td></tr>`;
    }
}

// Fungsi Render Utama
function renderTable(data) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = ""; // Bersihkan loading

    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">Belum ada transaksi.</td></tr>`;
        return;
    }

    data.forEach((transaksi) => {
        const row = document.createElement("tr");

        const formattedNominal = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(transaksi.amount);

        const dateObj = new Date(transaksi.created_at);
        const formattedDate = dateObj.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });

        let statusClass = "secondary";
        let statusLabel = transaksi.status;

        // Backend maps to 'refund' for cancelled and 'success' for confirmed/paid/completed
        switch (transaksi.status.toLowerCase()) {
            case "success":
                statusClass = "success";
                statusLabel = "Lunas";
                break;
            case "refund":
                statusClass = "refund";
                statusLabel = "Dikembalikan";
                break;
            default:
                statusClass = "secondary";
                statusLabel = transaksi.status;
        }

        row.innerHTML = `
                <td>#${transaksi.transaction_id}</td>
                <td><span style="font-weight:500;">${transaksi.studio_name}</span></td>
                <td>${formattedDate}</td>
                <td style="font-weight:600;">${formattedNominal}</td>
                <td><span class="status ${statusClass}">${statusLabel}</span></td>
                <td style="text-align: center;">
                    <button class="icon-btn" onclick="viewDetail('${transaksi.transaction_id}')" title="Lihat Detail">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </td>
            `;

        tableBody.appendChild(row);
    });
}

function viewDetail(id) {
    // Redirect ke detail reservasi karena ID transaksi = ID Booking
    window.location.href = "reservasi-mitra.html";
}
