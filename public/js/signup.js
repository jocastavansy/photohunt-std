document.addEventListener("DOMContentLoaded", () => {
  // 1. AMBIL ROLE DARI URL (YANG DIKIRIM DARI LOGIN)
  const params = new URLSearchParams(window.location.search);

  // PERBAIKAN 1: Defaultnya harus 'customer', JANGAN 'pengguna'
  // Biar cocok sama Database & Logic Login
  let role = params.get("role");

  // Jaga-jaga kalau url nya aneh, kita paksa pilih salah satu
  if (role !== "mitra" && role !== "customer") {
    role = "customer";
  }

  console.log("System Check: User akan mendaftar sebagai ->", role);

  const btnBack = document.getElementById("btnBack");
  const btnContinue = document.getElementById("btnContinue");

  const inputName = document.getElementById("inputName");
  const inputPhone = document.getElementById("inputPhone");
  const inputEmail = document.getElementById("inputEmail");
  const inputPassword = document.getElementById("inputPassword");

  const genderFemale = document.getElementById("genderFemale");
  const genderMale = document.getElementById("genderMale");

  let selectedGender = null;

  // Logic Tombol Kembali
  btnBack.onclick = () => {
    window.location.href = "login.html";
  };

  // Logic Pilih Gender
  genderFemale.onclick = () => {
    selectedGender = "female";
    genderFemale.classList.add("gender-active");
    genderMale.classList.remove("gender-active");
  };

  genderMale.onclick = () => {
    selectedGender = "male";
    genderMale.classList.add("gender-active");
    genderFemale.classList.remove("gender-active");
  };

  // Logic Tombol Lanjut (SUBMIT)
  btnContinue.onclick = async () => {
    const name = inputName.value.trim();
    const phone = inputPhone.value.trim();
    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();

    // Validasi Input Kosong
    if (!name || !phone || !email || !password || !selectedGender) {
      alert("Mohon lengkapi semua data (Nama, HP, Email, Password, Gender).");
      return;
    }

    try {
      // PERBAIKAN 2: Pakai Relative Path (auto detect host)
      const API_BASE_URL =
        window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
          ? window.location.origin
          : (window.location.hostname.includes("netlify.app")
              ? "https://photohunt-v2-production.up.railway.app"
              : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                  ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                  : window.location.origin));

      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,           // Nilainya 'mitra' atau 'customer' (aman)
          phone,          // Pastikan kolom 'phone' SUDAH DITAMBAH di Database phpMyAdmin tadi
          gender: selectedGender
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Gagal membuat akun (Email mungkin sudah dipakai)");
        return;
      }

      alert(`Sukses! Akun ${role} berhasil dibuat. Silakan Login.`);
      window.location.href = "login.html";

    } catch (err) {
      console.error(err);
      alert("Gagal connect ke Server. Pastikan backend hidup (node server.js)");
    }
  };
});