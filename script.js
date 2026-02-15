const classData = [
  { name: "Nursery", value: 254 },
  { name: "Class I", value: 620 },
  { name: "Class II", value: 912 },
  { name: "Class III", value: 968 },
  { name: "Class IV", value: 650 },
  { name: "Class V", value: 902 },
  { name: "Class VI", value: 700 },
  { name: "Class VII", value: 806 },
  { name: "Class VIII", value: 530 },
  { name: "Class IX", value: 835 },
];

const state = {
  totalClasses: 42,
  attendedClasses: 36,
  visibilityPublic: true,
  logs: [],
};

function sanitizeAttendance(total, attended) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const safeAttended = Number.isFinite(attended) ? Math.max(0, Math.floor(attended)) : 0;
  return {
    totalClasses: safeTotal,
    attendedClasses: Math.min(safeAttended, safeTotal),
  };
}

function calculatePercentage(total, attended) {
  if (!total) return 0;
  return (attended / total) * 100;
}

function classesCanMiss(total, attended) {
  if (!total) return 0;
  return Math.floor(attended / 0.75 - total);
}

function classesNeededToRecover(total, attended) {
  const deficit = 0.75 * total - attended;
  if (deficit <= 0) return 0;
  return Math.ceil(deficit / 0.25);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function addLog(action) {
  const percent = calculatePercentage(state.totalClasses, state.attendedClasses);
  state.logs.unshift({
    time: new Date().toLocaleString(),
    action,
    total: state.totalClasses,
    attended: state.attendedClasses,
    percent: formatPercent(percent),
  });
  state.logs = state.logs.slice(0, 12);
}

function renderBars() {
  const root = document.getElementById("bars");
  const max = Math.max(...classData.map((x) => x.value));
  root.innerHTML = classData
    .map((item) => {
      const height = Math.round((item.value / max) * 140 + 24);
      return `
        <article class="bar-card">
          <div class="bar" style="height:${height}px"><span>${item.value}</span></div>
          <p>${item.name}</p>
        </article>
      `;
    })
    .join("");
}

function renderLogRows() {
  const root = document.getElementById("logRows");
  if (!state.logs.length) {
    root.innerHTML = `
      <tr>
        <td colspan="5">No activity yet. Use the tracker buttons to log attendance.</td>
      </tr>
    `;
    return;
  }

  root.innerHTML = state.logs
    .map(
      (entry) => `
      <tr>
        <td>${entry.time}</td>
        <td>${entry.action}</td>
        <td>${entry.total}</td>
        <td>${entry.attended}</td>
        <td>${entry.percent}</td>
      </tr>
    `
    )
    .join("");
}

function updateVisibilityUI() {
  const badge = document.getElementById("profileBadge");
  const hint = document.getElementById("visibilityHint");
  const card = document.getElementById("publicProfile");

  if (state.visibilityPublic) {
    badge.textContent = "Public";
    badge.classList.remove("private");
    hint.textContent = "Visible to teachers and class mentors.";
    card.classList.remove("hidden");
  } else {
    badge.textContent = "Private";
    badge.classList.add("private");
    hint.textContent = "Only you can view your detailed profile.";
    card.classList.add("hidden");
  }
}

function updateMetricsUI() {
  const total = state.totalClasses;
  const attended = state.attendedClasses;
  const missed = total - attended;
  const percent = calculatePercentage(total, attended);
  const canMiss = classesCanMiss(total, attended);

  document.getElementById("kpiTotalClasses").textContent = String(total);
  document.getElementById("kpiAttendedClasses").textContent = String(attended);
  document.getElementById("kpiMissedClasses").textContent = String(missed);
  document.getElementById("kpiAttendancePercent").textContent = formatPercent(percent);
  document.getElementById("attendancePercentLarge").textContent = formatPercent(percent);
  document.getElementById("currentPercent").textContent = formatPercent(percent);
  document.getElementById("profilePercent").textContent = formatPercent(percent);
  document.getElementById("attendanceProgress").style.width = `${Math.min(percent, 100)}%`;

  const trackerMessage = document.getElementById("trackerMessage");
  if (percent >= 85) {
    trackerMessage.textContent = "Great consistency. You are in a safe attendance range.";
  } else if (percent >= 75) {
    trackerMessage.textContent = "You are above minimum, but avoid too many absences.";
  } else {
    trackerMessage.textContent = "Warning: below 75%. Mark more present classes to recover.";
  }

  const safeBunk = document.getElementById("safeBunk");
  if (canMiss >= 0) {
    safeBunk.textContent = String(canMiss);
  } else {
    safeBunk.textContent = `Need ${classesNeededToRecover(total, attended)}`;
  }
}

function renderCalendar(date) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const year = date.getFullYear();
  const month = date.getMonth();
  const selectedDay = date.getDate();

  document.getElementById("calendarMonth").textContent = date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const grid = document.getElementById("calendar");
  grid.innerHTML = "";

  dayNames.forEach((d) => {
    const n = document.createElement("div");
    n.className = "day-name";
    n.textContent = d;
    grid.appendChild(n);
  });

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const d = document.createElement("div");
    d.className = "day-num muted";
    d.textContent = prevMonthDays - i;
    grid.appendChild(d);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = document.createElement("div");
    d.className = `day-num${day === selectedDay ? " active" : ""}`;
    d.textContent = day;
    grid.appendChild(d);
  }
}

function bindEvents() {
  const totalInput = document.getElementById("totalClassesInput");
  const attendedInput = document.getElementById("attendedClassesInput");
  const form = document.getElementById("attendanceForm");
  const presentBtn = document.getElementById("markPresentBtn");
  const absentBtn = document.getElementById("markAbsentBtn");
  const resetBtn = document.getElementById("resetBtn");
  const visibilityToggle = document.getElementById("visibilityToggle");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = sanitizeAttendance(Number(totalInput.value), Number(attendedInput.value));
    state.totalClasses = next.totalClasses;
    state.attendedClasses = next.attendedClasses;
    addLog("Manual update");
    render();
  });

  presentBtn.addEventListener("click", () => {
    state.totalClasses += 1;
    state.attendedClasses += 1;
    addLog("Marked Present");
    render();
  });

  absentBtn.addEventListener("click", () => {
    state.totalClasses += 1;
    addLog("Marked Absent");
    render();
  });

  resetBtn.addEventListener("click", () => {
    state.totalClasses = 0;
    state.attendedClasses = 0;
    state.logs = [];
    render();
  });

  visibilityToggle.addEventListener("change", () => {
    state.visibilityPublic = visibilityToggle.checked;
    updateVisibilityUI();
  });
}

function render() {
  const totalInput = document.getElementById("totalClassesInput");
  const attendedInput = document.getElementById("attendedClassesInput");

  totalInput.value = String(state.totalClasses);
  attendedInput.value = String(state.attendedClasses);
  updateMetricsUI();
  updateVisibilityUI();
  renderLogRows();
}

renderBars();
renderCalendar(new Date());
bindEvents();
addLog("Initial totals loaded");
render();
