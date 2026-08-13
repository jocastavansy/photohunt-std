      let selectedAccountName = null;

      document.addEventListener("DOMContentLoaded", () => {
        const params = new URLSearchParams(window.location.search);
        const role = params.get("role") || "pengguna";

        const btnBack = document.getElementById("btnBack");
        const btnUseAnother = document.getElementById("btnUseAnother");
        const btnContinue = document.getElementById("btnGoogleContinue");

        btnBack.onclick = () => {
          window.location.href = "login.html";
        };

        btnUseAnother.onclick = () => {
          alert("Redirecting to 'Use Another Account' form...");
        };

        btnContinue.onclick = () => {
          if (!selectedAccountName) {
            alert("Silakan pilih salah satu akun dari daftar.");
            return;
          }
          alert(`Melanjutkan dengan akun: ${selectedAccountName} (${role})`);
          window.location.href = "beranda.html";
        };
      });

      function selectAccount(element, name) {
        const cards = document.querySelectorAll(".phlu-account-card");
        cards.forEach((card) => card.classList.remove("selected"));

        element.classList.add("selected");
        selectedAccountName = name;

        console.log(`Account selected: ${name}`);
      }
