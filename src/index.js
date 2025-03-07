const { google } = require('googleapis');

const serviceAccountKeyFile = "./config/credentials.json";
const sheetId = '1e0P6qFiWxJABKBjlBhGuxYv5CzqXGa8hy8_5S6pKaaM'

const summaryTabName = 'SUMMARY'
const summaryRange = 'B2:B4'

const resultsTabName = 'RESULTS'
const resultsRange = 'A:F'

// main().then(() => {
//   console.log('Completed')
// })

async function main(ion) {
  // Generating google sheet client
  const googleSheetClient = await _getGoogleSheetClient();

  // Reading Google Sheet from a specific range
  // const data = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  // console.log("Read Data: ",data);

  // Adding a new row to Google Sheet
  const dataToBeInserted = [
    [4], [5], [5], 
 ]
  
  await _updateGoogleSheet(googleSheetClient, sheetId, summaryTabName, summaryRange, ion);
}

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });

  return res.data.values;
}

async function _appendGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      "majorDimension": "ROWS",
      "values": data
    },
  })
}

async function _updateGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      "values": data
    },
  })
}

module.exports = {
  main,
  _getGoogleSheetClient,
  _readGoogleSheet,
  _appendGoogleSheet,
  _updateGoogleSheet,
  sheetId,
  summaryTabName,
  summaryRange,
  resultsTabName,
  resultsRange
}