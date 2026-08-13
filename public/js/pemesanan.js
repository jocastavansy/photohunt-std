
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(angka).replace("Rp", "Rp.");
}

function formatDateIndo(dateString) {
    if (!dateString) return '-';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function formatFullTimestamp(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${dayName}, ${dayNum} ${monthName} ${year} pukul ${hours}:${minutes} WIB`;
}

function generateOrderId() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV/${yyyy}${mm}${dd}/PH/${random}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');

    if (!bookingId) {
        alert("ID Pemesanan tidak ditemukan");
        window.location.href = 'history.html';
        return;
    }

    try {
        const API_BASE_URL =
            window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                ? window.location.origin
                : (window.location.hostname.includes("netlify.app")
                    ? "https://photohunt-v2-production.up.railway.app"
                    : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                        ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                        : window.location.origin));

        const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
        if (!res.ok) throw new Error("Gagal mengambil data booking");
        const booking = await res.json();

        // Render Data
        document.getElementById('orderId').textContent = `INV/${booking.id}/PH/${new Date(booking.created_at || booking.createdAt || Date.now()).getTime().toString().slice(-4)}`;

        const createdAtElem = document.getElementById('createdAtDisplay');
        if (createdAtElem) {
            createdAtElem.textContent = formatFullTimestamp(booking.created_at || booking.createdAt);
        }
        document.getElementById('studioName').textContent = booking.studio_name;
        document.getElementById('studioAddress').textContent = booking.studio_location;

        const currentUserVar = JSON.parse(localStorage.getItem('currentUser')) || {};
        document.getElementById('customerName').textContent = currentUserVar.name || "Pelanggan";
        document.getElementById('packageName').textContent = booking.package_name || "Custom Package";
        document.getElementById('bookingDate').textContent = formatDateIndo(booking.booking_date);
        document.getElementById('bookingTime').textContent = booking.booking_time + " WIB";
        document.getElementById('peopleCount').textContent = booking.pax + " Orang";

        // Logic durasi sederhana (bisa disesuaikan jika ada data durasi di DB)
        let durasi = "60 Menit";
        if (booking.package_name && booking.package_name.toLowerCase().includes("30")) durasi = "30 Menit";
        document.getElementById('durationDisplay').textContent = durasi;

        const hargaFmt = formatRupiah(booking.total_price);
        document.getElementById('payPackageName').textContent = booking.package_name || "Paket Reservasi";
        document.getElementById('packagePrice').textContent = hargaFmt;
        document.getElementById('totalPrice').textContent = hargaFmt;

        // Status Badge update (Optional jika ada elementnya)
        const badge = document.querySelector('.ph-status-badge');
        if (badge) {
            const s = (booking.status || 'PENDING').toLowerCase();
            const cs = booking.cancel_status ? booking.cancel_status.toLowerCase() : null;

            const cObj = booking.cancellation || {};

            // 1. PRIORITAS: CEK STATUS PEMBATALAN
            if (cs === 'refunded' || cs === 'rejected_by_policy' || cs === 'pending' || s === 'cancelled') {
                if (cs === 'refunded') {
                    badge.textContent = "REFUND BERHASIL";
                    badge.style.background = "#22c55e";
                } else if (cs === 'rejected_by_policy') {
                    badge.textContent = "REFUND DITOLAK";
                    badge.style.background = "#ef4444";
                } else {
                    badge.textContent = "REFUND DIPROSES";
                    badge.style.background = "#f59e0b";
                }

                // // Sembunyikan tombol aksi & QR jika sudah dalam proses batal
                // const actionArea = document.querySelector('.action-buttons');
                // if (actionArea) actionArea.style.display = 'none';

                const qrContainer = document.querySelector('.qr-section');
                if (qrContainer) {
                    const proofFile = cObj.proof_refund || cObj.proofRefund;
                    const proofBtnHTML = proofFile ? `
                        <a href="/uploads/payments/${proofFile}" target="_blank" style="display: inline-block; margin-top: 10px; background: #059669; color: #ffffff; padding: 9px 18px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; box-shadow: 0 2px 6px rgba(5,150,105,0.25);">
                            📄 Lihat Bukti Transfer Refund
                        </a>
                    ` : `<div style="font-size: 12px; color: #059669; margin-top: 6px; font-weight: 600;">(Bukti transfer telah dikonfirmasi oleh mitra)</div>`;

                    let rightBoxHTML = '';
                    if (cs === 'refunded') {
                        rightBoxHTML = `
                            <div style="flex: 1; min-width: 260px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(34,197,94,0.08);">
                                <div style="font-size: 15px; font-weight: 700; color: #166534; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span>✅</span> Informasi Refund Berhasil
                                </div>
                                <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-bottom: 8px;">
                                    ${formatRupiah(cObj.refund_amount || booking.total_price)}
                                </div>
                                <div style="font-size: 13px; color: #166534; line-height: 1.6; margin-bottom: 12px;">
                                    Dana telah ditransfer oleh Mitra. Silakan periksa mutasi rekening atau e-wallet Anda secara mandiri.
                                </div>
                                ${proofBtnHTML}
                            </div>
                        `;
                    } else if (cs === 'rejected_by_policy') {
                        rightBoxHTML = `
                            <div style="flex: 1; min-width: 260px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(239,68,68,0.08);">
                                <div style="font-size: 15px; font-weight: 700; color: #991b1b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span>⚠️</span> Kebijakan Pembatalan
                                </div>
                                <div style="font-size: 13px; color: #7f1d1d; line-height: 1.6;">
                                    <b>Refund 100%</b> hanya berlaku untuk pembatalan yang dilakukan sebelum H-2 jadwal.<br><br>Pembatalan mulai dari H-2 hingga hari H mengakibatkan <b>uang hangus (tanpa refund)</b>.
                                </div>
                            </div>
                        `;
                    } else {
                        rightBoxHTML = `
                            <div style="flex: 1; min-width: 260px; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 20px;">
                                <div style="font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 8px;">
                                    ⏳ Menunggu Diproses
                                </div>
                                <div style="font-size: 13px; color: #78350f; line-height: 1.6;">
                                    Pengajuan pembatalan Anda sedang diperiksa oleh pihak Mitra.
                                </div>
                            </div>
                        `;
                    }

                    qrContainer.innerHTML = `
                        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; width: 100%;">
                            <div style="flex: 1; min-width: 260px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                                <div style="font-size: 15px; font-weight: 700; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                                    <span>📝</span> Alasan & Data Diri Pengembalian
                                </div>
                                <div style="font-size: 13px; color: #4b5563; line-height: 1.8;">
                                    <div><b>Alasan Pembatalan:</b> ${cObj.reason || '-'}</div>
                                    <div style="margin-top: 6px;"><b>Nama Bank / E-Wallet:</b> ${cObj.bank_name || cObj.bankName || '-'}</div>
                                    <div><b>No. Rekening / HP:</b> ${cObj.account_number || cObj.accountNumber || '-'}</div>
                                    <div><b>Nama Pemilik:</b> ${cObj.account_name || cObj.accountName || '-'}</div>
                                </div>
                            </div>
                            ${rightBoxHTML}
                        </div>
                    `;
                }

                // Ganti tombol aksi di bawah menjadi 1 Button "Reservasi Lagi"
                const actionArea = document.querySelector('.action-buttons');
                if (actionArea) {
                    const studioId = booking.studio_id || (booking.studio && (booking.studio.id || booking.studio._id));
                    const studioName = booking.studio_name || "Studio";
                    actionArea.style.display = 'flex';
                    actionArea.innerHTML = `
                        <button class="btn-black" style="width: 100%; padding: 14px 24px; font-weight: 700; font-size: 15px; border-radius: 10px; cursor: pointer; background: #000; color: #fff; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" onclick="window.location.href='detail-studio.html?id=${studioId}'">
                            🔄 Reservasi Lagi di ${studioName}
                        </button>
                    `;
                }
            }
            // 2. STATUS DARI BOOKING
            else if (s === 'rejected') {
                badge.textContent = "RESERVASI DITOLAK";
                badge.style.background = "#ef4444";
            } else if (s === 'completed') {
                badge.textContent = "SELESAI";
                badge.style.background = "#22c55e";

                const qrContainer = document.querySelector('.qr-section');
                if (qrContainer) {
                    const gLink = booking.gdrive_link || booking.gdriveLink;
                    const gDriveBtnHTML = gLink ? `
                        <div style="margin-top: 15px;">
                            <a href="${gLink}" target="_blank" style="display: inline-block; background: #22c55e; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.25);">
                                📁 Akses Foto / Result (Google Drive)
                            </a>
                        </div>
                    ` : `<div style="font-size: 12px; color: #65a30d; margin-top: 8px;">(Link Google Drive hasil foto akan diupdate oleh mitra)</div>`;

                    qrContainer.innerHTML = `
                        <div style="padding: 30px 20px; text-align:center; color: #15803d; border: 2px dashed #bbf7d0; border-radius: 12px; background: #f0fdf4; margin: 10px 0;">
                            <div style="font-size: 26px; margin-bottom: 6px;">✨</div>
                            <div style="font-size: 16px; font-weight: 700; color: #166534; margin-bottom: 4px;">Terima kasih sudah mempercayakan jasa kami</div>
                            ${gDriveBtnHTML}
                        </div>
                    `;
                }
            } else if (s === 'confirmed' || s === 'paid') {
                badge.textContent = "RESERVASI DISETUJUI";
                badge.style.background = "#22c55e";
            } else if (s === 'pending' || s === 'pending_payment') {
                badge.textContent = s === 'pending' ? "MENUNGGU KONFIRMASI" : "MENUNGGU PEMBAYARAN";
                badge.style.background = "#f59e0b";

                // Sembunyikan QR Code jika masih pending
                const qrContainer = document.querySelector('.qr-section');
                if (qrContainer) {
                    qrContainer.innerHTML = `<div style="padding: 40px; text-align:center; color: #92400e; font-weight: 500; border: 2px dashed #fef3c7; border-radius: 12px; background: #fffbeb;">
                        QR Code Belum Tersedia<br>Menunggu konfirmasi mitra.
                    </div>`;
                }
            }
        }

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(booking.id)}`;
        const qrImgElem = document.getElementById('qrImage');
        if (qrImgElem) qrImgElem.src = qrUrl;

        const s = (booking.status || '').toLowerCase();
        const cs = booking.cancel_status ? booking.cancel_status.toLowerCase() : null;

        // LOGIC TOMBOL ULASAN & BATAL (JIKA TIDAK CANCELLED)
        if (cs !== 'refunded' && cs !== 'rejected_by_policy' && cs !== 'pending' && s !== 'cancelled') {
            const reviewBtn = document.getElementById('reviewBtn');
            if (reviewBtn) {
                if (['confirmed', 'paid', 'completed'].includes(s)) {
                    reviewBtn.style.display = 'block';
                    reviewBtn.onclick = () => {
                        window.location.href = `review.html?bookingId=${bookingId}&studioId=${booking.studio_id}`;
                    };
                } else {
                    reviewBtn.style.display = 'none';
                }
            }

            const cancelBtn = document.getElementById('cancelOrderBtn');
            if (cancelBtn) {
                if (s === 'completed' || s === 'cancelled' || s === 'rejected') {
                    cancelBtn.style.display = 'none';
                } else {
                    cancelBtn.style.display = 'block';
                    cancelBtn.onclick = () => {
                        window.location.href = `batal.html?bookingId=${bookingId}`;
                    };
                }
            }
        }

        // FIX: Move chat button logic inside try block so 'booking' is defined
        const chatBtn = document.querySelector('.ph-cta-btn');
        if (chatBtn) {
            chatBtn.onclick = () => openChatFromOrder(booking);
        }

    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memuat data");
    }
});

function openChatFromOrder(booking) {
    if (!booking) return;

    const partnerId = booking.mitra_id; // Pastikan backend kirim mitra_id di detail booking (biasanya join studio)
    // Jika booking detail belum punya mitra_id, perlu tambahkan di query backend jika belum ada.
    // Berdasarkan server.js check sebelumnya, query booking detail sudah join studio tapi select fieldsnya perlu dicek.
    // Query backend: JOIN studios s ... SELECT s.name, ... 
    // Kita harus pastikan s.mitra_id terambil.

    // Workaround: jika booking object di JS tidak punya mitra_id, kita pakai studio_id (mungkin less ideal tapi coba dulu)
    // Tapi sebaiknya update query di server.js juga untuk ambil s.mitra_id.
    // Mari kita asumsikan server.js sudah kita update (step selanjutnya).

    const pId = booking.mitra_id || booking.studio_id;
    const pName = encodeURIComponent(booking.studio_name);
    const pLogo = booking.studio_image ? encodeURIComponent(booking.studio_image) : '';

    window.location.href = `chat.html?partner_id=${pId}&partner_name=${pName}&partner_logo=${pLogo}`;
}
