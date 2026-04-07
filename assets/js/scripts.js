// --- Persistence & State ---
let hiScore = localStorage.getItem('snake-hi-score') || 0;
let dx = 0; 
let dy = 0;
let inputQueue = []; 

function updateClock() {
  const now = new Date();
  const timeString = now
    .toLocaleTimeString("en-US", { hour12: true })
    .toUpperCase();
  document.getElementById("clock").innerText = timeString;
}

function updateCurrentLogDate() {
  const now = new Date();
  const year = now.getFullYear();
  // Months are 0-indexed, so we add 1 and pad with a leading zero if needed
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const formattedDate = `[${year}/${month}]`;
  document.getElementById("current-log-time").innerText = formattedDate;
}

// 2. Dynamic Uptime (YOE) Calculation
function calculateUptime() {
  const startDate = new Date("2024-02-01"); // February 2024
  const now = new Date();

  // Total difference in milliseconds
  const diffTime = Math.abs(now - startDate);

  // Calculate years and decimal of months
  const totalDays = diffTime / (1000 * 60 * 60 * 24);
  const years = totalDays / 365.25;

  // Display with 1 decimal place (e.g., 2.1)
  document.getElementById("uptime-val").innerText = years.toFixed(1) + " YRS";
}

async function fetchGithubActivity(year = "") {
  const container = document.getElementById("github-graph");
  const monthContainer = document.getElementById("month-labels");
  container.innerHTML = `<div class="loading-text">Fetching Year: ${year || "Current"}...</div>`;
  monthContainer.innerHTML = "";

  try {
    const url = `https://api.marshallcodes.com/api/githubChart/${year ? "?year=" + year : ""}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    container.innerHTML = "";

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    let lastMonth = -1;

    // 1. CALCULATE OFFSET: Determine the day of the week for the first date
    // .getDay() returns 0 for Sunday, 1 for Monday, etc.
    const firstDate = new Date(data.days[0].date + "T00:00:00");
    const startDay = firstDate.getDay();

    // 2. INSERT SPACERS: Fill the beginning of the first column with empty cells
    for (let i = 0; i < startDay; i++) {
      const spacer = document.createElement("div");
      // Do not give it the 'commit-day' class so it stays invisible
      container.appendChild(spacer);
    }

    data.days.forEach((day, index) => {
      // 3. Create the Brick
      const div = document.createElement("div");
      div.className = "commit-day";
      div.setAttribute(
        "data-tooltip",
        `${day.count} ${day.count === 1 ? "commit" : "commits"} on ${day.date}`,
      );

      if (day.count > 0 && day.count < 3) div.classList.add("day-level-1");
      else if (day.count >= 3 && day.count < 6)
        div.classList.add("day-level-2");
      else if (day.count >= 6 && day.count < 9)
        div.classList.add("day-level-3");
      else if (day.count >= 9) div.classList.add("day-level-4");

      container.appendChild(div);

      // 4. IMPROVED MONTH LOGIC: Check every day to find exactly where a month starts
      const dateObj = new Date(day.date + "T00:00:00");
      const currentMonth = dateObj.getMonth();

      if (currentMonth !== lastMonth) {
        const monthSpan = document.createElement("span");
        monthSpan.innerText = monthNames[currentMonth];

        // Calculate the grid column (accounting for the initial spacers)
        const columnIndex = Math.floor((index + startDay) / 7) + 1;
        monthSpan.style.gridColumnStart = columnIndex;

        monthContainer.appendChild(monthSpan);
        lastMonth = currentMonth;
      }
    });
  } catch (err) {
    console.error("Fetch Error:", err);
    container.innerHTML =
      '<div class="loading-text" style="color: #f85149;">Connection Timeout: GitHub API Unreachable</div>';
  }
}

// --- Snake Game Logic ---
const canvas = document.getElementById('snakeCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const scoreEl = document.getElementById('snake-score');
const hiScoreEl = document.getElementById('snake-hi-score');
const startBtn = document.getElementById('start-game');
const overlay = document.getElementById('game-overlay');

let snake = [];
let food = {};
let score = 0;
let gameInterval;
const gridSize = 20;
let cols, rows;

function resizeCanvas() {
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    const parentW = parent.clientWidth;
    const parentH = parent.clientHeight;
    
    cols = Math.floor(parentW / gridSize);
    rows = Math.floor(parentH / gridSize);
    
    // Set internal resolution AND implicit CSS dimensions
    canvas.width = cols * gridSize;
    canvas.height = rows * gridSize;
}

function initSnakeGame() {
    resizeCanvas();
    overlay.style.display = 'none';
    inputQueue = []; 
    
    const statusTag = document.querySelector('.snake-subsystem .status-tag');
    if (statusTag) {
        statusTag.innerText = "RUNNING";
        statusTag.style.color = "var(--success)";
    }

    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    snake = [{x: startX, y: startY}];
    
    generateFood();
    dx = 1; dy = 0; 
    score = 0;
    if (scoreEl) scoreEl.innerText = "00";
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 150); 
}

function gameLoop() {
    if (inputQueue.length > 0) {
        const nextMove = inputQueue.shift();
        dx = nextMove.x;
        dy = nextMove.y;
    }

    moveSnake();
    if (checkCollision()) {
        handleGameOver();
        return;
    }
    draw();
}

function handleGameOver() {
    clearInterval(gameInterval);
    overlay.style.display = 'flex';
    
    const statusTag = document.querySelector('.snake-subsystem .status-tag');
    if (statusTag) {
        statusTag.innerText = "GAME OVER";
        statusTag.style.color = "#f85149";
    }

    if (score > hiScore) {
        hiScore = score;
        localStorage.setItem('snake-hi-score', hiScore);
        if (hiScoreEl) hiScoreEl.innerText = hiScore.toString().padStart(2, '0');
    }
}

function moveSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score++;
        if (scoreEl) scoreEl.innerText = score.toString().padStart(2, '0');
        generateFood();
    } else {
        snake.pop();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f85149';
    ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
    
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#fff' : '#a5c3cf';
        ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
    });
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows)
    };
    
    const onSnake = snake.some(part => part.x === food.x && part.y === food.y);
    if (onSnake) generateFood();
}

function checkCollision() {
    const head = snake[0];
    const hitWall = head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    const hitSelf = snake.slice(1).some(part => part.x === head.x && part.y === head.y);
    return hitWall || hitSelf;
}

function handleDirectionChange(key) {
    let requestedMove;
    switch(key) {
        case 'ArrowUp': case 'ctrl-up': requestedMove = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 'ctrl-down': requestedMove = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'ctrl-left': requestedMove = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'ctrl-right': requestedMove = { x: 1, y: 0 }; break;
        default: return;
    }

    const lastIntendedDir = inputQueue.length > 0 
        ? inputQueue[inputQueue.length - 1] 
        : { x: dx, y: dy };

    const isReversal = (requestedMove.x === -lastIntendedDir.x && requestedMove.y === -lastIntendedDir.y);
    const isSame = (requestedMove.x === lastIntendedDir.x && requestedMove.y === lastIntendedDir.y);

    // Prevent reversals, prevent duplicating the same move, limit queue size
    if (!isReversal && !isSame && inputQueue.length < 2) {
        inputQueue.push(requestedMove);
    }
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  calculateUptime();
  updateCurrentLogDate();
  fetchGithubActivity();

  if (hiScoreEl) hiScoreEl.innerText = hiScore.toString().padStart(2, '0');

  window.addEventListener('keydown', e => {
      if (overlay && overlay.style.display === 'none') {
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
              handleDirectionChange(e.key);
          }
      }
  });

  ['ctrl-up', 'ctrl-down', 'ctrl-left', 'ctrl-right'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
          const trigger = (e) => {
              e.preventDefault();
              handleDirectionChange(id);
          };
          btn.addEventListener('click', trigger);
          btn.addEventListener('touchstart', trigger, {passive: false});
      }
  });

  if (canvas && startBtn) startBtn.addEventListener('click', initSnakeGame);

  document.querySelectorAll(".log-row").forEach((row) => {
    row.addEventListener("click", () => {
      const isOpen = row.classList.contains("open");
      row.setAttribute("aria-expanded", isOpen);
    });
  });

  const container = document.getElementById("github-graph");
  const popover = document.getElementById("tooltip-popover");

  container.addEventListener("mouseover", (e) => {
    const day = e.target.closest(".commit-day");
    if (!day) return;

    const text = day.getAttribute("data-tooltip");
    popover.textContent = text;

    // Show the popover
    popover.showPopover();

    // Position it
    const rect = day.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    // Calculate position: Centered above the square
    const top = rect.top - popoverRect.height - 8;
    const left = rect.left + rect.width / 2 - popoverRect.width / 2;

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  });

  container.addEventListener("mouseout", (e) => {
    if (e.target.closest(".commit-day")) {
      popover.hidePopover();
    }
  });
});
