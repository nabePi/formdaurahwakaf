// =========================================================================
// Daurah Wakaf Registration Form — app.js
// Vanilla JS: global state, step routing, validation, Drive upload, GAS webhook
// =========================================================================

// ---- Config -------------------------------------------------------------
const GAS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxC4yAZo-iBhRVzfkDcqIAwvpoiFkuXS_q5JJ3oiIyjf445Zd61GHPwuwLOyLugFCE2Wg/exec";

// ---- Global state -------------------------------------------------------
let currentStep = 0;
let formData = {
  // Step 1: Umum
  namaLengkap: "",
  noWhatsApp: "",
  kotaDomisili: "",
  email: "",
  latarBelakang: "", // "pengusaha" | "profesional"

  // Step 2A: Pengusaha
  namaBisnis: "",
  bidangUsaha: "",
  ketertarikanPengusaha: "",

  // Step 2B: Profesional
  profesi: "",
  instansi: "",
  kontribusiProfesional: "",

  // Step 3: Payment
  nominalBayar: 0,
  buktiBayarUrl: "",

  // Step 4: Consent
  izinFollowUp: ""
};

// Order used for the progress indicator ("Step X of 4").
// 2A and 2B share position 2 since they are mutually exclusive branches.
const STEP_POSITIONS = {
  "step-1": 1,
  "step-2A": 2,
  "step-2B": 2,
  "step-3": 3,
  "step-4": 4
};
const TOTAL_STEPS = 4;

// ---- Step navigation ------------------------------------------------------
function goToStep(stepId) {
  const id = String(stepId);
  const targetSelector = "step-" + id;

  document.querySelectorAll(".step-container").forEach((el) => {
    el.classList.remove("active");
  });

  const target = document.getElementById(targetSelector);
  target.classList.add("active");
  currentStep = id;

  updateProgress(targetSelector);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress(stepElementId) {
  const progressWrap = document.getElementById("progress-wrap");
  const position = STEP_POSITIONS[stepElementId];

  if (!position) {
    // Landing page / success page: hide progress indicator
    progressWrap.classList.add("hidden");
    return;
  }

  progressWrap.classList.remove("hidden");
  document.getElementById("progress-text").textContent =
    "Step " + position + " of " + TOTAL_STEPS;
  document.getElementById("progress-fill").style.width =
    (position / TOTAL_STEPS) * 100 + "%";
}

// ---- Helpers --------------------------------------------------------------
function showError(fieldId, message) {
  const errEl = document.getElementById("err-" + fieldId);
  if (errEl) errEl.textContent = message || "";
}

function clearErrors(fieldIds) {
  fieldIds.forEach((id) => showError(id, ""));
}

function getRadioValue(name) {
  const checked = document.querySelector('input[name="' + name + '"]:checked');
  return checked ? checked.value : "";
}

// Style the clickable label block when a radio is selected
function initRadioGroups() {
  document.querySelectorAll(".radio-group").forEach((group) => {
    group.addEventListener("change", (e) => {
      if (e.target.type !== "radio") return;
      const name = e.target.name;
      document
        .querySelectorAll('input[name="' + name + '"]')
        .forEach((input) => {
          input.closest(".radio-label").classList.toggle(
            "checked",
            input.checked
          );
        });
    });
  });
}

// Custom dropdown for "Bidang Usaha" (native <select> popups render inconsistently on mobile)
function initCustomSelect(containerId) {
  const container = document.getElementById(containerId);
  const trigger = container.querySelector(".custom-select-trigger");
  const valueText = container.querySelector(".custom-select-value");
  const optionsList = container.querySelector(".custom-select-options");

  trigger.addEventListener("click", () => {
    optionsList.classList.toggle("hidden");
    trigger.classList.toggle("open");
  });

  optionsList.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
      container.dataset.value = li.dataset.value;
      valueText.textContent = li.textContent;
      valueText.classList.remove("placeholder");

      optionsList.querySelectorAll("li").forEach((opt) => opt.classList.remove("selected"));
      li.classList.add("selected");

      optionsList.classList.add("hidden");
      trigger.classList.remove("open");
    });
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      optionsList.classList.add("hidden");
      trigger.classList.remove("open");
    }
  });
}

// ---- Step 0: Landing --------------------------------------------------
document.getElementById("btn-start").addEventListener("click", () => {
  goToStep(1);
});

