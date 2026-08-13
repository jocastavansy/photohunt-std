// =====================
// 1. SOCKET CONFIG
// =====================
const PAGE_TYPE = document.body.dataset.page;
const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));
const socket = io(API_BASE_URL);
// =====================
// 2. AUTH USER CHECK (VERSI ANTI-ERROR)
// =====================
const storedData = localStorage.getItem("currentUser");
const rawUser = storedData ? JSON.parse(storedData) : null;

// Normalisasi data (jaga-jaga kalau datanya ada di dalam properti .data)
// Normalisasi data (jaga-jaga kalau datanya ada di dalam properti .data)
const currentUser = rawUser?.data || rawUser || {}; // Default object kosong agar tidak null
const userRole = (currentUser?.role || "").toLowerCase();

// REMOVED: Strict auth check
// if (!currentUser || userRole !== "customer") { ... }

const myId = currentUser.id || 0; // Default ID 0/null safe
const myName = currentUser.name || "Guest";

// =====================
// 3. URL PARAMETERS
// =====================
const params = new URLSearchParams(window.location.search);
let currentPartnerId = params.get("partner_id");
let currentPartnerName = params.get("partner_name") ? decodeURIComponent(params.get("partner_name")) : "Chat";
let currentPartnerLogo = params.get("partner_logo") || null;

// =====================
// 4. DOM ELEMENTS
// =====================
const chatContainerMain = document.getElementById("chatContainerMain");
const mobileBackBtn = document.getElementById("mobile-back-btn");

const emptyState = document.getElementById("emptyState");
const chatRoom = document.getElementById("chatRoom");
const chatList = document.getElementById("chatList");
const headerName = document.getElementById("headerName");
const headerAvatar = document.getElementById("headerAvatar");
const msgInput = document.getElementById("msgInput");
const msgsContainer = document.getElementById("messagesContainer");
const sendBtn = document.getElementById("sendBtn");

let ROOM_ID = null;

// =====================
// 5. INITIALIZATION
// =====================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Chat app initialized for:", myName);

    // SETUP TOMBOL NAVIGASI (BACK)
    setupNavigationButtons();

    await loadSidebarHistory();

    if (currentPartnerId) {
        openChat(currentPartnerId, currentPartnerName, currentPartnerLogo);
    }

    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
});

function setupNavigationButtons() {
    // 1. Back ke Halaman Utama (Desktop)
    const dashboardBackBtn = document.querySelector(".back-link");
    if (dashboardBackBtn) {
        dashboardBackBtn.onclick = (e) => {
            e.preventDefault();
            window.history.back();
        };
    }

    // 2. Back dari Chat Room ke List (Mobile)
    if (mobileBackBtn) {
        mobileBackBtn.onclick = () => {
            if (chatContainerMain) chatContainerMain.classList.remove('mobile-view-active');
            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
        };
    }
}

// =====================
// 6. VIEW CONTROLLERS
// =====================
function hideEmptyState() {
    if (emptyState) emptyState.style.display = "none";
    if (chatRoom) chatRoom.style.display = "flex";
}

// =====================
// 7. OPEN CHAT ROOM
// =====================
async function openChat(partnerId, partnerName, partnerLogo = null) {
    currentPartnerId = partnerId;
    currentPartnerName = partnerName || "Mitra";
    currentPartnerLogo = partnerLogo;

    // Logika Mobile View
    if (chatContainerMain) {
        chatContainerMain.classList.add('mobile-view-active');
    }

    hideEmptyState();

    // Update Header
    if (headerName) headerName.innerText = currentPartnerName;

    if (headerAvatar) {
        headerAvatar.innerHTML = "";
        headerAvatar.style.backgroundImage = "none";

        if (partnerLogo && partnerLogo !== "null") {
            headerAvatar.style.backgroundImage = `url('/images/studios/${partnerLogo}')`;
        } else {
            headerAvatar.style.backgroundColor = "#ddd";
            headerAvatar.innerText = getInitials(currentPartnerName);
        }
    }

    // Join Room Socket
    const ids = [myId, partnerId].sort((a, b) => a - b);
    ROOM_ID = `room_${ids[0]}_${ids[1]}`;

    socket.emit("join_room", ROOM_ID);

    updateActiveChatInSidebar(partnerId);
    await loadMessages();
    markAsRead(partnerId);

    // Auto focus hanya di desktop
    if (window.innerWidth > 768 && msgInput) msgInput.focus();
}

