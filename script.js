const boardSize = 9;
const boardElement = document.getElementById('sudoku-board');
const messageElement = document.getElementById('message');
let stepMode = false;
let solvingSteps = [];
let stepIndex = 0;

// --- Accessibility helpers ---
function focusFirstCell() {
    const firstInput = boardElement.querySelector('input');
    if (firstInput) firstInput.focus();
}

// --- Board creation and UI helpers ---
function createBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        let tr = document.createElement('tr');
        for (let col = 0; col < boardSize; col++) {
            let td = document.createElement('td');
            if (col % 3 === 0) td.classList.add('block-left');
            if (row % 3 === 0) td.classList.add('block-top');
            if (col === 8) td.classList.add('block-right');
            if (row === 8) td.classList.add('block-bottom');
            let input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.inputMode = "numeric";
            input.pattern = "[1-9]";
            input.setAttribute('aria-label', `Row ${row+1} Column ${col+1}`);
            input.autocomplete = "off";
            input.oninput = function () {
                this.value = this.value.replace(/[^1-9]/g, '');
                validateCell(row, col, this.value);
            };
            // Keyboard navigation: arrow keys, tab
            input.addEventListener('keydown', (e) => handleKeyNav(e, row, col));
            td.appendChild(input);
            tr.appendChild(td);
        }
        boardElement.appendChild(tr);
    }
    focusFirstCell();
}

function getBoard() {
    let grid = [];
    const rows = boardElement.querySelectorAll('tr');
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

function setBoard(grid, highlightSolved = false, highlightHint = null) {
    const rows = boardElement.querySelectorAll('tr');
    for (let r = 0; r < boardSize; r++) {
        let cells = rows[r].querySelectorAll('input');
        for (let c = 0; c < boardSize; c++) {
            let cell = cells[c];
            let oldVal = cell.value;
            let newVal = grid[r][c] === 0 ? "" : grid[r][c];
            cell.value = newVal;
            cell.classList.remove('given-cell', 'solved-cell', 'hint-cell', 'invalid-cell');
            if (highlightHint && highlightHint[0] === r && highlightHint[1] === c) {
                cell.classList.add('hint-cell');
            } else if (oldVal !== "" && newVal === oldVal) {
                cell.classList.add('given-cell');
            } else if (highlightSolved && newVal !== "" && oldVal !== newVal) {
                cell.classList.add('solved-cell');
            }
        }
    }
}

// --- Input Validation ---
function isGridValid(grid) {
    // Check no duplicate in rows, columns, blocks
    for (let i = 0; i < boardSize; i++) {
        let rowSet = new Set(), colSet = new Set();
        for (let j = 0; j < boardSize; j++) {
            let rVal = grid[i][j], cVal = grid[j][i];
            if (rVal) {
                if (rowSet.has(rVal)) return false;
                rowSet.add(rVal);
            }
            if (cVal) {
                if (colSet.has(cVal)) return false;
                colSet.add(cVal);
            }
        }
    }
    // Check blocks
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
        let blockSet = new Set();
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            let val = grid[3*br + r][3*bc + c];
            if (val) {
                if (blockSet.has(val)) return false;
                blockSet.add(val);
            }
        }
    }
    return true;
}

function validateCell(row, col, val) {
    // Live validation: highlight cell if it breaks Sudoku rules
    if (!val) {
        clearCellHighlight(row, col);
        return;
    }
    let grid = getBoard();
    let n = parseInt(val);
    // Temporarily clear cell for self-check
    grid[row][col] = 0;
    let valid = isSafe(grid, row, col, n);
    grid[row][col] = n;
    let cell = boardElement.rows[row].cells[col].querySelector('input');
    if (!valid) {
        cell.classList.add('invalid-cell');
    } else {
        cell.classList.remove('invalid-cell');
    }
}

function clearCellHighlight(row, col) {
    let cell = boardElement.rows[row].cells[col].querySelector('input');
    cell.classList.remove('invalid-cell');
}

// --- Solver Logic ---
// Backtracking with step recording and MRV optimization
function isSafe(board, row, col, num) {
    for (let x = 0; x < boardSize; x++) {
        if (board[row][x] === num || board[x][col] === num) return false;
    }
    const startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (board[i + startRow][j + startCol] === num) return false;
    return true;
}

// MRV: find cell with fewest possibilities
function findEmptyWithMRV(board) {
    let minChoices = 10, minCell = null;
    for (let r = 0; r < boardSize; r++) for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === 0) {
            let choices = [];
            for (let n = 1; n <= 9; n++) if (isSafe(board, r, c, n)) choices.push(n);
            if (choices.length < minChoices) {
                minChoices = choices.length;
                minCell = { r, c, choices };
                if (minChoices === 1) break;
            }
        }
    }
    return minCell;
}

function solve(board, steps = null) {
    let cell = findEmptyWithMRV(board);
    if (!cell) return true;
    let { r, c, choices } = cell;
    for (let i = 0; i < choices.length; i++) {
        let num = choices[i];
        if (isSafe(board, r, c, num)) {
            board[r][c] = num;
            if (steps) steps.push({ row: r, col: c, val: num });
            if (solve(board, steps)) return true;
            board[r][c] = 0;
            if (steps) steps.push({ row: r, col: c, val: 0 });
        }
    }
    return false;
}

