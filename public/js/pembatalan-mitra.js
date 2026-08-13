document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== 'mitra') {
    window.location.href = "../login.html";
    return;
  }

  fetchCancellations(currentUser.id).then(() => {
    // Check if there's a tab param in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      const tabMap = {
        'pending': 1, // index of buttons
        'refunded': 2
      };
      const buttons = document.querySelectorAll('.cr-tab');
      if (tabMap[tab] && buttons[tabMap[tab]]) {
        filterData(tab, buttons[tabMap[tab]]);
      }
    }
  });
});

const API_BASE_URL =
  window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
    ? window.location.origin
    : (window.location.hostname.includes("netlify.app")
        ? "https://photohunt-v2-production.up.railway.app"
        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
            : window.location.origin));

async function fetchCancellations(mitraId) {
  try {
    const res = await fetch(`${API_BASE_URL}/mitra/cancellations/${mitraId}`);
    if (!res.ok) throw new Error("Gagal mengambil data");

    window.allCancellations = await res.json();
    renderList(window.allCancellations);
  } catch (err) {
    console.error(err);
    document.getElementById('data-container').innerHTML = '<div style="text-align:center; padding:40px; color: #888">Gagal memuat data.</div>';
  }
}

function renderList(data) {
  const container = document.getElementById('data-container');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px;">Tidak ada data pembatalan.</div>';
    return;
  }

  data.forEach(item => {
    const resDate = new Date(item.booking_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const reqDate = new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    let badgeHtml = '';
    let actionsHtml = '';
    let statusTag = '';
    let policyNote = '';

    if (item.status === 'pending') {
      badgeHtml = `<div class="cr-badge cr-badge--pending">Menunggu Konfirmasi Transfer Refund</div>`;
      policyNote = `<div style="font-size: 12px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; margin-top: 10px;">
        ℹ️ <b>Kebijakan Refund 100%:</b> Pembatalan diajukan lebih dari H-2 jadwal. Uang sebesar <b>${formatRupiah(item.refund_amount || item.total_price)}</b> wajib dikembalikan ke customer.
      </div>`;
      actionsHtml = `
                <div class="cr-actions">
                  <div class="cr-actions__prompt">
                    <span class="cr-prompt-text">Konfirmasi bahwa refund telah ditransfer ke rekening customer?</span>
                  </div>
                  <div class="cr-actions__buttons">
                    <button class="cr-btn cr-btn--approve" onclick="handleAction('${item.id}', 'refunded')">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Konfirmasi Transfer Refund
                    </button>
                  </div>
                </div>`;
    } else if (item.status === 'refunded') {
      badgeHtml = `<div class="cr-badge cr-badge--cancelled">Dibatalkan (Refund Sukses 100%)</div>`;
      policyNote = `<div style="font-size: 12px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; margin-top: 10px;">
        ✅ <b>Refund Dikembalikan:</b> Uang sebesar <b>${formatRupiah(item.refund_amount || item.total_price)}</b> telah dikembalikan ke customer (Pembatalan > H-2).
      </div>`;
      statusTag = `<div class="cr-footer-status"><div class="cr-status-tag cr-status-tag--refunded">Dana 100% Dikembalikan</div></div>`;
    } else if (item.status === 'rejected_by_policy') {
      badgeHtml = `<div class="cr-badge cr-badge--rejected">Dibatalkan (Uang Diterima Mitra)</div>`;
      policyNote = `<div style="font-size: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-top: 10px;">
        ⚠️ <b>Kebijakan H-2:</b> Pembatalan diajukan di H-2 s/d Hari H. Sesuai ketentuan, <b>uang tidak dikembalikan ke customer (hangus)</b>.
      </div>`;
      statusTag = `<div class="cr-footer-status"><div class="cr-status-tag cr-status-tag--rejected">Uang Stay di Mitra (Hangus)</div></div>`;
    }

    const isRefundable = (item.status === 'refunded' || item.status === 'pending' || Number(item.refund_amount) > 0);
    const refundDisplayVal = isRefundable ? formatRupiah(item.refund_amount || item.total_price) : 'Rp. 0 (Hangus)';
    const refundColor = isRefundable ? '#10b981' : '#ef4444';

    const cardHtml = `
          <div class="cr-card" id="card-${item.id}">
            <div class="cr-card__header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div class="cr-title-row" style="display: flex; align-items: center; gap: 8px;">
                <span class="cr-card__venue" style="font-size: 14px; font-weight: 600; margin: 0;">${item.studio_name}</span>
                ${badgeHtml}
              </div>
              <div class="cr-customer-name" style="font-size: 13px; color: #374151;">Pelanggan: <strong>${item.customer_name}</strong></div>
            </div>

            <div class="cr-order-id" style="font-size: 12px; color: #6b7280; margin: 0 0 16px 0;">
              ID Booking: #${item.booking_id} • <span style="font-weight: 400; color: #555;">Diajukan: ${reqDate}</span>
            </div>

            <div class="cr-info-grid">
              <div class="cr-info-item">
                <span class="cr-label">Tanggal Reservasi</span>
                <span class="cr-value">${resDate}</span>
              </div>
              <div class="cr-info-item">
                <span class="cr-label">Total Harga</span>
                <span class="cr-value">${formatRupiah(item.total_price)}</span>
              </div>
              <div class="cr-info-item">
                <span class="cr-label">Jumlah Refund</span>
                <span class="cr-value" style="color: ${refundColor}">
                    ${refundDisplayVal}
                </span>
              </div>
            </div>

            <div class="cr-reason">
              <span class="cr-reason__label">Alasan Pembatalan:</span>
              <span class="cr-reason__text">${item.reason || '-'}</span>
            </div>
            
            ${policyNote}
            
            ${(item.bank_name || item.bankName || item.account_number || item.accountNumber || item.account_name || item.accountName) ? `
            <div class="cr-bank-details" style="background: #f0fdf4; border: 1px dashed #10b981; border-radius: 10px; padding: 14px; margin-top: 16px;">
              <div style="font-size: 12px; font-weight: 700; color: #065f46; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>🏦</span> DATA REKENING / E-WALLET PENGEMBALIAN (REFUND)
              </div>
              <div style="font-size: 13px; color: #047857; line-height: 1.6;">
                <div><b>Nama Bank / E-Wallet:</b> ${item.bank_name || item.bankName || '-'}</div>
                <div><b>No. Rekening / HP:</b> ${item.account_number || item.accountNumber || '-'}</div>
              </div>
            </div>` : ''}

            ${actionsHtml}
            ${statusTag}
          </div>
        `;

    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function filterData(status, tabElement) {
  document.querySelectorAll('.cr-tab').forEach(t => t.classList.remove('cr-tab--active'));
  tabElement.classList.add('cr-tab--active');

  let filteredData;
  if (status === 'all') {
    filteredData = window.allCancellations;
  } else if (status === 'refunded') {
    filteredData = window.allCancellations.filter(item => item.status === 'refunded' || item.status === 'rejected_by_policy');
  } else {
    filteredData = window.allCancellations.filter(item => item.status === status);
  }
  renderList(filteredData);
}

async function handleAction(id, newStatus) {
  if (!confirm(`Konfirmasi bahwa refund telah diproses ke rekening pelanggan?`)) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';

  const sendStatusUpdate = async (formData = null) => {
    try {
      let res;
      if (formData) {
        res = await fetch(`${API_BASE_URL}/cancellations/${id}/status`, {
          method: 'PATCH',
          body: formData
        });
      } else {
        res = await fetch(`${API_BASE_URL}/cancellations/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }

      if (res.ok) {
        alert("Status refund berhasil dikonfirmasi!");
        fetchCancellations(JSON.parse(localStorage.getItem("currentUser")).id);
      }
    } catch (err) {
      alert("Gagal memperbarui status");
    }
  };

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('proof_refund', file);
      await sendStatusUpdate(formData);
    } else {
      await sendStatusUpdate();
    }
  };

  const wantUpload = confirm("Apakah Anda ingin sekaligus mengunggah bukti foto transfer refund?");
  if (wantUpload) {
    fileInput.click();
  } else {
    await sendStatusUpdate();
  }
}
