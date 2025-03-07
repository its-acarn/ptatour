import { google } from 'googleapis';
import path from 'path';
import { GoogleSheetClient } from './types';

const serviceAccountKeyFile = path.join(__dirname, '../../config/credentials.json');
const sheetId = '1e0P6qFiWxJABKBjlBhGuxYv5CzqXGa8hy8_5S6pKaaM';

const summaryTabName = 'SUMMARY';
const summaryRange = 'A2:B4';

const resultsTabName = 'RESULTS';
const resultsRange = 'A:H';

async function main(ion: any[][]): Promise<void> {
  // Generating google sheet client
  const googleSheetClient = await _getGoogleSheetClient();

  // Reading Google Sheet from a specific range
  // const data = await _readGoogleSheet(googleSheetClient, sheetId, tabName, range);
  // console.log("Read Data: ",data);

  // Adding a new row to Google Sheet
  const dataToBeInserted = [
    [4], [5], [5], 
  ];
  
  await _updateGoogleSheet(googleSheetClient, sheetId, summaryTabName, summaryRange, ion);
}

async function _getGoogleSheetClient(): Promise<GoogleSheetClient> {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  
  // Use a more aggressive type assertion to bypass TypeScript's type checking
  return google.sheets({ 
    version: 'v4', 
    auth: authClient as any
  }) as GoogleSheetClient;
}

async function _readGoogleSheet(
  googleSheetClient: GoogleSheetClient, 
  sheetId: string, 
  tabName: string, 
  range: string
): Promise<any[][]> {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });

  return res.data.values || [];
}

async function _appendGoogleSheet(
  googleSheetClient: GoogleSheetClient, 
  sheetId: string, 
  tabName: string, 
  range: string, 
  data: any[][]
): Promise<void> {
  // @ts-ignore - The types are not correctly defined in the googleapis package
  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      "majorDimension": "ROWS",
      "values": data
    },
  });
}

async function _updateGoogleSheet(
  googleSheetClient: GoogleSheetClient, 
  sheetId: string, 
  tabName: string, 
  range: string, 
  data: any[][]
): Promise<void> {
  // @ts-ignore - The types are not correctly defined in the googleapis package
  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      "values": data
    },
  });
}

export {
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
}; 