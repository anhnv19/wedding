// Stores RSVPs in the Google Sheet this script is attached to.
// Setup steps are in README.md ("Lưu xác nhận tham dự vào Google Sheets").

const SHEET_NAME = 'XacNhanThamDu';
const HEADERS = ['Thời gian', 'Tên', 'Tham dự'];

function doPost(e) {
  const params = e.parameter;
  sheet_().appendRow([new Date(), clean_(params.name, 100), clean_(params.attending, 10)]);
  return json_({ ok: true });
}

function sheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

// A leading =, +, - or @ would make Sheets evaluate guest input as a formula.
function clean_(value, maxLength) {
  const text = String(value || '').trim().slice(0, maxLength);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