// ---- Step 1: Data Umum --------------------------------------------------
document.getElementById("btn-step1-back").addEventListener("click", () => {
  goToStep(0);
});

document.getElementById("btn-step1-next").addEventListener("click", () => {
  const namaLengkap = document.getElementById("namaLengkap").value.trim();
  const noWhatsApp = document.getElementById("noWhatsApp").value.trim();
  const kotaDomisili = document.getElementById("kotaDomisili").value.trim();
  const email = document.getElementById("email").value.trim();
  const latarBelakang = getRadioValue("latarBelakang");

  clearErrors(["namaLengkap", "noWhatsApp", "kotaDomisili", "latarBelakang"]);
  let valid = true;

  if (!namaLengkap) {
    showError("namaLengkap", "Nama lengkap wajib diisi.");
    valid = false;
  }
  if (!noWhatsApp) {
    showError("noWhatsApp", "No. WhatsApp wajib diisi.");
    valid = false;
  }
  if (!kotaDomisili) {
    showError("kotaDomisili", "Kota domisili wajib diisi.");
    valid = false;
  }
  if (!latarBelakang) {
    showError("latarBelakang", "Silakan pilih salah satu.");
    valid = false;
  }

  if (!valid) return;

  formData.namaLengkap = namaLengkap;
  formData.noWhatsApp = noWhatsApp;
  formData.kotaDomisili = kotaDomisili;
  formData.email = email;
  formData.latarBelakang = latarBelakang;

  if (latarBelakang === "pengusaha") {
    goToStep("2A");
  } else {
    goToStep("2B");
  }
});

// ---- Step 2A: Khusus Pengusaha ------------------------------------------
document.getElementById("btn-step2A-back").addEventListener("click", () => {
  goToStep(1);
});

document.getElementById("btn-step2A-next").addEventListener("click", () => {
  const namaBisnis = document.getElementById("namaBisnis").value.trim();
  const bidangUsaha = document.getElementById("bidangUsahaSelect").dataset.value || "";
  const ketertarikanPengusaha = getRadioValue("ketertarikanPengusaha");

  clearErrors(["namaBisnis", "bidangUsaha", "ketertarikanPengusaha"]);
  let valid = true;

  if (!namaBisnis) {
    showError("namaBisnis", "Nama bisnis wajib diisi.");
    valid = false;
  }
  if (!bidangUsaha) {
    showError("bidangUsaha", "Silakan pilih bidang usaha.");
    valid = false;
  }
  if (!ketertarikanPengusaha) {
    showError("ketertarikanPengusaha", "Silakan pilih salah satu.");
    valid = false;
  }

  if (!valid) return;

  formData.namaBisnis = namaBisnis;
  formData.bidangUsaha = bidangUsaha;
  formData.ketertarikanPengusaha = ketertarikanPengusaha;

  goToStep(3);
});

// ---- Step 2B: Khusus Profesional -----------------------------------------
document.getElementById("btn-step2B-back").addEventListener("click", () => {
  goToStep(1);
});

document.getElementById("btn-step2B-next").addEventListener("click", () => {
  const profesi = document.getElementById("profesi").value.trim();
  const instansi = document.getElementById("instansi").value.trim();
  const kontribusiProfesional = getRadioValue("kontribusiProfesional");

  clearErrors(["profesi", "instansi", "kontribusiProfesional"]);
  let valid = true;

  if (!profesi) {
    showError("profesi", "Profesi/jabatan wajib diisi.");
    valid = false;
  }
  if (!instansi) {
    showError("instansi", "Instansi/tempat bekerja wajib diisi.");
    valid = false;
  }
  if (!kontribusiProfesional) {
    showError("kontribusiProfesional", "Silakan pilih salah satu.");
    valid = false;
  }

  if (!valid) return;

  formData.profesi = profesi;
  formData.instansi = instansi;
  formData.kontribusiProfesional = kontribusiProfesional;

  goToStep(3);
});

// ---- Step 3: Pembayaran --------------------------------------------------
const MIN_NOMINAL = 350000;
let uploadedFile = null;

document.querySelectorAll('input[name="nominalBayarPilihan"]').forEach((input) => {
  input.addEventListener("change", () => {
    const lainnyaWrap = document.getElementById("nominal-lainnya-wrap");
    if (input.value === "lainnya") {
      lainnyaWrap.classList.remove("hidden");
    } else {
      lainnyaWrap.classList.add("hidden");
      showError("nominalLainnya", "");
    }
  });
});

