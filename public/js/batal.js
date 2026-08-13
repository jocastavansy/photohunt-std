document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId") || params.get("id"); // Mendukung kedua param

    const alasanInput = document.querySelector("#alasanInput");
    const bankNameInput = document.querySelector("#bankName");
    const accountNumberInput = document.querySelector("#accountNumber");
    const accountNameInput = document.querySelector("#accountName");
    const cancelBtn = document.querySelector(".cancel-btn");
    const backBtn = document.querySelector(".back-btn");

    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            console.log("Back button clicked, bookingId:", bookingId);
            if (bookingId) {
                window.location.href = `pemesanan.html?bookingId=${bookingId}`;
            } else {
                window.location.href = "history.html";
            }
        };
    }

    // Validasi tombol: alasan dan rekening wajib diisi
    const validateForm = () => {
        if (!alasanInput || !bankNameInput || !accountNumberInput || !accountNameInput || !cancelBtn) return;

        const isAlasanFilled = alasanInput.value.trim().length > 0;
        const isBankFilled = bankNameInput.value.trim().length > 0;
        const isAccNumberFilled = accountNumberInput.value.trim().length > 0;
        const isAccNameFilled = accountNameInput.value.trim().length > 0;

        cancelBtn.disabled = !(isAlasanFilled && isBankFilled && isAccNumberFilled && isAccNameFilled);
    };

    if (alasanInput && bankNameInput && accountNumberInput && accountNameInput) {
        [alasanInput, bankNameInput, accountNumberInput, accountNameInput].forEach(el => {
            el.addEventListener("input", validateForm);
        });
    }

    if (cancelBtn) {
        cancelBtn.onclick = async (e) => {
            e.preventDefault();
            if (!bookingId) {
                alert("ID Reservasi tidak valid. Mohon kembali ke halaman sebelumnya.");
                return;
            }

            const dataPembatalan = {
                reason: alasanInput.value.trim(),
                bank_name: bankNameInput.value.trim(),
                account_number: accountNumberInput.value.trim(),
                account_name: accountNameInput.value.trim()
            };

            cancelBtn.innerHTML = "Memproses...";
            cancelBtn.disabled = true;

            try {
                const API_BASE_URL =
                    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                        ? window.location.origin
                        : (window.location.hostname.includes("netlify.app")
                            ? "https://photohunt-v2-production.up.railway.app"
                            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                                : window.location.origin));

                const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataPembatalan)
                });

                const result = await res.json();

                if (result.success) {
                    alert(result.message);
                    window.location.href = "history.html";
                } else {
                    throw new Error(result.message);
                }
            } catch (err) {
                console.error(err);
                alert("Gagal memproses pembatalan: " + err.message);
                cancelBtn.innerHTML = "BATALKAN PESANAN";
                cancelBtn.disabled = false;
            }
        };
    }
});
