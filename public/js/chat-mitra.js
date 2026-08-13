const API_BASE_URL =
  window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
    ? window.location.origin
    : (window.location.hostname.includes("netlify.app")
        ? "https://photohunt-v2-production.up.railway.app"
        : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
            : window.location.origin));
const socket = io(API_BASE_URL);

/* =====================
   1. AUTH CHECK
===================== */
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "../login.html";
  throw new Error("Belum login");
}

if (currentUser.role !== "mitra") {
  window.location.href = "../customer-app.html";
  throw new Error("Bukan mitra");
}

const myId = currentUser.id;

/* =====================
   2. DOM ELEMENTS
===================== */
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

let currentCustomerId = null;
let ROOM_ID = null;

/* =====================
   3. INITIALIZATION & LISTENERS
===================== */
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Setup Tombol Navigasi (Back)
  setupNavigationButtons();

  // 2. Load Sidebar
  await loadSidebarHistory();

  // 3. Cek URL Booking ID (Auto Open)
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');

  if (bookingId) {
    initChatFromBooking(bookingId);
  }

  // 4. Fetch Fresh Profile (agar foto profil terbaru muncul)
  await fetchCurrentUserProfile();

  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
});

let myProfileData = { ...currentUser };

async function fetchCurrentUserProfile() {
  try {
    // 1. Fetch User Data
    const resUser = await fetch(`${API_BASE_URL}/users/${myId}`);
    if (resUser.ok) {
      const data = await resUser.json();
      myProfileData = data;
    }

    // 2. Fetch Studio Data (untuk ambil Logo Toko)
    const resStudio = await fetch(`${API_BASE_URL}/mitra/${myId}/studio-detail`);
    if (resStudio.ok) {
      const studioData = await resStudio.json();
      if (studioData.exists && studioData.data && studioData.data.logo) {
        // OVERRIDE image dengan logo studio untuk chat bubble
        myProfileData.image = "studios/" + studioData.data.logo;
        console.log("Using Studio Logo for Chat:", myProfileData.image);
      }
    }
  } catch (e) {
    console.error("Gagal load profile/studio:", e);
  }
}

function setupNavigationButtons() {
  // Tombol Back ke Dashboard (Desktop Header)
  const dashboardBackBtn = document.querySelector(".back-link");
  if (dashboardBackBtn) {
    dashboardBackBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = "mitra-dashboard.html";
    };
  }

  // Tombol Back dari Chat Room ke List (Mobile Header)
  if (mobileBackBtn) {
    mobileBackBtn.onclick = () => {
      // Hapus class agar Sidebar muncul kembali
      if (chatContainerMain) chatContainerMain.classList.remove('mobile-view-active');

      // Hapus highlight visual pada item sidebar
      document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
      currentCustomerId = null;
    };
  }
}

/* =====================
   4. LOGIC: OPEN CHAT
===================== */
async function openChat(customerId, customerName, customerImage) {
  currentCustomerId = customerId;

  // [LOGIKA UI MOBILE] Pindah layar ke Chat Room
  if (chatContainerMain) {
    chatContainerMain.classList.add('mobile-view-active');
  }

  // [VISUAL] Highlight item sidebar aktif
  updateActiveSidebarItem(customerId);

  // UI Setup
  if (emptyState) emptyState.style.display = "none";
  if (chatRoom) chatRoom.style.display = "flex";

  headerName.textContent = customerName;

  // Set Header Avatar
  headerAvatar.innerHTML = "";
  headerAvatar.style.backgroundImage = "none";

  if (customerImage) {
    const bgUrl = customerImage.startsWith("http") ? customerImage : `${API_BASE_URL}/images/users/${customerImage}`;
    headerAvatar.style.backgroundImage = `url('${bgUrl}')`;
  } else {
    headerAvatar.style.backgroundColor = "#ddd";
    headerAvatar.innerText = customerName.charAt(0).toUpperCase();
  }

  // Socket Room Setup
  const ids = [myId, customerId].sort((a, b) => a - b);
  ROOM_ID = `room_${ids[0]}_${ids[1]}`;

  msgsContainer.innerHTML = '';

  socket.emit("join_room", ROOM_ID);
  await loadMessages();
  markAsRead(customerId);
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

// Helper: Highlight Sidebar
function updateActiveSidebarItem(activeId) {
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.id == activeId) item.classList.add('active');
  });
}