document.getElementById("nominalLainnya").addEventListener("input", (e) => {
  const value = Number(e.target.value);
  if (e.target.value && value < MIN_NOMINAL) {
    showError(
      "nominalLainnya",
      "Mohon maaf, nominal minimal adalah Rp 350.000"
    );
  } else {
    showError("nominalLainnya", "");
  }
});

document.getElementById("buktiBayar").addEventListener("change", (e) => {
  uploadedFile = e.target.files[0] || null;
  showError("buktiBayar", "");
});

document.getElementById("btn-step3-back").addEventListener("click", () => {
  goToStep(formData.latarBelakang === "pengusaha" ? "2A" : "2B");
});

document.getElementById("btn-step3-next").addEventListener("click", async () => {
  const nominalPilihan = getRadioValue("nominalBayarPilihan");
  const nominalLainnyaInput = document.getElementById("nominalLainnya");

  clearErrors(["nominalBayarPilihan", "nominalLainnya", "buktiBayar"]);
  let valid = true;

  if (!nominalPilihan) {
    showError("nominalBayarPilihan", "Silakan pilih nominal.");
    valid = false;
  }

  let nominalBayar = Number(nominalPilihan);
  if (nominalPilihan === "lainnya") {
    nominalBayar = Number(nominalLainnyaInput.value);
    if (!nominalLainnyaInput.value) {
      showError("nominalLainnya", "Nominal wajib diisi.");
      valid = false;
    } else if (nominalBayar < MIN_NOMINAL) {
      showError(
        "nominalLainnya",
        "Mohon maaf, nominal minimal adalah Rp 350.000"
      );
      valid = false;
    }
  }

  if (!uploadedFile) {
    showError("buktiBayar", "Bukti transfer wajib diunggah.");
    valid = false;
  }

  if (!valid) return;

  const nextBtn = document.getElementById("btn-step3-next");
  nextBtn.disabled = true;
  const statusEl = document.getElementById("upload-status");
  statusEl.textContent = "Mengunggah bukti transfer...";

  try {
    const uploadedUrl = await uploadFileToDrive(uploadedFile);
    formData.nominalBayar = nominalBayar;
    formData.buktiBayarUrl = uploadedUrl;
    statusEl.textContent = "Bukti transfer berhasil diunggah.";
    goToStep(4);
  } catch (err) {
    statusEl.textContent = "";
    showError("buktiBayar", "Gagal mengunggah file. Silakan coba lagi.");
  } finally {
    nextBtn.disabled = false;
  }
});

// ---- A. Google Drive Upload Flow (via Apps Script) -----------------------
// 1. Read the file as base64.
// 2. POST it to the same GAS webhook with action: "uploadFile".
// 3. The script saves it to Drive and returns a public view URL.
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadFileToDrive(file) {
  const fileData = await readFileAsBase64(file);

  const response = await fetch(GAS_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "uploadFile",
      fileName: file.name,
      fileType: file.type,
      fileData: fileData
    })
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to Drive");
  }

  const { publicUrl } = await response.json();
  return publicUrl;
}

// ---- Step 4: Consent & Submit --------------------------------------------
document.getElementById("btn-step4-back").addEventListener("click", () => {
  goToStep(3);
});

document.getElementById("btn-submit").addEventListener("click", async () => {
  const izinFollowUp = getRadioValue("izinFollowUp");

  clearErrors(["izinFollowUp"]);
  if (!izinFollowUp) {
    showError("izinFollowUp", "Silakan pilih salah satu.");
    return;
  }

  formData.izinFollowUp = izinFollowUp;

  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  try {
    await submitToWebhook(formData);
    goToStep("success");
  } catch (err) {
    showError("izinFollowUp", "Gagal mengirim data. Silakan coba lagi.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});

// ---- B. Google Sheets Webhook Flow ----------------------------------------
// Sends the full formData object to your Google Apps Script webhook.
// Backend logic (handled by GAS):
//   - Write standard data to Sheet 1.
//   - If latarBelakang === "pengusaha", append fields to Sheet 2.
//   - If latarBelakang === "profesional", append fields to Sheet 3.
async function submitToWebhook(data) {
  const response = await fetch(GAS_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Webhook submission failed");
  }
}

// ---- Init -------------------------------------------------------------
initRadioGroups();
initCustomSelect("bidangUsahaSelect");
updateProgress("step-0");
