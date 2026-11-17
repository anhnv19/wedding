// Stores RSVPs and guestbook wishes in the Google Sheet this script is attached to.
// Setup steps are in README.md ("Lưu xác nhận tham dự & lời chúc vào Google Sheets").

const SHEET_NAMES = { rsvp: 'XacNhanThamDu', wish: 'LoiChuc' };
const HEADERS = {
  rsvp: ['Thời gian', 'Tên', 'Tham dự'],
  wish: ['Thời gian', 'Tên', 'Lời chúc'],
};

function doPost(e) {
  const params = e.parameter;
  const type = params.type === 'rsvp' ? 'rsvp' : 'wish';
  const row = type === 'rsvp'
    ? [new Date(), clean_(params.name, 100), clean_(params.attending, 10)]
    : [new Date(), clean_(params.name, 100), clean_(params.message, 1000)];
  sheetFor_(type).appendRow(row);
  return json_({ ok: true });
}

function doGet() {
  const rows = sheetFor_('wish').getDataRange().getValues().slice(1);
  const wishes = rows
    .reverse()
    .slice(0, 200)
    .map(([time, name, message]) => ({ time, name, message }));
  return json_(wishes);
}

function sheetFor_(type) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAMES[type]);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAMES[type]);
    sheet.appendRow(HEADERS[type]);
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
