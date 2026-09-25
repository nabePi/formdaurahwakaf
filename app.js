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

  // Step 1: Payment
  nominalBayar: 0,
  buktiBayarUrl: "",

  // Step 2A: Pengusaha
  namaBisnis: "",
  bidangUsaha: "",
  ketertarikanPengusaha: "",

  // Step 2B: Profesional
  profesi: "",
  instansi: "",
  ketertarikanProfesional: ""
};

// Order used for the progress indicator ("Step X of 2").
// 2A and 2B share position 2 since they are mutually exclusive branches.
const STEP_POSITIONS = {
  "step-1": 1,
  "step-2A": 2,
  "step-2B": 2
};
const TOTAL_STEPS = 2;

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

function getCheckboxValues(name) {
  return Array.from(
    document.querySelectorAll('input[name="' + name + '"]:checked')
  ).map((el) => el.value);
}

// Style the clickable label block when a radio/checkbox is selected
function initRadioGroups() {
  document.querySelectorAll(".radio-group").forEach((group) => {
    group.addEventListener("change", (e) => {
      if (e.target.type !== "radio" && e.target.type !== "checkbox") return;
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

// ---- Step 1: Data Umum & Pembayaran ---------------------------------------
const MIN_NOMINAL = 350000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  showFilePreview(uploadedFile);
});

// Preview the selected bukti transfer file (image thumbnail or filename for PDFs)
// before it's uploaded, so the user can confirm they picked the right file.
let currentPreviewUrl = null;

function showFilePreview(file) {
  const wrap = document.getElementById("file-preview-wrap");
  const imageEl = document.getElementById("file-preview-image");
  const fileEl = document.getElementById("file-preview-file");
  const filenameEl = document.getElementById("file-preview-filename");

  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }

  if (!file) {
    wrap.classList.add("hidden");
    imageEl.classList.add("hidden");
    fileEl.classList.add("hidden");
    imageEl.src = "";
    return;
  }

  wrap.classList.remove("hidden");
  currentPreviewUrl = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    imageEl.src = currentPreviewUrl;
    imageEl.classList.remove("hidden");
    fileEl.classList.add("hidden");
  } else {
    imageEl.classList.add("hidden");
    imageEl.src = "";
    filenameEl.textContent = file.name;
    fileEl.classList.remove("hidden");
  }
}

document.querySelectorAll('input[name="latarBelakang"]').forEach((input) => {
  input.addEventListener("change", () => {
    document.getElementById("btn-step1-next").textContent =
      input.value === "lainnya" ? "Submit" : "Lanjut";
  });
});

document.getElementById("btn-step1-back").addEventListener("click", () => {
  goToStep(0);
});

document.getElementById("btn-step1-next").addEventListener("click", async () => {
  const namaLengkap = document.getElementById("namaLengkap").value.trim();
  const noWhatsApp = document.getElementById("noWhatsApp").value.trim();
  const kotaDomisili = document.getElementById("kotaDomisili").value.trim();
  const email = document.getElementById("email").value.trim();
  const latarBelakang = getRadioValue("latarBelakang");
  const nominalPilihan = getRadioValue("nominalBayarPilihan");
  const nominalLainnyaInput = document.getElementById("nominalLainnya");

  clearErrors([
    "namaLengkap",
    "noWhatsApp",
    "kotaDomisili",
    "email",
    "latarBelakang",
    "nominalBayarPilihan",
    "nominalLainnya",
    "buktiBayar"
  ]);
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
  if (email && !EMAIL_REGEX.test(email)) {
    showError("email", "Format email tidak valid.");
    valid = false;
  }
  if (!latarBelakang) {
    showError("latarBelakang", "Silakan pilih salah satu.");
    valid = false;
  }

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

  const nextBtn = document.getElementById("btn-step1-next");
  const statusEl = document.getElementById("upload-status");
  const progressWrap = document.getElementById("upload-progress-wrap");
  const progressFill = document.getElementById("upload-progress-fill");
  const progressPercent = document.getElementById("upload-progress-percent");

  nextBtn.disabled = true;
  statusEl.textContent = "Mengunggah bukti transfer...";
  progressWrap.classList.remove("hidden");
  progressFill.style.width = "0%";
  progressPercent.textContent = "0%";

  try {
    const uploadedUrl = await uploadFileToDrive(uploadedFile, (percent) => {
      progressFill.style.width = percent + "%";
      progressPercent.textContent = percent + "%";
    });

    formData.namaLengkap = namaLengkap;
    formData.noWhatsApp = noWhatsApp;
    formData.kotaDomisili = kotaDomisili;
    formData.email = email;
    formData.latarBelakang = latarBelakang;
    formData.nominalBayar = nominalBayar;
    formData.buktiBayarUrl = uploadedUrl;

    statusEl.textContent = "Bukti transfer berhasil diunggah.";

    if (latarBelakang === "pengusaha") {
      goToStep("2A");
    } else if (latarBelakang === "profesional") {
      goToStep("2B");
    } else {
      await submitForm(nextBtn);
    }
  } catch (err) {
    statusEl.textContent = "";
    showError("buktiBayar", "Gagal mengunggah file. Silakan coba lagi.");
  } finally {
    nextBtn.disabled = false;
    progressWrap.classList.add("hidden");
  }
});

// ---- Step 2A: Khusus Pengusaha (final step, submits the form) -----------
document.getElementById("btn-step2A-back").addEventListener("click", () => {
  goToStep(1);
});

document.querySelector('#bidangUsahaOptions li[data-value="Lainnya"]').addEventListener("click", () => {
  document.getElementById("bidangUsaha-lainnya-wrap").classList.remove("hidden");
});

document.querySelectorAll('#bidangUsahaOptions li:not([data-value="Lainnya"])').forEach((li) => {
  li.addEventListener("click", () => {
    document.getElementById("bidangUsaha-lainnya-wrap").classList.add("hidden");
    document.getElementById("bidangUsahaLainnya").value = "";
    showError("bidangUsahaLainnya", "");
  });
});

document.querySelector('input[name="ketertarikanPengusaha"][value="Lainnya"]').addEventListener("change", (e) => {
  const wrap = document.getElementById("ketertarikan-lainnya-wrap");
  if (e.target.checked) {
    wrap.classList.remove("hidden");
  } else {
    wrap.classList.add("hidden");
    document.getElementById("ketertarikanLainnya").value = "";
    showError("ketertarikanLainnya", "");
  }
});

document.getElementById("btn-step2A-next").addEventListener("click", async () => {
  const namaBisnis = document.getElementById("namaBisnis").value.trim();
  const bidangUsahaPilihan = document.getElementById("bidangUsahaSelect").dataset.value || "";
  const bidangUsahaLainnyaInput = document.getElementById("bidangUsahaLainnya");
  const ketertarikanPengusaha = getCheckboxValues("ketertarikanPengusaha");
  const ketertarikanLainnyaInput = document.getElementById("ketertarikanLainnya");

  clearErrors([
    "namaBisnis",
    "bidangUsaha",
    "bidangUsahaLainnya",
    "ketertarikanPengusaha",
    "ketertarikanLainnya"
  ]);
  let valid = true;

  if (!namaBisnis) {
    showError("namaBisnis", "Nama bisnis wajib diisi.");
    valid = false;
  }
  if (!bidangUsahaPilihan) {
    showError("bidangUsaha", "Silakan pilih bidang usaha.");
    valid = false;
  } else if (bidangUsahaPilihan === "Lainnya" && !bidangUsahaLainnyaInput.value.trim()) {
    showError("bidangUsahaLainnya", "Silakan isi bidang usaha Anda.");
    valid = false;
  }

  if (ketertarikanPengusaha.length === 0) {
    showError("ketertarikanPengusaha", "Silakan pilih minimal satu.");
    valid = false;
  } else if (ketertarikanPengusaha.includes("Lainnya") && !ketertarikanLainnyaInput.value.trim()) {
    showError("ketertarikanLainnya", "Silakan isi ketertarikan Anda.");
    valid = false;
  }

  if (!valid) return;

  const bidangUsaha =
    bidangUsahaPilihan === "Lainnya" ? bidangUsahaLainnyaInput.value.trim() : bidangUsahaPilihan;
  const ketertarikanFinal = ketertarikanPengusaha.map((value) =>
    value === "Lainnya" ? `Lainnya: ${ketertarikanLainnyaInput.value.trim()}` : value
  );

  formData.namaBisnis = namaBisnis;
  formData.bidangUsaha = bidangUsaha;
  formData.ketertarikanPengusaha = ketertarikanFinal.join(" | ");

  await submitForm(document.getElementById("btn-step2A-next"));
});

// ---- Step 2B: Khusus Profesional (final step, submits the form) ---------
document.getElementById("btn-step2B-back").addEventListener("click", () => {
  goToStep(1);
});

document.querySelector('input[name="ketertarikanProfesional"][value="Lainnya"]').addEventListener("change", (e) => {
  const wrap = document.getElementById("ketertarikanProfesional-lainnya-wrap");
  if (e.target.checked) {
    wrap.classList.remove("hidden");
  } else {
    wrap.classList.add("hidden");
    document.getElementById("ketertarikanProfesionalLainnya").value = "";
    showError("ketertarikanProfesionalLainnya", "");
  }
});

document.getElementById("btn-step2B-next").addEventListener("click", async () => {
  const profesi = document.getElementById("profesi").value.trim();
  const instansi = document.getElementById("instansi").value.trim();
  const ketertarikanProfesional = getCheckboxValues("ketertarikanProfesional");
  const ketertarikanLainnyaInput = document.getElementById("ketertarikanProfesionalLainnya");

  clearErrors([
    "profesi",
    "instansi",
    "ketertarikanProfesional",
    "ketertarikanProfesionalLainnya"
  ]);
  let valid = true;

  if (!profesi) {
    showError("profesi", "Profesi/jabatan wajib diisi.");
    valid = false;
  }
  if (!instansi) {
    showError("instansi", "Instansi/tempat bekerja wajib diisi.");
    valid = false;
  }
  if (ketertarikanProfesional.length === 0) {
    showError("ketertarikanProfesional", "Silakan pilih minimal satu.");
    valid = false;
  } else if (ketertarikanProfesional.includes("Lainnya") && !ketertarikanLainnyaInput.value.trim()) {
    showError("ketertarikanProfesionalLainnya", "Silakan isi ketertarikan Anda.");
    valid = false;
  }

  if (!valid) return;

  const ketertarikanFinal = ketertarikanProfesional.map((value) =>
    value === "Lainnya" ? `Lainnya: ${ketertarikanLainnyaInput.value.trim()}` : value
  );

  formData.profesi = profesi;
  formData.instansi = instansi;
  formData.ketertarikanProfesional = ketertarikanFinal.join(" | ");

  await submitForm(document.getElementById("btn-step2B-next"));
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

// Google Apps Script's web app doesn't handle CORS preflight requests, and
// listening to xhr.upload.onprogress forces the browser to preflight (per the
// Fetch spec), which breaks the request. So real byte-level upload progress
// isn't available here — this simulates a smooth progress animation instead,
// easing toward 90% while the request is in flight and jumping to 100% on success.
function simulateProgress(onProgress) {
  let percent = 0;
  const interval = setInterval(() => {
    percent += (90 - percent) * 0.1;
    onProgress(Math.min(Math.round(percent), 89));
  }, 200);
  return () => clearInterval(interval);
}

async function uploadFileToDrive(file, onProgress) {
  const fileData = await readFileAsBase64(file);
  if (onProgress) onProgress(5);

  const stopSimulation = onProgress ? simulateProgress(onProgress) : null;

  try {
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
    if (onProgress) onProgress(100);
    return publicUrl;
  } finally {
    if (stopSimulation) stopSimulation();
  }
}

// ---- Final submit helper (used by both step 2A and step 2B) -------------
// Google Apps Script executes doPost as soon as the POST arrives, regardless
// of whether the client goes on to successfully read the response. A failed
// fetch() here (e.g. the client dropping the follow-up redirect fetch to
// script.googleusercontent.com) almost always means the data was already
// saved, so we treat any outcome as success rather than risk the user
// resubmitting and creating a duplicate row.
async function submitForm(button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Mengirim...";

  try {
    await submitToWebhook(formData);
  } catch (err) {
    console.error("Gagal membaca response webhook (data kemungkinan tetap tersimpan):", err);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }

  goToStep("success");
}

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
