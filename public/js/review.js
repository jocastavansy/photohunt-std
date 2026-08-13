const labels = Array.from(document.querySelectorAll(".stars label"));
const radios = Array.from(document.querySelectorAll(".stars input"));
const review = document.getElementById("review");
const sendBtn = document.getElementById("sendBtn");

// Parse URL Params
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get('bookingId');
const studioId = urlParams.get('studioId');

const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
    alert("Silakan login terlebih dahulu");
    window.location.href = "login.html";
}

if (!bookingId || !studioId) {
    alert("Data booking tidak ditemukan");
    window.location.href = "history.html";
}

function setRating(value) {
    const radio = document.querySelector(`.stars input[value="${value}"]`);
    if (radio) radio.checked = true;

    labels.forEach(lbl => {
        const v = Number(lbl.dataset.value);
        lbl.classList.toggle("active", v <= value);
    });

    updateButton();
}

function getRating() {
    const checked = radios.find(r => r.checked);
    return checked ? Number(checked.value) : 0;
}

function updateButton() {
    const rating = getRating();
    const ok = rating > 0;

    sendBtn.disabled = !ok;
}

labels.forEach(lbl => {
    lbl.addEventListener("click", () => setRating(Number(lbl.dataset.value)));
});

radios.forEach(r => {
    r.addEventListener("change", () => setRating(Number(r.value)));
});

sendBtn.addEventListener("click", async () => {
    const rating = getRating();
    const text = review.value.trim();

    if (rating === 0) return;

    try {
        const API_BASE_URL =
            window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
                ? window.location.origin
                : (window.location.hostname.includes("netlify.app")
                    ? "https://photohunt-v2-production.up.railway.app"
                    : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                        ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                        : window.location.origin));

        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                booking_id: bookingId,
                studio_id: studioId,
                user_id: currentUser.id,
                rating: rating,
                comment: text
            })
        });

        const result = await response.json();

        if (result.success) {
            // alert("Terima kasih atas ulasan Anda!");
            // window.location.href = `detail-studio.html?id=${studioId}`;
            // Atau ke halaman sukses
            window.location.href = "info-rating.html";
        } else {
            alert(result.message || "Gagal mengirim ulasan");
        }

    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat mengirim ulasan");
    }
});
setRating(0);