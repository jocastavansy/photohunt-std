
document.addEventListener("DOMContentLoaded", function () {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        alert("Silakan login terlebih dahulu");
        window.location.href = 'login.html';
        return;
    }

    fetchHistory(currentUser.id);
});

async function fetchHistory(customerId) {
    try {
        const API_BASE_URL =
            window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                ? window.location.origin
                : (window.location.hostname.includes("netlify.app")
                    ? "https://photohunt-v2-production.up.railway.app"
                    : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                        ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                        : window.location.origin));

        const res = await fetch(`${API_BASE_URL}/customers/${customerId}/bookings`);
        if (!res.ok) throw new Error("Gagal mengambil riwayat");

        const data = await res.json();
        renderHistory(data);
    } catch (err) {
        console.error(err);
        document.getElementById('card-container').innerHTML = `<p style="text-align:center; margin-top:50px;">Gagal memuat riwayat transaksi.</p>`;
    }
}

// CONFIG STATUS (SOLID COLORS & FINAL LABELS)
function getStatusConfig(item) {
    const s = (item.status || 'PENDING').toLowerCase();
    const cs = item.cancel_status ? item.cancel_status.toLowerCase() : null;

    // 1. PRIORITAS: STATUS DARI TABEL BOOKINGS (CONFIRMED/PAID/COMPLETED)
    if (s === 'completed') {
        return { label: "RESERVASI SELESAI", bgColor: "#10B981", textColor: "#FFFFFF" };
    }
    if (s === 'confirmed' || s === 'paid') {
        return { label: "RESERVASI BERHASIL", bgColor: "#10B981", textColor: "#FFFFFF" };
    }

    // 2. CEK STATUS PEMBATALAN (CANCEL TABLE)
    if (cs === 'refunded') {
        return { label: "REFUND BERHASIL", bgColor: "#10B981", textColor: "#FFFFFF" };
    }
    if (cs === 'rejected_by_policy') {
        return { label: "REFUND DITOLAK", bgColor: "#EF4444", textColor: "#FFFFFF" };
    }
    if (cs === 'pending') {
        return { label: "REFUND DIPROSES", bgColor: "#F59E0B", textColor: "#FFFFFF" };
    }

    // 3. LAINNYA
    if (s === 'cancelled') {
        return { label: "DIBATALKAN", bgColor: "#EF4444", textColor: "#FFFFFF" };
    }
    if (s === 'rejected') {
        return { label: "RESERVASI DITOLAK", bgColor: "#EF4444", textColor: "#FFFFFF" };
    }
    if (s === 'pending' || s === 'pending_payment') {
        return {
            label: s === 'pending' ? "MENUNGGU KONFIRMASI" : "MENUNGGU PEMBAYARAN",
            bgColor: "#F59E0B",
            textColor: "#FFFFFF"
        };
    }

    // Fallback
    return {
        label: "PESANAN DIPROSES",
        bgColor: "#1E40AF",
        textColor: "#FFFFFF"
    };
}

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('id-ID', options);
};

function renderHistory(data) {
    const container = document.getElementById('card-container');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center; margin-top:50px;">Belum ada riwayat transaksi.</p>`;
        return;
    }

    data.forEach(item => {
        const styleConfig = getStatusConfig(item);

        const onClickAttr = `onclick="bukaDetailPesanan('${item.id}')"`;
        const cursorStyle = 'cursor: pointer;';

        const cardHTML = `
                <div class="search2" ${onClickAttr} style="${cursorStyle}">
                    
                    <div class="studio-name">${item.studio_name}</div>
                    
                    <div class="status-bg" style="background: ${styleConfig.bgColor};"></div>
                    <div class="status-text" style="color: ${styleConfig.textColor};">
                        ${styleConfig.label}
                    </div>

                    <div class="package-name">${item.package_name || 'Paket Reservasi'}</div>
                    <div class="price-text">${formatRupiah(item.total_price)}</div>

                    <div class="location-container">
                        <div class="location-text">${item.studio_location}</div>
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#555555"/></svg>
                    </div>

                    <div class="date-container">
                        <div class="date-text">${formatDate(item.booking_date)}</div>
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM19 7H5V6H19V7Z" fill="#555555"/></svg>
                    </div>

                    ${(item.status === 'pending_payment') ?
                `<button class="btn-bayar-mini" onclick="event.stopPropagation(); bayar('${item.id}')">Pay</button>` : ''
            }
                </div>
            `;

        container.innerHTML += cardHTML;
    });
}

function bukaDetailPesanan(id) {
    window.location.href = `pemesanan.html?bookingId=${id}`;
}

function bayar(id) {
    window.location.href = `pembayaran.html?bookingId=${id}`;
}


