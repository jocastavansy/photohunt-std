const API_BASE_URL =
    window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

document.addEventListener("DOMContentLoaded", () => {
    // 1. Ambil Element HTML
    const emailInput = document.getElementById("phluEmail");
    const passwordInput = document.getElementById("phluPassword");
    const loginBtn = document.getElementById("phluLoginBtn");
    const signupBtn = document.querySelector(".phlu-signup-btn");

    const roleUserBtn = document.getElementById("phluRoleUser");
    const roleMitraBtn = document.getElementById("phluRoleMitra");

    // 2. LOGIKA PILIH ROLE (WAJIB DIPILIH)
    let selectedRole = null;

    function resetButtons() {
        if (roleUserBtn) roleUserBtn.classList.remove("role-active");
        if (roleMitraBtn) roleMitraBtn.classList.remove("role-active");
    }

    // === A. Klik Tombol PENGGUNA ===
    if (roleUserBtn) {
        roleUserBtn.addEventListener("click", () => {
            selectedRole = "customer";
            resetButtons();
            roleUserBtn.classList.add("role-active");
            console.log("Role dipilih: CUSTOMER");
        });
    }

    // === B. Klik Tombol MITRA ===
    if (roleMitraBtn) {
        roleMitraBtn.addEventListener("click", () => {
            selectedRole = "mitra";
            resetButtons();
            roleMitraBtn.classList.add("role-active");
            console.log("Role dipilih: MITRA");
        });
    }

    // === C. Klik Tombol SIGN UP ===
    if (signupBtn) {
        signupBtn.addEventListener("click", (e) => {
            e.preventDefault();

            // CEK 1: Apakah user sudah pilih role?
            if (!selectedRole) {
                alert("Wajib pilih salah satu: Apakah kamu 'Customer' atau 'Mitra'?");
                return;
            }

            console.log("Mengarahkan ke signup sebagai:", selectedRole);
            window.location.href = `signup.html?role=${selectedRole}`;
        });
    }

    // === D. Klik Tombol LOGIN ===
    if (loginBtn) {
        loginBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            // CEK 1: User udah pilih role belum?
            if (!selectedRole) {
                alert("Kamu mau login sebagai apa? Silakan klik tombol 'Pengguna' atau 'Mitra' di atas.");
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                alert("Email dan password wajib diisi");
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || "Login gagal! Periksa email/password.");
                }

                const user = await res.json();

                // CEK 2: APAKAH DATABASE KOSONG? (Pencegahan Error)
                if (!user.role) {
                    alert("Akun ini datanya tidak lengkap (Role Kosong). Hubungi admin.");
                    return;
                }

                // CEK 3: VALIDASI ROLE (Penting!)
                if (user.role !== selectedRole) {
                    alert(`Gagal Masuk! Akun ini terdaftar sebagai "${user.role.toUpperCase()}", tapi kamu menekan tombol "${selectedRole.toUpperCase()}".`);
                    return;
                }


                localStorage.setItem("currentUser", JSON.stringify(user));
                localStorage.setItem("authToken", user.id);

                alert(`Login Berhasil sebagai ${selectedRole}!`);

                if (selectedRole === "mitra") {
                    try {
                        const check = await fetch(
                            `${API_BASE_URL}/mitra/${user.id}/has-studio`
                        );
                        const { hasStudio } = await check.json();
                        window.location.href = hasStudio ? "mitra/mitra-dashboard.html" : "mitra/daftar-studio.html";
                    } catch (innerErr) {
                        window.location.href = "mitra/mitra-dashboard.html";
                    }
                } else {
                    // === Start Feature: GPS Location ===
                    handleLocationAndRedirect(loginBtn);
                }

            } catch (err) {
                console.error("Error:", err);
                alert(err.message || "Gagal terhubung ke server");
                // Reset button on error
                loginBtn.disabled = false;
                loginBtn.textContent = "Masuk";
            }
        });
    }

    // === E. Klik Tombol GOOGLE ===
    const googleBtn = document.querySelector(".phlu-google");
    if (googleBtn) {
        googleBtn.style.cursor = "pointer";
        googleBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (!selectedRole) {
                alert("Kamu mau login sebagai apa? Silakan klik tombol 'Customer' atau 'Mitra' di atas.");
                return;
            }
            await handleGoogleSignIn(selectedRole, googleBtn);
        });
    }

    async function handleGoogleSignIn(role, btnElement) {
        try {
            let googleClientId = "";
            try {
                const configRes = await fetch(`${API_BASE_URL}/api/auth/google/config`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    googleClientId = configData.googleClientId;
                }
            } catch (cErr) {
                console.warn("Google config error:", cErr);
            }

            async function authenticateWithBackend(userData) {
                const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...userData, role })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || "Gagal autentikasi Google");
                }

                const user = await res.json();
                if (!user.role) {
                    alert("Akun ini datanya tidak lengkap. Hubungi admin.");
                    return;
                }

                localStorage.setItem("currentUser", JSON.stringify(user));
                localStorage.setItem("authToken", user.id);

                alert(`Login Berhasil dengan Google sebagai ${user.role.toUpperCase()}!`);

                if (user.role === "mitra") {
                    try {
                        const check = await fetch(`${API_BASE_URL}/mitra/${user.id}/has-studio`);
                        const { hasStudio } = await check.json();
                        window.location.href = hasStudio ? "mitra/mitra-dashboard.html" : "mitra/daftar-studio.html";
                    } catch (innerErr) {
                        window.location.href = "mitra/mitra-dashboard.html";
                    }
                } else {
                    handleLocationAndRedirect(btnElement);
                }
            }

            if (googleClientId && window.google && window.google.accounts && window.google.accounts.id) {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response) => {
                        try {
                            await authenticateWithBackend({ credential: response.credential });
                        } catch (err) {
                            alert(err.message || "Gagal masuk dengan Google");
                        }
                    }
                });
                window.google.accounts.id.prompt();
                return;
            }

            const promptEmail = prompt("Sign in with Google:\nMasukkan alamat email Google Anda:");
            if (!promptEmail || !promptEmail.trim()) return;

            const cleanEmail = promptEmail.trim();
            const promptName = cleanEmail.split("@")[0];
            await authenticateWithBackend({
                email: cleanEmail,
                name: promptName,
                googleId: "google_" + Date.now()
            });

        } catch (err) {
            console.error("Google Auth Error:", err);
            alert(err.message || "Terjadi kesalahan saat masuk dengan Google");
        }
    }

    // === Helper Function: GPS & Redirect ===
    function handleLocationAndRedirect(btnElement) {
        if (btnElement) {
            btnElement.disabled = true;
            btnElement.textContent = "Mendeteksi Lokasi...";
        }

        if (!navigator.geolocation) {
            // Browser gak support -> langsung redirect
            window.location.href = "customer-app.html";
            return;
        }

        const gpsOptions = {
            enableHighAccuracy: false, // false biar lebih cepat
            timeout: 5000,             // MAKSIMAL TUNGGU 5 DETIK
            maximumAge: 30000          // Boleh pakai cache 30 detik terakhir
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Update UI text
                    if (btnElement) btnElement.textContent = "Memproses...";

                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

                    const response = await fetch(url, {
                        headers: { "User-Agent": "PhotoHunt-App/1.0" }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const addr = data.address || {};
                        const detectedCity = addr.city || addr.town || addr.county || addr.state_district || addr.region || "";

                        if (detectedCity) {
                            const lowerCity = detectedCity.toLowerCase();
                            let targetCity = lowerCity.replace(/kota|kabupaten/gi, "").trim();

                            if (lowerCity.includes("jakarta")) targetCity = "jakarta";
                            else if (lowerCity.includes("tangerang")) targetCity = "tangerang";
                            else if (lowerCity.includes("depok")) targetCity = "depok";
                            else if (lowerCity.includes("bekasi") || lowerCity.includes("cikarang")) targetCity = "bekasi";
                            else if (lowerCity.includes("bandung")) targetCity = "bandung";
                            else if (lowerCity.includes("bogor")) targetCity = "bogor";

                            if (targetCity) {
                                localStorage.setItem("userCity", targetCity);
                                localStorage.setItem("customerCity", targetCity);
                            }
                        }
                    }
                } catch (geoErr) {
                    console.error("Gagal reverse geocoding:", geoErr);
                } finally {
                    window.location.href = "customer-app.html";
                }
            },
            (error) => {
                console.warn("Gagal/Timeout ambil GPS:", error.message);
                // User tolak / Error / Timeout -> masuk app pake default
                window.location.href = "customer-app.html";
            },
            gpsOptions // <--- PENTING: Masukkan options
        );
    }
});