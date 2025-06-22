// Initialize Sudoku board
const boardSize = 9;

function createBoard() {
    const table = document.getElementById('sudoku-board');
    table.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        let tr = document.createElement('tr');
        for (let col = 0; col < boardSize; col++) {
            let td = document.createElement('td');
            // Add classes for thick borders on blocks
            if (col % 3 === 0) td.classList.add('block-left');
            if (row % 3 === 0) td.classList.add('block-top');
            if (col === 8) td.classList.add('block-right');
            if (row === 8) td.classList.add('block-bottom');
            let input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.inputMode = "numeric";
            input.pattern = "[1-9]";
            input.autocomplete = "off";
            input.oninput = function () {
                this.value = this.value.replace(/[^1-9]/g, '');
            };
            td.appendChild(input);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}

function getBoard() {
    let grid = [];
    const rows = document.querySelectorAll('#sudoku-board tr');
    rows.forEach(row => {
        let cells = row.querySelectorAll('input');
        let rowData = [];
        cells.forEach(cell => {
            let val = cell.value;
            rowData.push(val === "" ? 0 : parseInt(val));
        });
        grid.push(rowData);
    });
    return grid;
}

function setBoard(grid) {
    const rows = document.querySelectorAll('#sudoku-board tr');
    for (let r = 0; r < boardSize; r++) {
        let cells = rows[r].querySelectorAll('input');
        for (let c = 0; c < boardSize; c++) {
            cells[c].value = grid[r][c] === 0 ? "" : grid[r][c];
        }
    }
}

// Simple backtracking Sudoku solver
function isSafe(board, row, col, num) {
    for (let x = 0; x < boardSize; x++) {
        if (board[row][x] === num || board[x][col] === num)
            return false;
    }
    const startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i + startRow][j + startCol] === num)
                return false;
        }
    }
    return true;
}

function solve(board) {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isSafe(board, row, col, num)) {
                        board[row][col] = num;
                        if (solve(board))
                            return true;
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function solveSudoku() {
    let board = getBoard();
    let original = JSON.parse(JSON.stringify(board));
    document.getElementById('message').textContent = "";
    if (solve(board)) {
        setBoard(board);
        document.getElementById('message').textContent = "Solved!";
    } else {
        setBoard(original); // restore original on failure
        document.getElementById('message').textContent = "No solution found.";
    }
}

function clearBoard() {
    createBoard();
    document.getElementById('message').textContent = "";
}

function fillSample() {
    // Simple sample puzzle (0 = empty)
    let sample = [
        [5,3,0, 0,7,0, 0,0,0],
        [6,0,0, 1,9,5, 0,0,0],
        [0,9,8, 0,0,0, 0,6,0],
        [8,0,0, 0,6,0, 0,0,3],
        [4,0,0, 8,0,3, 0,0,1],
        [7,0,0, 0,2,0, 0,0,6],
        [0,6,0, 0,0,0, 2,8,0],
        [0,0,0, 4,1,9, 0,0,5],
        [0,0,0, 0,8,0, 0,7,9]
    ];
    setBoard(sample);
    document.getElementById('message').textContent = "Sample puzzle loaded!";
}

// Initialize board on load
window.onload = createBoard;