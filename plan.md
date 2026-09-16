# Project Implementation Plan: Daurah Wakaf Registration Form

## 1. Project Overview
Build a clean, minimalist, multi-step Single Page Application (SPA) registration form inspired by Tally.so. 
- **Tech Stack:** STRICTLY Vanilla HTML5, CSS3, and JavaScript (ES6+). NO React, NO Vue, NO npm dependencies, NO Tailwind (use pure CSS).
- **Core Features:** Conditional routing (branching based on user type), custom input validation, direct file upload to Cloudflare R2 via pre-signed URL, and webhook integration to Google Sheets.
- **Design System:** Mobile-first, centered single-column layout, large typography, borderless inputs (bottom-border only on focus), smooth fade/slide transitions between steps.

## 2. Global State & Data Model
The JavaScript must maintain a global `formData` object and track the `currentStep` index.
```javascript
let currentStep = 0;
let formData = {
  // Step 1: Umum
  namaLengkap: "",
  noWhatsApp: "",
  kotaDomisili: "",
  email: "", // Optional
  latarBelakang: "", // "pengusaha" | "profesional"
  
  // Step 2A: Pengusaha (Nullable if Profesional)
  namaBisnis: "",
  bidangUsaha: "",
  ketertarikanPengusaha: "",
  
  // Step 2B: Profesional (Nullable if Pengusaha)
  profesi: "",
  instansi: "",
  kontribusiProfesional: "",
  
  // Step 3: Payment
  nominalBayar: 0,
  buktiBayarUrl: "", // URL string from Cloudflare R2
  
  // Step 4: Consent
  izinFollowUp: ""
};
```

## 3. UI/UX & CSS Guidelines (Tally.so Theme)
- **Responsive:** MUST include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- **Layout:** `#app-container` should be `max-width: 600px; margin: 0 auto; padding: 20px;`.
- **Typography:** Use a clean sans-serif font system (e.g., system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto). Main questions should be `font-size: 1.25rem; font-weight: 600;`.
- **Form Inputs:** 
  - Standard inputs (`type="text"`, `type="number"`, `type="email"`): `border: none; border-bottom: 1px solid #ccc; background: transparent; padding: 10px 0; width: 100%; font-size: 1rem; transition: border-color 0.3s ease;`
  - On focus: `outline: none; border-bottom: 2px solid #000;`
- **Radio Buttons:** Hide native radio inputs. Style the `<label>` as clickable blocks (`display: block; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; cursor: pointer;`). When checked, change background and border color.
- **Buttons:** Large, distinct buttons for "Next" and "Submit" (e.g., black background, white text, `border-radius: 6px; padding: 12px 24px; width: 100%;` on mobile).
- **Progress Indicator:** A simple CSS progress bar at the top or text indicator (e.g., "Step 1 of 4").
- **Transitions:** `.step-container` starts with `display: none; opacity: 0;`. Active step gets `display: block; animation: fadeIn 0.4s forwards;`.

## 4. Step-by-Step Flow & Logic

### Step 0: Landing (`#step-0`)
- **Content:** Header with Logo (placeholder), Event Poster `<img>` (`max-width: 100%; border-radius: 8px;`), Event Title: "Daurah Wakaf", Date: "7 November 2026".
- **Action:** "Mulai Daftar" button -> calls `goToStep(1)`.

### Step 1: Data Umum (`#step-1`)
- **Inputs:** 
  - Nama Lengkap (Required)
  - No. WhatsApp (Required, Type: Tel)
  - Kota Domisili (Required)
  - Email (Optional, Type: Email)
  - Latar Belakang (Radio): "Pengusaha" OR "Profesional".
- **Action:** "Lanjut" button. 
- **Logic:** Validate required fields. If "Pengusaha", `goToStep('2A')`. If "Profesional", `goToStep('2B')`.

### Step 2A: Khusus Pengusaha (`#step-2A`)
- **Inputs:** Nama Bisnis, Bidang Usaha (Select/Dropdown), Ketertarikan Utama (Radio).
- **Action:** "Lanjut" button -> `goToStep(3)`.

### Step 2B: Khusus Profesional (`#step-2B`)
- **Inputs:** Profesi/Jabatan Saat Ini, Instansi/Tempat Bekerja, Bentuk Kontribusi Diminati (Radio).
- **Action:** "Lanjut" button -> `goToStep(3)`.

### Step 3: Pembayaran (`#step-3`)
- **Content:** Instructions for Bank Transfer (e.g., BSI: 1234567890 a.n Sirah Community Indonesia).
- **Inputs:** 
  - Pilihan Nominal (Radio): 350.000, 400.000, 500.000, "Lainnya".
  - Nominal Lainnya (Number): *Conditional.* Only show if "Lainnya" is selected.
  - Bukti Transfer (File Upload): `accept="image/*, application/pdf"`.
- **Validation Logic:** 
  - Listen to "Lainnya" input. If value `< 350000`, show an inline error message: "Mohon maaf, nominal minimal adalah Rp 350.000" and disable the "Lanjut" button.
- **Action:** "Lanjut" button -> `goToStep(4)`.

### Step 4: Consent & Submit (`#step-4`)
- **Inputs:** Izin Follow-up (Radio: "Ya, bersedia dihubungi", "Ya, kirim pesan dulu", "Tidak").
- **Action:** "Submit" button.

## 5. API Integrations (JS Fetch Logic)

### A. Cloudflare R2 Upload Flow
1. On Submit (or on File Select), disable UI and show a loading spinner.
2. `fetch(YOUR_R2_WORKER_URL)` to request a pre-signed PUT URL.
3. Use the returned URL to execute a `PUT` request with the `File` object as the body.
4. On success, store the public URL in `formData.buktiBayarUrl`.

### B. Google Sheets Webhook Flow
1. Serialize `formData` to JSON.
2. `fetch(YOUR_GAS_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(formData) })`.
3. Note for Backend logic (handled by GAS/Webhook): 
   - Write standard data to **Sheet 1**.
   - If `latarBelakang === 'pengusaha'`, append specific fields to **Sheet 2**.
   - If `latarBelakang === 'profesional'`, append specific fields to **Sheet 3**.
4. On success response from Webhook, hide `#step-4` and display `#step-success` (Thank You message).

## 6. Execution Instructions for AI Assistant
- Generate the complete HTML structure in `index.html`.
- Generate all styling in `styles.css` adhering to the Tally.so vibe.
- Generate the DOM manipulation, validation, routing, and fetch API logic in `app.js`.
- Use mock URLs (`https://api.example.com/r2-presign` and `https://script.google.com/macros/s/xyz/exec`) for the fetch endpoints so they can be replaced later.
- Add copious comments in the JavaScript explaining where the R2 and GAS endpoints should be inserted.
