const index = require('./index.js')
const express = require('express')
const path = require('path')
const app = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.get('/scores', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/scores.html'))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.post('/update', (req, res) => {
  index.main(req.body.lol)
  console.log(req.body.lol)
  res.send("ppp")
})

app.post('/update-scores', async (req, res) => {
  try {
    const googleSheetClient = await index._getGoogleSheetClient();
    const scores = req.body.scores;
    
    // Update the summary scores
    await index._updateGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange, 
      scores
    );
    
    res.json({ success: true, message: 'Scores updated successfully' });
  } catch (error) {
    console.error('Error updating scores:', error);
    res.status(500).json({ success: false, message: 'Error updating scores' });
  }
})

app.get('/get-scores', async (req, res) => {
  try {
    const googleSheetClient = await index._getGoogleSheetClient();
    
    // Get the summary scores
    const scores = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange
    );
    
    res.json({ success: true, scores });
  } catch (error) {
    console.error('Error getting scores:', error);
    res.status(500).json({ success: false, message: 'Error getting scores' });
  }
})

// Get sheet ID by name
async function getSheetIdByName(googleSheetClient, spreadsheetId, sheetName) {
  try {
    console.log(`Looking for sheet "${sheetName}" in spreadsheet ${spreadsheetId}`);
    
    // Get the spreadsheet metadata
    const response = await googleSheetClient.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    // Log the available sheets for debugging
    if (response.data.sheets) {
      const availableSheets = response.data.sheets.map(s => s.properties?.title);
      console.log('Available sheets:', availableSheets.join(', '));
      
      // Debug: Check if the sheet name exists in the available sheets (case-insensitive)
      const lowerCaseSheetName = sheetName.toLowerCase();
      const lowerCaseAvailableSheets = availableSheets.map(s => s?.toLowerCase());
      console.log(`Searching for "${lowerCaseSheetName}" in [${lowerCaseAvailableSheets.join(', ')}]`);
      console.log(`Direct match found: ${lowerCaseAvailableSheets.includes(lowerCaseSheetName)}`);
    }
    
    // First try an exact match (case-sensitive)
    let sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    
    // If no exact match, try case-insensitive match
    if (!sheet) {
      console.log(`No exact match found for "${sheetName}", trying case-insensitive match`);
      sheet = response.data.sheets?.find(s => 
        s.properties?.title?.toLowerCase() === sheetName.toLowerCase()
      );
    }
    
    if (!sheet || !sheet.properties?.sheetId) {
      // Try to find the sheet by a partial match as a fallback
      console.log(`No case-insensitive match found for "${sheetName}", trying partial match`);
      const partialMatch = response.data.sheets?.find(s => 
        s.properties?.title?.toLowerCase().includes(sheetName.toLowerCase()) ||
        sheetName.toLowerCase().includes(s.properties?.title?.toLowerCase() || '')
      );
      
      if (partialMatch && partialMatch.properties?.sheetId) {
        console.log(`Found sheet "${partialMatch.properties.title}" as a partial match for "${sheetName}"`);
        return partialMatch.properties.sheetId;
      }
      
      // If we get here, we couldn't find the sheet
      const availableSheetNames = response.data.sheets?.map(s => 
        `"${s.properties?.title}" (ID: ${s.properties?.sheetId})`
      ).join(', ') || 'none';
      
      throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${availableSheetNames}`);
    }
    
    console.log(`Found sheet "${sheet.properties.title}" with ID ${sheet.properties.sheetId}`);
    return sheet.properties.sheetId;
  } catch (error) {
    console.error(`Error getting sheet ID for "${sheetName}":`, error);
    throw error;
  }
}

// Record a win for a player
app.post('/record-win', async (req, res) => {
  try {
    const { winnerIndex, gameDate, playerNames } = req.body;
    
    if (winnerIndex === undefined || winnerIndex < 0 || winnerIndex > 2) {
      return res.status(400).json({ success: false, message: 'Invalid winner index' });
    }
    
    const googleSheetClient = await index._getGoogleSheetClient();
    
    // 1. Get current scores
    const currentScores = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange
    );
    
    // 2. Update the winner's score
    const updatedScores = [...(currentScores || [['', '0'], ['', '0'], ['', '0']])];
    
    // Make sure we have valid scores and player names
    for (let i = 0; i < 3; i++) {
      if (!updatedScores[i]) {
        updatedScores[i] = ['', '0'];
      }
      
      // Ensure player name is set (column 0)
      if (!updatedScores[i][0] && playerNames && playerNames[i]) {
        updatedScores[i][0] = playerNames[i];
      }
      
      // Ensure score is set (column 1)
      if (!updatedScores[i][1]) {
        updatedScores[i][1] = '0';
      }
    }
    
    // Increment the winner's score (in column 1)
    const currentScore = parseInt(updatedScores[winnerIndex][1] || 0);
    updatedScores[winnerIndex][1] = (currentScore + 1).toString();
    
    // 3. Update the summary scores
    await index._updateGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange, 
      updatedScores
    );
    
    // 4. Record the game in the results tab
    const formattedDate = new Date(gameDate).toISOString().split('T')[0];
    const defaultPlayerNames = ['Player 1', 'Player 2', 'Player 3'];
    const names = playerNames || defaultPlayerNames;
    
    const gameRecord = [
      [
        formattedDate, 
        names[winnerIndex], 
        updatedScores[0][1], // Score from column 1
        updatedScores[1][1], // Score from column 1
        updatedScores[2][1], // Score from column 1
        updatedScores[0][0] || names[0], // Name from column 0
        updatedScores[1][0] || names[1], // Name from column 0
        updatedScores[2][0] || names[2]  // Name from column 0
      ]
    ];
    
    await index._appendGoogleSheet(
      googleSheetClient,
      index.sheetId,
      index.resultsTabName,
      index.resultsRange,
      gameRecord
    );
    
    res.json({ success: true, message: 'Win recorded successfully' });
  } catch (error) {
    console.error('Error recording win:', error);
    res.status(500).json({ success: false, message: 'Error recording win' });
  }
})

// Delete a game record
app.post('/delete-game', async (req, res) => {
  try {
    const { gameIndex } = req.body;
    
    if (gameIndex === undefined || gameIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid game index' });
    }
    
    const googleSheetClient = await index._getGoogleSheetClient();
    
    // 1. Get all game records
    const resultsData = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.resultsTabName, 
      index.resultsRange
    );

    console.log("resultsData",resultsData)
    
    if (!resultsData || resultsData.length === 0 || gameIndex >= resultsData.length) {
      return res.status(400).json({ success: false, message: 'Game not found' });
    }
    
    // 2. Get the game to delete
    const gameToDelete = resultsData[gameIndex];
    
    // 3. Get current scores
    const currentScores = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange
    );
    
    // 4. Determine which player won the game to delete
    let winnerIndex = -1;
    if (gameToDelete.length >= 8) {
      // We have player names stored in the sheet
      const storedNames = [gameToDelete[5], gameToDelete[6], gameToDelete[7]];
      const winnerName = gameToDelete[1] || '';
      winnerIndex = storedNames.findIndex(name => name.toLowerCase() === winnerName.toLowerCase());
    } else {
      // Old format - try to determine winner index from default names
      const defaultPlayerNames = ['Player 1', 'Player 2', 'Player 3'];
      const winnerName = gameToDelete[1] || '';
      winnerIndex = defaultPlayerNames.findIndex(name => name.toLowerCase() === winnerName.toLowerCase());
    }

    console.log("winnerIndex",winnerIndex)
    
    if (winnerIndex === -1) {
      return res.status(400).json({ success: false, message: 'Could not determine winner of the game' });
    }
    
    // 5. Update the scores by decrementing the winner's score
    const updatedScores = [...(currentScores || [['', '0'], ['', '0'], ['', '0']])];
    
    // Make sure we have valid scores
    for (let i = 0; i < 3; i++) {
      if (!updatedScores[i]) {
        updatedScores[i] = ['', '0'];
      }
      
      // Ensure score is set (column 1)
      if (!updatedScores[i][1]) {
        updatedScores[i][1] = '0';
      }
    }
    
    // Decrement the winner's score (ensure it doesn't go below 0)
    const currentScore = parseInt(updatedScores[winnerIndex][1] || 0);
    updatedScores[winnerIndex][1] = Math.max(0, currentScore - 1).toString();
    
    // 6. Update the summary scores
    await index._updateGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange, 
      updatedScores
    );
    
    // 7. Get the actual sheet ID for the RESULTS tab
    const resultsSheetId = await getSheetIdByName(googleSheetClient, index.sheetId, index.resultsTabName);
    console.log("resultsSheetId", resultsSheetId);
    
    // 8. Calculate the actual row number in the sheet (1-indexed)
    // Add 1 because Google Sheets is 1-indexed
    const rowToDelete = gameIndex + 1;
    
    try {
      // 9. Use the spreadsheets.batchUpdate method to delete the row
      await googleSheetClient.spreadsheets.batchUpdate({
        spreadsheetId: index.sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: resultsSheetId, // Use the actual sheet ID we retrieved
                  dimension: 'ROWS',
                  startIndex: rowToDelete - 1, // 0-indexed
                  endIndex: rowToDelete // exclusive end index
                }
              }
            }
          ]
        }
      });
    } catch (batchUpdateError) {
      console.error("Error in batchUpdate:", batchUpdateError);
      
      // Alternative approach: If batchUpdate fails, try to clear the row instead
      console.log("Trying alternative approach: clearing the row");
      
      // Create an array of empty values matching the width of the data
      const emptyRow = Array(gameToDelete.length).fill("");
      
      // Create a new array with all rows except the one to delete
      const newResultsData = [...resultsData];
      newResultsData[gameIndex] = emptyRow;
      
      // Update the sheet with the modified data
      await index._updateGoogleSheet(
        googleSheetClient,
        index.sheetId,
        index.resultsTabName,
        index.resultsRange,
        newResultsData
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Game deleted successfully',
      updatedScores
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting game' });
  }
})

// Reset all scores
app.post('/reset-scores', async (req, res) => {
  try {
    const googleSheetClient = await index._getGoogleSheetClient();
    
    // Get current summary data to preserve player names
    const currentSummary = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange
    );
    
    // Create reset scores array that preserves player names but resets scores to zero
    const resetScores = currentSummary.map(row => {
      // Keep the player name in column 0, set score to 0 in column 1
      return [row[0] || '', '0'];
    });
    
    // Ensure we have at least 3 rows
    while (resetScores.length < 3) {
      resetScores.push(['Player ' + (resetScores.length + 1), '0']);
    }
    
    await index._updateGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.summaryTabName, 
      index.summaryRange, 
      resetScores
    );
    
    res.json({ success: true, message: 'Scores reset successfully' });
  } catch (error) {
    console.error('Error resetting scores:', error);
    res.status(500).json({ success: false, message: 'Error resetting scores' });
  }
})

// Get game history
app.get('/get-game-history', async (req, res) => {
  try {
    const googleSheetClient = await index._getGoogleSheetClient();
    
    // Get the results data
    const resultsData = await index._readGoogleSheet(
      googleSheetClient, 
      index.sheetId, 
      index.resultsTabName, 
      index.resultsRange
    );
    
    if (!resultsData || resultsData.length === 0) {
      return res.json({ success: true, history: [] });
    }
    
    // Format the history data (most recent first)
    const history = resultsData
      .map((row, index) => {
        // Skip empty rows or rows with insufficient data
        if (!row || row.length === 0) return null;
        if (!row[0] || !row[1]) return null;
        
        // Check if we have the extended format with player names
        let winnerIndex = 0;
        
        if (row.length >= 8) {
          // We have player names stored in the sheet
          const storedNames = [row[5], row[6], row[7]];
          const winnerName = row[1] || '';
          winnerIndex = storedNames.findIndex(name => name.toLowerCase() === winnerName.toLowerCase());
          if (winnerIndex === -1) winnerIndex = 0;
        } else {
          // Old format - try to determine winner index from default names
          const defaultPlayerNames = ['Player 1', 'Player 2', 'Player 3'];
          const winnerName = row[1] || '';
          winnerIndex = defaultPlayerNames.findIndex(name => name.toLowerCase() === winnerName.toLowerCase());
          if (winnerIndex === -1) winnerIndex = 0;
        }
        
        return {
          index,
          date: row[0],
          winnerIndex,
          scores: [row[2], row[3], row[4]]
        };
      })
      .filter(item => item !== null) // Remove null entries (empty rows)
      .reverse(); // Most recent first
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error getting game history:', error);
    res.status(500).json({ success: false, message: 'Error getting game history' });
  }
})