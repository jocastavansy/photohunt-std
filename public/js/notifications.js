document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        console.warn("⚠️ Notifikasi dimatikan: Belum login.");
        return;
    }

    console.log(`🔔 Sistem Notifikasi Aktif untuk User ID: ${currentUser.id} (${currentUser.name})`);

    const API_BASE_URL =
        window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
            ? window.location.origin
            : (window.location.hostname.includes("netlify.app")
                ? "https://photohunt-v2-production.up.railway.app"
                : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                    ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                    : window.location.origin));

    const socket = io(API_BASE_URL);
    const notifDot = document.getElementById("chat-notif-dot");
    const notificationSound = new Audio('/audio/notify.mp3');

    function showDot() {
        if (notifDot) {
            notifDot.style.display = "block";
            notifDot.classList.add("pulse-animation");
        } else {
            console.warn("⚠️ Elemen HTML dengan ID 'chat-notif-dot' tidak ditemukan!");
        }
    }

    function hideDot() {
        if (notifDot) {
            notifDot.style.display = "none";
            notifDot.classList.remove("pulse-animation");
        }
    }

    // 1. CEK UNREAD DARI DATABASE (SAAT LOAD)
    try {
        console.log("🔍 Mengecek pesan belum dibaca ke Database...");
        const res = await fetch(`${API_BASE_URL}/chats/unread/${currentUser.id}`);
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        const data = await res.json();
        console.log(`📊 Hasil Cek Database: Ada ${data.total} pesan belum dibaca.`);
        if (data && data.total > 0) {
            showDot();
        } else {
            console.log("⚪ Tidak ada notifikasi baru.");
            hideDot();
        }
    } catch (err) {
        console.error("❌ Gagal mengambil data notifikasi:", err);
    }

    // 2. DENGAR NOTIFIKASI REAL-TIME (SOCKET)
    socket.on("connect", () => {
        console.log("✅ Terhubung ke Socket Server dengan ID:", socket.id);
    });

    socket.on("new_message", (data) => {
        console.log("📨 [SOCKET] Ada pesan masuk!", data);
        if (data.receiver_id == currentUser.id) {
            console.log("✅ Pesan ini untuk SAYA! Menyalakan notifikasi...");
            showDot();
            notificationSound.play().catch(() => console.log("🔊 Audio autoplay diblokir browser"));
        }
    });

    socket.on("unread_cleared", (data) => {
        if (data.user_id == currentUser.id) {
            console.log("🧹 [SOCKET] Unread cleared for current user");
            hideDot();
        }
    });
});