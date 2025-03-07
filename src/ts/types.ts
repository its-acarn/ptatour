import { sheets_v4 } from 'googleapis';

export interface PlayerNames {
  [index: number]: string;
}

export interface GameRecord {
  index: number;
  date: string;
  winnerIndex: number;
  scores: (string | number)[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  scores?: any[][];
  history?: GameRecord[];
  updatedScores?: any[][];
}

export interface GoogleSheetClient extends sheets_v4.Sheets {
  spreadsheets: sheets_v4.Resource$Spreadsheets;
}

export interface RecordWinRequest {
  winnerIndex: number;
  gameDate: string;
  playerNames: string[];
}

export interface DeleteGameRequest {
  gameIndex: number;
}

export interface UpdateScoresRequest {
  scores: any[][];
} 