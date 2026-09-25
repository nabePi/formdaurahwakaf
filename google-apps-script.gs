function getNextRow(sheet) {
  const colA = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getValues();
  let lastRow = 0;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "") lastRow = i + 1;
  }
  return lastRow + 1;
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  // Upload bukti transfer ke Google Drive
  if (data.action === "uploadFile") {
    return handleFileUpload(data);
  }

  // Simpan data pendaftaran ke Sheets (alur yang sudah ada)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = new Date();

  const sheet1 = ss.getSheetByName("Data semua pendaftar");
  const sheet1Row = getNextRow(sheet1);

  sheet1.getRange(sheet1Row, 1, 1, 8).setValues([[
    timestamp,
    data.namaLengkap,
    data.noWhatsApp,
    data.kotaDomisili,
    data.email,
    data.latarBelakang,
    data.nominalBayar,
    data.buktiBayarUrl
  ]]);

  if (data.latarBelakang === "pengusaha") {
    const sheet2 = ss.getSheetByName("detail Pengusaha");
    sheet2.getRange(getNextRow(sheet2), 1, 1, 5).setValues([[
      timestamp,
      data.namaLengkap,
      data.namaBisnis,
      data.bidangUsaha,
      data.ketertarikanPengusaha
    ]]);
  }

  if (data.latarBelakang === "profesional") {
    const sheet3 = ss.getSheetByName("detail Profesional");
    sheet3.getRange(getNextRow(sheet3), 1, 1, 5).setValues([[
      timestamp,
      data.namaLengkap,
      data.profesi,
      data.instansi,
      data.ketertarikanProfesional
    ]]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleFileUpload(data) {
  const bytes = Utilities.base64Decode(data.fileData);
  const blob = Utilities.newBlob(bytes, data.fileType, data.fileName);

  // Simpan ke folder khusus (opsional tapi disarankan, biar tidak numpuk di root Drive)
  const folder = getOrCreateFolder("Bukti Transfer Daurah Wakaf");
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const publicUrl = "https://drive.google.com/file/d/" + file.getId() + "/view";

  return ContentService
    .createTextOutput(JSON.stringify({ publicUrl: publicUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function testDriveAccess() {
  const folder = DriveApp.createFolder("Bukti Transfer Daurah Wakaf");
  const blob = Utilities.newBlob("test content", "text/plain", "test.txt");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log(file.getUrl());
}
