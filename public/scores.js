document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const winnerForm = document.getElementById('winner-form');
    const settingsForm = document.getElementById('settings-form');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const resetScoresBtn = document.getElementById('reset-scores-btn');
    const player1ScoreDisplay = document.getElementById('player1-score');
    const player2ScoreDisplay = document.getElementById('player2-score');
    const player3ScoreDisplay = document.getElementById('player3-score');
    const player1NameDisplay = document.getElementById('player1-name-display');
    const player2NameDisplay = document.getElementById('player2-name-display');
    const player3NameDisplay = document.getElementById('player3-name-display');
    const player1NameInput = document.getElementById('player1-name');
    const player2NameInput = document.getElementById('player2-name');
    const player3NameInput = document.getElementById('player3-name');
    const winnerOption0 = document.getElementById('winner-option-0');
    const winnerOption1 = document.getElementById('winner-option-1');
    const winnerOption2 = document.getElementById('winner-option-2');
    const gameHistoryTable = document.getElementById('game-history').querySelector('tbody');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    
    // Player names (default and from localStorage)
    const defaultPlayerNames = ['Peter', 'Timmy', 'Andrew'];
    let playerNames = loadPlayerNames();
    
    // Set default date to today
    document.getElementById('game-date').valueAsDate = new Date();
    
    // Initialize player names in the UI
    updatePlayerNamesInUI();
    
    // Load current scores and game history when page loads
    loadScores();
    loadGameHistory();
    
    // Add event listeners
    winnerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        recordWin();
    });
    
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });
    
    notificationClose.addEventListener('click', () => {
        notification.classList.add('hidden');
    });
    
    resetScoresBtn.addEventListener('click', () => {
        showConfirmDialog(
            'Reset All Scores', 
            'Are you sure you want to reset all scores to zero? This action cannot be undone.',
            resetAllScores
        );
    });
    
    confirmCancelBtn.addEventListener('click', () => {
        confirmDialog.classList.add('hidden');
    });
    
    // Function to show confirmation dialog
    function showConfirmDialog(title, message, confirmCallback) {
        // Update dialog content
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        // Remove any existing event listeners by cloning and replacing the button
        const confirmOkBtnParent = document.getElementById('confirm-ok').parentNode;
        const newConfirmBtn = document.getElementById('confirm-ok').cloneNode(true);
        newConfirmBtn.id = 'confirm-ok';
        confirmOkBtnParent.replaceChild(newConfirmBtn, document.getElementById('confirm-ok'));
        
        // Also clone and replace the cancel button
        const confirmCancelBtnParent = document.getElementById('confirm-cancel').parentNode;
        const newCancelBtn = document.getElementById('confirm-cancel').cloneNode(true);
        newCancelBtn.id = 'confirm-cancel';
        confirmCancelBtnParent.replaceChild(newCancelBtn, document.getElementById('confirm-cancel'));
        
        // Add new event listener to the new buttons
        document.getElementById('confirm-ok').addEventListener('click', () => {
            confirmCallback();
            confirmDialog.classList.add('hidden');
        });
        
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            confirmDialog.classList.add('hidden');
        });
        
        // Show dialog
        confirmDialog.classList.remove('hidden');
    }
    
    // Function to load player names from localStorage
    function loadPlayerNames() {
        const savedNames = localStorage.getItem('playerNames');
        if (savedNames) {
            return JSON.parse(savedNames);
        }
        return [...defaultPlayerNames];
    }
    
    // Function to save player names to localStorage
    function savePlayerNames(names) {
        localStorage.setItem('playerNames', JSON.stringify(names));
    }
    
    // Function to update player names in the UI
    function updatePlayerNamesInUI() {
        // Update display names
        player1NameDisplay.textContent = playerNames[0];
        player2NameDisplay.textContent = playerNames[1];
        player3NameDisplay.textContent = playerNames[2];
        
        // Update dropdown options
        winnerOption0.textContent = playerNames[0];
        winnerOption1.textContent = playerNames[1];
        winnerOption2.textContent = playerNames[2];
        
        // Update settings form
        player1NameInput.value = playerNames[0];
        player2NameInput.value = playerNames[1];
        player3NameInput.value = playerNames[2];
    }
    
    // Function to save settings
    function saveSettings() {
        const newNames = [
            player1NameInput.value || defaultPlayerNames[0],
            player2NameInput.value || defaultPlayerNames[1],
            player3NameInput.value || defaultPlayerNames[2]
        ];
        
        playerNames = newNames;
        savePlayerNames(playerNames);
        updatePlayerNamesInUI();
        
        // Hide settings panel
        settingsPanel.classList.add('hidden');
        
        // Show success notification
        showNotification('Settings saved successfully');
        
        // Reload game history with new names
        loadGameHistory();
    }
    
    // Function to load scores from the server
    async function loadScores() {
        try {
            const response = await fetch('/get-scores');
            const data = await response.json();
            
            if (data.success) {
                displayScores(data.scores);
            } else {
                showNotification('Failed to load scores', true);
            }
        } catch (error) {
            console.error('Error loading scores:', error);
            showNotification('Failed to load scores', true);
        }
    }
    
    // Function to load game history
    async function loadGameHistory() {
        try {
            const response = await fetch('/get-game-history');
            const data = await response.json();
            
            if (data.success) {
                displayGameHistory(data.history);
            } else {
                gameHistoryTable.innerHTML = '<tr><td colspan="3">No game history available</td></tr>';
            }
        } catch (error) {
            console.error('Error loading game history:', error);
            gameHistoryTable.innerHTML = '<tr><td colspan="3">Failed to load game history</td></tr>';
        }
    }
    
    // Function to record a win
    async function recordWin() {
        const winnerIndex = document.getElementById('winner').value;
        const gameDate = document.getElementById('game-date').value;
        
        // Validate inputs
        if (winnerIndex === "" || !gameDate) {
            showNotification('Please select a winner and date', true);
            return;
        }
        
        try {
            const response = await fetch('/record-win', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    winnerIndex: parseInt(winnerIndex),
                    gameDate,
                    playerNames
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification(`Win recorded for ${playerNames[parseInt(winnerIndex)]}`);
                
                // Reset form
                document.getElementById('winner').selectedIndex = 0;
                document.getElementById('game-date').valueAsDate = new Date();
                
                loadScores(); // Reload scores after update
                loadGameHistory(); // Reload game history
            } else {
                showNotification(data.message || 'Failed to record win', true);
            }
        } catch (error) {
            console.error('Error recording win:', error);
            showNotification('Failed to record win', true);
        }
    }
    
    // Function to delete a game
    async function deleteGame(gameIndex) {
        try {
            const response = await fetch('/delete-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameIndex })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Game deleted successfully');
                loadScores(); // Reload scores after update
                loadGameHistory(); // Reload game history
            } else {
                showNotification(data.message || 'Failed to delete game', true);
            }
        } catch (error) {
            console.error('Error deleting game:', error);
            showNotification('Failed to delete game', true);
        }
    }
    
    // Function to reset all scores
    async function resetAllScores() {
        try {
            const response = await fetch('/reset-scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('All scores have been reset to zero');
                loadScores(); // Reload scores after update
            } else {
                showNotification(data.message || 'Failed to reset scores', true);
            }
        } catch (error) {
            console.error('Error resetting scores:', error);
            showNotification('Failed to reset scores', true);
        }
    }
    
    // Function to display scores on the page
    function displayScores(scores) {
        if (scores && scores.length >= 3) {
            // Display player names from column 0 and scores from column 1
            // Update player names if they exist in the data
            if (scores[0][0]) {
                player1NameDisplay.textContent = scores[0][0];
                document.getElementById('winner-option-0').textContent = scores[0][0];
            }
            if (scores[1][0]) {
                player2NameDisplay.textContent = scores[1][0];
                document.getElementById('winner-option-1').textContent = scores[1][0];
            }
            if (scores[2][0]) {
                player3NameDisplay.textContent = scores[2][0];
                document.getElementById('winner-option-2').textContent = scores[2][0];
            }
            
            // Display scores from column 1
            player1ScoreDisplay.textContent = scores[0][1] || '0';
            player2ScoreDisplay.textContent = scores[1][1] || '0';
            player3ScoreDisplay.textContent = scores[2][1] || '0';
        } else {
            player1ScoreDisplay.textContent = '0';
            player2ScoreDisplay.textContent = '0';
            player3ScoreDisplay.textContent = '0';
        }
    }
    
    // Function to display game history
    function displayGameHistory(history) {
        if (history && history.length > 0) {
            // Clear existing rows
            gameHistoryTable.innerHTML = '';
            
            // Add history rows (most recent first)
            history.forEach(game => {
                const row = document.createElement('tr');
                
                const dateCell = document.createElement('td');
                dateCell.textContent = formatDate(game.date);
                
                const winnerCell = document.createElement('td');
                winnerCell.textContent = playerNames[game.winnerIndex] || 'Unknown';
                
                const actionsCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete-btn';
                deleteButton.addEventListener('click', () => {
                    showConfirmDialog(
                        'Delete Game', 
                        `Are you sure you want to delete this game won by ${playerNames[game.winnerIndex]}?`,
                        () => deleteGame(game.index)
                    );
                });
                actionsCell.appendChild(deleteButton);
                
                row.appendChild(dateCell);
                row.appendChild(winnerCell);
                row.appendChild(actionsCell);
                
                gameHistoryTable.appendChild(row);
            });
        } else {
            gameHistoryTable.innerHTML = '<tr><td colspan="3">No game history available</td></tr>';
        }
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Function to show notification
    function showNotification(message, isError = false) {
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        if (isError) {
            notification.style.backgroundColor = '#e74c3c';
        } else {
            notification.style.backgroundColor = 'var(--primary-color)';
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}); 