/* =====================
   5. AUTO OPEN FROM BOOKING
===================== */
async function initChatFromBooking(bookingId) {
  try {
    const res = await fetch(`${API_BASE_URL}/mitra/bookings/${myId}`);
    if (!res.ok) throw new Error("Gagal fetch data booking");

    const data = await res.json();
    const booking = data.find(item => item.id == bookingId);

    if (booking) {
      const cId = booking.customer_id || booking.user_id;
      const cName = booking.customer_name;
      const cImage = booking.customer_image || booking.user_image || null;

      if (cId) {
        openChat(cId, cName, cImage);
      }
    }
  } catch (err) {
    console.error("Error auto-opening chat:", err);
  }
}

/* =====================
   6. LOAD SIDEBAR HISTORY
===================== */
async function loadSidebarHistory() {
  try {
    const res = await fetch(`${API_BASE_URL}/chats/history/${myId}`);
    const chats = await res.json();

    chatList.innerHTML = "";

    if (!chats.length) {
      chatList.innerHTML = `<div style="padding:16px;text-align:center; color:#888;">Belum ada pesan</div>`;
      return;
    }

    chats.forEach(c => {
      const div = document.createElement("div");
      div.className = "chat-item";
      div.setAttribute("data-id", c.partner_id);

      div.onclick = () => openChat(c.partner_id, c.partner_name, c.partner_image);

      let avatarHTML = "";
      if (c.partner_image) {
        const bgUrl = c.partner_image.startsWith("http") ? c.partner_image : `${API_BASE_URL}/images/users/${c.partner_image}`;
        avatarHTML = `<div class="avatar" style="background-image: url('${bgUrl}');"></div>`;
      } else {
        avatarHTML = `<div class="avatar" style="background-color: #ddd;">${c.partner_name.charAt(0).toUpperCase()}</div>`;
      }

      div.innerHTML = `
          ${avatarHTML}
          <div class="chat-info">
            <div class="chat-name">${c.partner_name}</div>
            <div class="chat-preview">${c.last_message || ""}</div>
          </div>
        `;
      chatList.appendChild(div);
    });
  } catch (err) {
    console.error("Error sidebar:", err);
  }
}

/* =====================
   7. LOAD MESSAGES (WITH TIMESTAMP)
===================== */
async function loadMessages() {
  msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Memuat...</div>`;

  try {
    const res = await fetch(`${API_BASE_URL}/chats?user1=${myId}&user2=${currentCustomerId}`);
    const msgs = await res.json();
    msgsContainer.innerHTML = "";

    if (!msgs.length) {
      msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Mulai obrolan baru 👋</div>`;
      return;
    }

    msgs.forEach(m => {
      const type = m.sender_id === myId ? "sent" : "received";
      addBubble(m.message, type, m.created_at, m.sender_image);
    });

    scrollBottom();
  } catch (err) {
    msgsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:red;">Gagal memuat</div>`;
  }
}

/* =====================
   8. SEND MESSAGE (WITH TIMESTAMP)
===================== */
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  const timestamp = new Date().toISOString();

  // Optimistic UI Update
  const senderImg = myProfileData.image || currentUser.image;
  addBubble(text, "sent", timestamp, senderImg);

  msgInput.value = "";
  scrollBottom();

  // Emit Socket
  socket.emit("send_message", {
    room: ROOM_ID,
    sender_id: myId,
    receiver_id: currentCustomerId,
    message: text,
    timestamp: timestamp,
    sender_image: senderImg
  });

  // Save DB
  fetch(`${API_BASE_URL}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender_id: myId,
      receiver_id: currentCustomerId,
      message: text
    })
  });
}

socket.on("receive_message", data => {
  const sId = String(data.sender_id);
  const rId = String(data.receiver_id);
  const pId = String(currentCustomerId);
  const mId = String(myId);

  if ((sId === pId && rId === mId) || (sId === mId && rId === pId)) {
    if (sId === pId) {
      addBubble(data.message, "received", data.timestamp || data.created_at, data.sender_image);
      scrollBottom();
      markAsRead(currentCustomerId);
    }
  }
  loadSidebarHistory();
});

socket.on("new_message", data => {
  loadSidebarHistory();
});

/* =====================
   10. HELPER FUNCTIONS
===================== */
function addBubble(text, type, timestamp, imageUrl) {
  const div = document.createElement("div");
  div.className = `bubble ${type}`;

  div.innerHTML = `
      <div class="bubble-content">
        <div class="message-text">${escapeHtml(text)}</div>
        <div class="message-time">${formatTime(timestamp)}</div>
      </div>
  `;
  msgsContainer.appendChild(div);
}

function scrollBottom() {
  setTimeout(() => msgsContainer.scrollTop = msgsContainer.scrollHeight, 100);
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

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

if (msgInput) {
  msgInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
}