// --- Step Mode (Visualization) ---
function startStepSolve() {
    let board = getBoard();
    if (!isGridValid(board)) {
        showMessage("Initial puzzle is invalid!", "error");
        return;
    }
    solvingSteps = [];
    solve(JSON.parse(JSON.stringify(board)), solvingSteps);
    stepIndex = 0;
    showMessage("Step mode: use Step button to advance.");
    doStep();
}

function doStep() {
    if (stepIndex >= solvingSteps.length) {
        showMessage("Solved! Step mode complete.");
        return;
    }
    let grid = getBoard();
    let { row, col, val } = solvingSteps[stepIndex];
    grid[row][col] = val;
    setBoard(grid, false);
    stepIndex++;
}

// --- Hint Feature ---
function giveHint() {
    let board = getBoard();
    if (!isGridValid(board)) {
        showMessage("Initial puzzle is invalid!", "error");
        return;
    }
    let solution = JSON.parse(JSON.stringify(board));
    if (!solve(solution)) {
        showMessage("No solution found for this puzzle.", "error");
        return;
    }
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (board[r][c] === 0) {
                board[r][c] = solution[r][c];
                setBoard(board, false, [r, c]);
                showMessage(`Hint: Cell (${r+1},${c+1}) filled with ${solution[r][c]}.`);
                return;
            }
        }
    }
    showMessage("Board already complete.");
}

// --- Save/Load Feature ---
function saveBoard() {
    let grid = getBoard();
    let data = JSON.stringify(grid);
    let blob = new Blob([data], {type:"application/json"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = "sudoku-board.json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadBoardFile(e) {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = (event) => {
        try {
            let grid = JSON.parse(event.target.result);
            if (Array.isArray(grid) && grid.length === 9 && grid.every(row => Array.isArray(row) && row.length === 9)) {
                setBoard(grid);
                showMessage("Board loaded from file.");
            } else throw new Error();
        } catch {
            showMessage("Invalid file format!", "error");
        }
    };
    reader.readAsText(file);
}

// --- Multiple Sample Puzzles ---
const samples = [
    [
        [5,3,0, 0,7,0, 0,0,0], [6,0,0, 1,9,5, 0,0,0], [0,9,8, 0,0,0, 0,6,0],
        [8,0,0, 0,6,0, 0,0,3], [4,0,0, 8,0,3, 0,0,1], [7,0,0, 0,2,0, 0,0,6],
        [0,6,0, 0,0,0, 2,8,0], [0,0,0, 4,1,9, 0,0,5], [0,0,0, 0,8,0, 0,7,9]
    ],
    [
        [0,2,0,6,0,8,0,0,0], [5,8,0,0,0,9,7,0,0], [0,0,0,0,4,0,0,0,0],
        [3,7,0,0,0,0,5,0,0], [6,0,0,0,0,0,0,0,4], [0,0,8,0,0,0,0,1,3],
        [0,0,0,0,2,0,0,0,0], [0,0,9,8,0,0,0,3,6], [0,0,0,3,0,6,0,9,0]
    ]
];

// --- Message UI ---
function showMessage(msg, type = "info") {
    messageElement.textContent = msg;
    if (type === "error") messageElement.style.color = "#ff5252";
    else messageElement.style.color = "#ffeb3b";
}

// --- Keyboard Navigation ---
function handleKeyNav(e, row, col) {
    const move = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] };
    if (move[e.key]) {
        e.preventDefault();
        let [dr, dc] = move[e.key];
        let nr = (row + dr + boardSize) % boardSize;
        let nc = (col + dc + boardSize) % boardSize;
        boardElement.rows[nr].cells[nc].querySelector('input').focus();
    }
}

// --- Button Handlers ---
document.getElementById('solve-btn').onclick = () => {
    let board = getBoard();
    if (!isGridValid(board)) {
        showMessage("Initial puzzle is invalid!", "error");
        return;
    }
    let original = JSON.parse(JSON.stringify(board));
    if (solve(board)) {
        setBoard(board, true);
        showMessage("Solved!");
    } else {
        setBoard(original);
        showMessage("No solution found.", "error");
    }
};
document.getElementById('clear-btn').onclick = () => {
    createBoard();
    showMessage("");
};
document.getElementById('sample-btn').onclick = () => {
    setBoard(samples[0]);
    showMessage("Sample puzzle loaded!");
};
document.getElementById('sample2-btn').onclick = () => {
    setBoard(samples[1]);
    showMessage("Another sample loaded!");
};
document.getElementById('hint-btn').onclick = giveHint;
document.getElementById('step-btn').onclick = () => {
    if (!stepMode) {
        stepMode = true;
        startStepSolve();
    } else {
        doStep();
    }
};
document.getElementById('save-btn').onclick = saveBoard;
document.getElementById('load-btn').onclick = () => document.getElementById('file-input').click();
document.getElementById('file-input').onchange = loadBoardFile;

// --- Initialize on load ---
window.onload = () => {
    createBoard();
    showMessage("Enter a puzzle or load a sample to begin.");
};

// --- Accessibility: focus board on load ---
window.addEventListener('DOMContentLoaded', focusFirstCell);
