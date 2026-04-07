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

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  calculateUptime();
  updateCurrentLogDate();
  fetchGithubActivity();

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