async function markAsRead(partnerId) {
    if (!myId || !partnerId) return;
    try {
        await fetch(`${API_BASE_URL}/chats/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: myId, partner_id: partnerId })
        });
        const notifDot = document.getElementById("chat-notif-dot");
        if (notifDot) {
            notifDot.style.display = "none";
            notifDot.classList.remove("pulse-animation");
        }
    } catch (e) {
        console.error("Mark read error:", e);
    }
}

// =====================
// 8. SIDEBAR HISTORY
// =====================
async function loadSidebarHistory() {
    try {
        const res = await fetch(`${API_BASE_URL}/chats/history/${myId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const chats = await res.json();

        if (!chatList) return;
        chatList.innerHTML = "";

        if (!chats || chats.length === 0) {
            chatList.innerHTML = `<div style="padding:16px;opacity:.6;text-align:center">Belum ada percakapan</div>`;
            return;
        }

        chats.forEach(chat => {
            const div = document.createElement("div");
            div.className = "chat-item";
            div.setAttribute('data-partner-id', chat.partner_id);

            const pName = chat.partner_name || "Unknown";
            const pId = chat.partner_id;
            const pLogo = chat.partner_logo;

            let avatarHtml;
            if (pLogo) {
                avatarHtml = `<div class="avatar" style="background-image: url('/images/studios/${pLogo}');"></div>`;
            } else {
                avatarHtml = `<div class="avatar" style="background-color: #ddd;">${getInitials(pName)}</div>`;
            }

            div.innerHTML = `
                ${avatarHtml}
                <div class="chat-info">
                    <div class="chat-name">${pName}</div>
                    <div class="chat-preview">${truncateText(chat.last_message || "Belum ada pesan", 25)}</div>
                </div>
            `;

            div.onclick = () => {
                const newUrl = `chat.html?partner_id=${pId}&partner_name=${encodeURIComponent(pName)}&partner_logo=${pLogo}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                openChat(pId, pName, pLogo);
            };

            chatList.appendChild(div);
        });

    } catch (err) {
        console.error("Gagal load history", err);
    }
}

// =====================
// 9. LOAD MESSAGES
// =====================
async function loadMessages() {
    if (!msgsContainer) return;
    msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Memuat chat...</div>`;

    try {
        const res = await fetch(`${API_BASE_URL}/chats?user1=${myId}&user2=${currentPartnerId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const msgs = await res.json();
        msgsContainer.innerHTML = "";

        if (!msgs || msgs.length === 0) {
            msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#888;margin-top:20px;">Mulai obrolan dengan ${currentPartnerName} 👋</div>`;
            return;
        }

        msgs.forEach(msg => {
            const type = msg.sender_id == myId ? "sent" : "received";
            addBubble(msg.message, type, msg.created_at);
        });

        scrollBottom();

    } catch (err) {
        msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:red;">Gagal memuat chat</div>`;
    }
}

// =====================
// 10. SEND MESSAGE
// =====================
function sendMessage() {
    if (!msgInput) return;
    const text = msgInput.value.trim();
    if (!text || !currentPartnerId) return;

    const timestamp = new Date().toISOString();

    // UI Optimistic Update
    addBubble(text, "sent", timestamp);
    msgInput.value = "";
    scrollBottom();

    // Socket Emit
    socket.emit("send_message", {
        room: ROOM_ID,
        sender_id: myId,
        receiver_id: currentPartnerId,
        message: text,
        timestamp: timestamp
    });

    saveMessageToDB(text);
}

async function saveMessageToDB(message) {
    try {
        await fetch(`${API_BASE_URL}/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender_id: myId,
                receiver_id: currentPartnerId,
                message: message
            })
        });
    } catch (err) {
        console.error("Error Save DB:", err);
    }
}

// =====================
// 11. SOCKET LISTENERS
// =====================
socket.on("receive_message", data => {
    const sId = String(data.sender_id);
    const rId = String(data.receiver_id);
    const pId = String(currentPartnerId);
    const mId = String(myId);

    if ((sId === pId && rId === mId) || (sId === mId && rId === pId)) {
        if (sId === pId) {
            addBubble(data.message, "received", data.timestamp || data.created_at);
            scrollBottom();
            markAsRead(currentPartnerId);
        }
    }
    loadSidebarHistory();
});

socket.on("new_message", data => {
    loadSidebarHistory();
});

socket.on("connect", () => {
    if (ROOM_ID) socket.emit("join_room", ROOM_ID);
});

// =====================
// 12. HELPER FUNCTIONS
// =====================
function addBubble(text, type, timestamp) {
    if (!msgsContainer) return;
    const div = document.createElement("div");
    div.className = `bubble ${type}`;

    div.innerHTML = `
        <div class="message-text">${escapeHtml(text)}</div>
        <div class="message-time">${formatTime(timestamp)}</div>
    `;
    msgsContainer.appendChild(div);
}

function scrollBottom() {
    if (msgsContainer) setTimeout(() => msgsContainer.scrollTop = msgsContainer.scrollHeight, 100);
}

function formatTime(timestamp) {
    if (!timestamp) return "";
    try {
        let dateStr = timestamp;
        if (typeof timestamp === 'string' && timestamp.indexOf(' ') > 0 && timestamp.indexOf('T') === -1) {
            dateStr = timestamp.replace(' ', 'T');
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
    } catch (e) { return ""; }
}

function getInitials(name) { return (name && typeof name === 'string') ? name.charAt(0).toUpperCase() : "?"; }
function truncateText(text, len) { return text.length <= len ? text : text.substring(0, len) + "..."; }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

function updateActiveChatInSidebar(activeId) {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-partner-id') == activeId) item.classList.add('active');
    });
}

if (msgInput) {
    msgInput.addEventListener("keypress", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
}