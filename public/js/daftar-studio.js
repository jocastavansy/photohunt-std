const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || currentUser.role !== "mitra") {
  alert("Session mitra tidak valid. Silakan login ulang.");
  window.location.href = "/login.html";
  throw new Error("INVALID MITRA SESSION");
}

const currentMitraId = currentUser.id;

const STORAGE_KEY = `mitra_form_final_${currentMitraId}`;

let currentStep = 0;
const steps = document.querySelectorAll(".dm-step");
const circles = document.querySelectorAll(".dm-step-circle");
const lines = document.querySelectorAll(".dm-step-line");

function renderStep() {
  steps.forEach((s, i) =>
    s.classList.toggle("active", i === currentStep)
  );
  circles.forEach((c, i) => {
    c.classList.toggle("active", i <= currentStep);
  });
  lines.forEach((l, i) => {
    if (i < lines.length) {
      l.classList.toggle("active", i < currentStep);
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}
function nextStep() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    renderStep();
  }
}
function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}
document.addEventListener("DOMContentLoaded", renderStep);

let selectedStudioImages = [];
const MAX_IMAGES = 10;

function handleNewImages(input) {
  const errorDiv = document.getElementById("image-error");
  errorDiv.style.display = "none";
  const newFiles = Array.from(input.files);

  if (selectedStudioImages.length + newFiles.length > MAX_IMAGES) {
    errorDiv.innerText = `Gagal menambahkan. Maksimal total ${MAX_IMAGES} foto.`;
    errorDiv.style.display = "block";
    input.value = "";
    return;
  }

  newFiles.forEach((file) => {
    selectedStudioImages.push(file);
  });
  input.value = "";
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById("image-preview-container");
  const counter = document.getElementById("image-counter");
  container.innerHTML = "";
  counter.innerText = `${selectedStudioImages.length} / ${MAX_IMAGES} Foto Terpilih`;

  selectedStudioImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.className = "img-preview-wrapper";
      wrapper.innerHTML = `
                  <img src="${e.target.result}" alt="Preview ${index}">
                  <button type="button" class="img-remove-btn" onclick="removeImage(${index})">×</button>
                `;
      container.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(index) {
  selectedStudioImages.splice(index, 1);
  renderImagePreviews();
}

function validateAndNext(btn) {
  const stepEl = btn.closest(".dm-step");
  const fields = stepEl.querySelectorAll(
    "input:not([type=file]), textarea, select"
  );
  let isValid = true;

  for (const f of fields) {
    if (!f.checkValidity()) {
      f.reportValidity();
      isValid = false;
      break;
    }
  }

  if (currentStep === 1 && isValid) {
    const errorDiv = document.getElementById("image-error");
    if (selectedStudioImages.length === 0) {
      errorDiv.innerText = "Wajib mengupload minimal 1 foto studio.";
      errorDiv.style.display = "block";
      document
        .getElementById("image-input-trigger")
        .scrollIntoView({ behavior: "smooth", block: "center" });
      isValid = false;
    } else {
      errorDiv.style.display = "none";
    }
  }

  if (isValid) nextStep();
}

function saveForm() {
  const data = {};
  const form = document.getElementById("form-daftar-mitra");
  const inputs = form.querySelectorAll(
    'input:not([type="file"]), textarea, select'
  );

  inputs.forEach((input) => {
    if (input.name) {
      if (input.type === "radio") {
        if (input.checked) data[input.name] = input.value;
      } else {
        if (input.name.includes("[]")) {
          if (!data[input.name]) data[input.name] = [];
          data[input.name].push(input.value);
        } else {
          data[input.name] = input.value;
        }
      }
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restoreForm() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const form = document.getElementById("form-daftar-mitra");
    Object.keys(data).forEach((k) => {
      const el = form.querySelector(`[name="${k}"]`);
      if (el && el.type !== "radio" && !k.includes("[]")) {
        el.value = data[k];
      }
      if (el && el.type === "radio") {
        const radio = form.querySelector(
          `[name="${k}"][value="${data[k]}"]`
        );
        if (radio) radio.checked = true;
      }
    });
  } catch (e) {
    console.error("Error restoring form", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreForm();
  document
    .getElementById("form-daftar-mitra")
    .addEventListener("input", saveForm);
  document
    .getElementById("form-daftar-mitra")
    .addEventListener("change", saveForm);

  togglePaymentMethods(); // Inisialisasi status pembayaran
});

function addFacility() {
  const container = document.getElementById("facility-container");
  const div = document.createElement("div");
  div.className = "dm-dynamic-row";
  div.innerHTML =
    '<input class="dm-input" name="facilities[]" placeholder="Fasilitas lainnya..." required><button type="button" class="dm-action-btn remove" onclick="this.parentElement.remove(); saveForm()">×</button>';
  container.appendChild(div);
}

// --- LOGIC TOGGLE PEMBAYARAN ---
function togglePaymentMethods() {
  const isBankChecked = document.getElementById("chk_bank").checked;
  const isQrisChecked = document.getElementById("chk_qris").checked;

  const sectionBank = document.getElementById("section-bank");
  const sectionQris = document.getElementById("section-qris");

  // Show/Hide Section
  sectionBank.style.display = isBankChecked ? "block" : "none";
  sectionQris.style.display = isQrisChecked ? "block" : "none";

  // Manage "Required" Attribute (Agar validasi browser jalan otomatis)
  const bankInputs = document.querySelectorAll(".bank-req");
  bankInputs.forEach(input => {
    input.required = isBankChecked;
    if (!isBankChecked) input.value = ""; // Reset nilai kalau di-uncheck
  });

  const qrisInput = document.querySelector(".qris-req");
  if (qrisInput) {
    qrisInput.required = isQrisChecked;
    if (!isQrisChecked) removeQris(); // Reset QRIS kalau di-uncheck
  }
}

function handleQrisUpload(input) {
  const previewContainer = document.getElementById('qris-preview-container');
  const removeBtn = document.getElementById('btn-remove-qris');

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewContainer.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
      removeBtn.style.display = 'block';
    }
    reader.readAsDataURL(input.files[0]);
  }
}

function removeQris() {
  const input = document.getElementById('qris-input');
  const previewContainer = document.getElementById('qris-preview-container');
  const removeBtn = document.getElementById('btn-remove-qris');

  if (input) input.value = '';
  if (previewContainer) previewContainer.innerHTML = '<div class="qris-placeholder">Preview QRIS</div>';
  if (removeBtn) removeBtn.style.display = 'none';
}

function toggleDayClosed(checkbox) {
  const row = checkbox.closest(".dm-schedule-item");
  const openInput = row.querySelector(".schedule-open");
  const closeInput = row.querySelector(".schedule-close");

  if (checkbox.checked) {
    openInput.value = "";
    closeInput.value = "";
    openInput.disabled = true;
    closeInput.disabled = true;
    openInput.removeAttribute("required");
    closeInput.removeAttribute("required");
  } else {
    openInput.disabled = false;
    closeInput.disabled = false;
    if (row.dataset.day === "senin") {
      openInput.setAttribute("required", "required");
      closeInput.setAttribute("required", "required");
    }
  }
  saveForm();
}

function copyMonday() {
  const monClosed = document.querySelector('input[name="schedule[senin][closed]"]').checked;
  const monOpen = document.querySelector('input[name="schedule[senin][open]"]').value;
  const monClose = document.querySelector('input[name="schedule[senin][close]"]').value;

  if (!monClosed && (!monOpen || !monClose)) {
    alert("Harap isi jam buka dan tutup hari Senin terlebih dahulu.");
    return;
  }

  const otherDays = document.querySelectorAll("#other-days .dm-schedule-item");
  otherDays.forEach((dayRow) => {
    const chk = dayRow.querySelector(".schedule-closed");
    chk.checked = monClosed;
    toggleDayClosed(chk);

    if (!monClosed) {
      dayRow.querySelector(".schedule-open").value = monOpen;
      dayRow.querySelector(".schedule-close").value = monClose;
    }
  });
  saveForm();
}

function updateLivePriceRange() {
  const priceInputs = document.querySelectorAll('#packages-container input[name*="[price]"]');
  const validPrices = [];

  priceInputs.forEach(input => {
    const val = Number(input.value);
    if (!isNaN(val) && val > 0) {
      validPrices.push(val);
    }
  });

  const rangeInput = document.getElementById("price_range_input");
  if (!rangeInput) return;

  if (validPrices.length === 0) {
    rangeInput.value = "";
    return;
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  const formatRp = (num) => "Rp " + num.toLocaleString("id-ID");

  if (minPrice === maxPrice) {
    rangeInput.value = formatRp(minPrice);
  } else {
    rangeInput.value = `${formatRp(minPrice)} - ${formatRp(maxPrice)}`;
  }
}

function addPackage() {
  const container = document.getElementById("packages-container");
  const index = container.children.length;
  const div = document.createElement("div");
  div.className = "dm-package-card";
  div.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:10px"><strong>Paket #${index + 1
    }</strong><button type="button" style="color:red; background:none; border:none; cursor:pointer" onclick="this.closest('.dm-package-card').remove(); updateLivePriceRange(); saveForm()">Hapus</button></div>
    
    <div class="dm-field-group"><label class="dm-label">Nama Paket *</label><input class="dm-input" name="packages[${index}][name]" required></div>
    <div class="dm-field-group"><label class="dm-label">Harga Paket (Rp) *</label><input type="number" class="dm-input" name="packages[${index}][price]" oninput="updateLivePriceRange()" required></div>
    <div class="dm-field-group"><label class="dm-label">Deskripsi Paket</label><textarea class="dm-textarea" style="min-height:60px" name="packages[${index}][description]"></textarea></div>
    
    <div class="dm-grid-row">
        <div class="dm-field-group">
            <label class="dm-label">Durasi (Menit) *</label>
            <input type="number" class="dm-input" name="packages[${index}][duration]" placeholder="30" required>
        </div>
        <div class="dm-field-group">
            <label class="dm-label">Jeda (Menit)</label>
            <input type="number" class="dm-input" name="packages[${index}][break]" placeholder="0" value="0">
        </div>
    </div>`;
  container.appendChild(div);
  updateLivePriceRange();
}

async function handleFinalSubmit(e) {
  e.preventDefault();

  // --- VALIDASI TAMBAHAN STEP 6 (Payment) ---
  const isBankChecked = document.getElementById("chk_bank").checked;
  const isQrisChecked = document.getElementById("chk_qris").checked;

  if (!isBankChecked && !isQrisChecked) {
    alert("Mohon pilih minimal satu metode pembayaran (Bank atau QRIS).");
    return; // Stop proses
  }
  // --------------------------------

  const form = document.getElementById("form-daftar-mitra");
  const formData = new FormData(form);
  formData.append("mitra_id", currentMitraId);
  formData.append("mitraId", currentMitraId);
  selectedStudioImages.forEach((file) => {
    formData.append("studio_images[]", file);
  });

  // DEBUG WAJIB (LIAT DI CONSOLE)
  console.log("=== FORM DATA ===");
  for (let pair of formData.entries()) {
    console.log(pair[0], pair[1]);
  }

  // DEBUG CHECK: Pastikan file QRIS terpilih jika checkbox aktif
  if (isQrisChecked) {
    const qrisInput = document.getElementById('qris-input');
    if (qrisInput && qrisInput.files.length === 0) {
      console.warn("User memilih QRIS tapi file belum ter-attach di input (mungkin hanya di preview?)");
    }
  }

  const submitBtn = document.querySelector('.dm-btn-next[type="submit"]');
  submitBtn.innerText = "Mengirim...";
  submitBtn.disabled = true;

  try {
    const API_BASE_URL =
      window.location.hostname.includes("ngrok") || window.location.hostname.includes("railway.app")
        ? window.location.origin
        : (window.location.hostname.includes("netlify.app")
            ? "https://photohunt-v2-production.up.railway.app"
            : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
                ? (window.location.port === "3000" || window.location.port === "" ? window.location.origin : "http://localhost:3000")
                : window.location.origin));

    const res = await fetch(`${API_BASE_URL}/studios`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Gagal menyimpan studio");

    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "mitra-dashboard.html";
  } catch (err) {
    alert(err.message);
    submitBtn.innerText = "Selesai & Daftarkan";
    submitBtn.disabled = false;
  }
}

// --- FUNGSI BARU: PREVIEW LOGO ---
function previewLogoRegister(input) {
  const preview = document.getElementById("logo-preview-register");
  const placeholder = document.getElementById("logo-placeholder-text");

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      placeholder.style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.src = "";
    preview.style.display = "none";
    placeholder.style.display = "block";
  }
}
