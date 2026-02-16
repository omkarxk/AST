const STORAGE_KEY = "ast_attendance_app_state_v2";

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

const defaultState = {
  totalClasses: 42,
  attendedClasses: 36,
  visibilityPublic: true,
  goalPercent: 85,
  searchQuery: "",
  logFilter: "All",
  logs: [],
  undoStack: [],
  profile: {
    name: "Avery Johnson",
    roll: "NB-2026-1042",
    className: "Grade 10",
    section: "A",
    email: "avery.johnson@northbridge.edu",
    phone: "+1 415 555 0182",
  },
};

const state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      profile: { ...defaultState.profile, ...(parsed.profile || {}) },
      undoStack: Array.isArray(parsed.undoStack) ? parsed.undoStack : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function snapshotAttendance() {
  state.undoStack.push({
    totalClasses: state.totalClasses,
    attendedClasses: state.attendedClasses,
  });
  state.undoStack = state.undoStack.slice(-20);
}

function addLog(type, action) {
  const percentValue = calculatePercentage(state.totalClasses, state.attendedClasses);
  state.logs.unshift({
    type,
    action,
    time: new Date().toLocaleString(),
    total: state.totalClasses,
    attended: state.attendedClasses,
    percent: formatPercent(percentValue),
    percentValue,
  });
  state.logs = state.logs.slice(0, 40);
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

function renderTrendChart() {
  const line = document.getElementById("trendLine");
  const area = document.getElementById("trendArea");
  const recent = state.logs
    .slice(0, 10)
    .reverse()
    .map((entry) => (typeof entry.percentValue === "number" ? entry.percentValue : 0));

  const source = recent.length ? recent : [calculatePercentage(state.totalClasses, state.attendedClasses)];
  while (source.length < 10) source.unshift(source[0]);

  const step = 720 / (source.length - 1);
  const points = source.map((value, index) => {
    const x = Math.round(index * step);
    const y = Math.round(200 - Math.min(100, Math.max(0, value)) * 1.5);
    return [x, y];
  });

  const pointString = points.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath = `M${points.map(([x, y]) => `${x},${y}`).join(" L")} L720,240 L0,240 Z`;
  line.setAttribute("points", pointString);
  area.setAttribute("d", areaPath);
}

function renderLogRows() {
  const root = document.getElementById("logRows");
  const query = state.searchQuery.trim().toLowerCase();

  const filtered = state.logs.filter((entry) => {
    const filterMatches = state.logFilter === "All" || entry.type === state.logFilter;
    if (!filterMatches) return false;
    if (!query) return true;
    const blob = `${entry.type} ${entry.action} ${entry.time} ${entry.total} ${entry.attended} ${entry.percent}`.toLowerCase();
    return blob.includes(query);
  });

  if (!filtered.length) {
    root.innerHTML = `
      <tr>
        <td colspan="5">No records match your current filters.</td>
      </tr>
    `;
    return;
  }

  root.innerHTML = filtered
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
  const toggle = document.getElementById("visibilityToggle");

  toggle.checked = state.visibilityPublic;
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

function updateProfileUI() {
  const { profile } = state;
  const roleText = `${profile.className} • Sec ${profile.section}`;
  document.querySelector(".profile-name").textContent = profile.name;
  document.getElementById("sidebarRole").textContent = `Student • ${roleText}`;
  document.querySelector(".avatar").textContent = initials(profile.name) || "ST";

  document.getElementById("publicName").textContent = profile.name;
  document.getElementById("publicClass").textContent = roleText;
  document.getElementById("publicRoll").textContent = profile.roll;

  document.getElementById("profileNameInput").value = profile.name;
  document.getElementById("rollNumberInput").value = profile.roll;
  document.getElementById("classInput").value = profile.className;
  document.getElementById("sectionInput").value = profile.section;
  document.getElementById("emailInput").value = profile.email;
  document.getElementById("phoneInput").value = profile.phone;
}

function updateMetricsUI() {
  const total = state.totalClasses;
  const attended = state.attendedClasses;
  const missed = total - attended;
  const percent = calculatePercentage(total, attended);
  const canMiss = classesCanMiss(total, attended);
  const deltaFromGoal = percent - state.goalPercent;

  document.getElementById("kpiTotalClasses").textContent = String(total);
  document.getElementById("kpiAttendedClasses").textContent = String(attended);
  document.getElementById("kpiMissedClasses").textContent = String(missed);
  document.getElementById("kpiAttendancePercent").textContent = formatPercent(percent);
  document.getElementById("attendancePercentLarge").textContent = formatPercent(percent);
  document.getElementById("currentPercent").textContent = formatPercent(percent);
  document.getElementById("profilePercent").textContent = formatPercent(percent);
  document.getElementById("attendanceProgress").style.width = `${Math.min(percent, 100)}%`;

  const trackerMessage = document.getElementById("trackerMessage");
  if (percent >= state.goalPercent) {
    trackerMessage.textContent = "Excellent. You are meeting your target.";
  } else if (percent >= 75) {
    trackerMessage.textContent = "Above minimum, keep attending to hit your goal.";
  } else {
    trackerMessage.textContent = "Warning: below 75%. Mark more present classes to recover.";
  }

  const safeBunk = document.getElementById("safeBunk");
  if (canMiss >= 0) {
    safeBunk.textContent = String(canMiss);
  } else {
    safeBunk.textContent = `Need ${classesNeededToRecover(total, attended)}`;
  }

  document.getElementById("goalRange").value = String(state.goalPercent);
  document.getElementById("goalValue").textContent = `${state.goalPercent}%`;
  const goalMessage = document.getElementById("goalMessage");
  if (deltaFromGoal >= 0) {
    goalMessage.textContent = `You are +${deltaFromGoal.toFixed(1)}% above your target.`;
  } else {
    goalMessage.textContent = `You are ${Math.abs(deltaFromGoal).toFixed(1)}% away from your target.`;
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
  const attendanceForm = document.getElementById("attendanceForm");
  const profileForm = document.getElementById("profileForm");
  const presentBtn = document.getElementById("markPresentBtn");
  const absentBtn = document.getElementById("markAbsentBtn");
  const undoBtn = document.getElementById("undoBtn");
  const resetBtn = document.getElementById("resetBtn");
  const visibilityToggle = document.getElementById("visibilityToggle");
  const goalRange = document.getElementById("goalRange");
  const logFilter = document.getElementById("logFilter");
  const searchInput = document.getElementById("globalSearch");
  const clearLogBtn = document.getElementById("clearLogBtn");

  attendanceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    snapshotAttendance();
    const next = sanitizeAttendance(Number(totalInput.value), Number(attendedInput.value));
    state.totalClasses = next.totalClasses;
    state.attendedClasses = next.attendedClasses;
    addLog("Manual", "Manual totals updated");
    render();
  });

  presentBtn.addEventListener("click", () => {
    snapshotAttendance();
    state.totalClasses += 1;
    state.attendedClasses += 1;
    addLog("Present", "Marked present for class");
    render();
  });

  absentBtn.addEventListener("click", () => {
    snapshotAttendance();
    state.totalClasses += 1;
    addLog("Absent", "Marked absent for class");
    render();
  });

  undoBtn.addEventListener("click", () => {
    const previous = state.undoStack.pop();
    if (!previous) return;
    state.totalClasses = previous.totalClasses;
    state.attendedClasses = previous.attendedClasses;
    addLog("Manual", "Undid last attendance action");
    render();
  });

  resetBtn.addEventListener("click", () => {
    snapshotAttendance();
    state.totalClasses = 0;
    state.attendedClasses = 0;
    addLog("Manual", "Attendance counters reset");
    render();
  });

  visibilityToggle.addEventListener("change", () => {
    state.visibilityPublic = visibilityToggle.checked;
    addLog("Profile", `Visibility set to ${state.visibilityPublic ? "Public" : "Private"}`);
    render();
  });

  goalRange.addEventListener("input", () => {
    state.goalPercent = Number(goalRange.value);
    render();
  });

  goalRange.addEventListener("change", () => {
    addLog("Manual", `Goal changed to ${state.goalPercent}%`);
    render();
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.profile = {
      name: document.getElementById("profileNameInput").value.trim() || defaultState.profile.name,
      roll: document.getElementById("rollNumberInput").value.trim() || defaultState.profile.roll,
      className: document.getElementById("classInput").value.trim() || defaultState.profile.className,
      section: document.getElementById("sectionInput").value.trim() || defaultState.profile.section,
      email: document.getElementById("emailInput").value.trim() || defaultState.profile.email,
      phone: document.getElementById("phoneInput").value.trim() || defaultState.profile.phone,
    };
    addLog("Profile", "Student profile details updated");
    render();
  });

  logFilter.addEventListener("change", () => {
    state.logFilter = logFilter.value;
    renderLogRows();
    saveState();
  });

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    renderLogRows();
    saveState();
  });

  clearLogBtn.addEventListener("click", () => {
    state.logs = [];
    render();
  });
}

function render() {
  document.getElementById("totalClassesInput").value = String(state.totalClasses);
  document.getElementById("attendedClassesInput").value = String(state.attendedClasses);
  document.getElementById("goalRange").value = String(state.goalPercent);
  document.getElementById("logFilter").value = state.logFilter;
  document.getElementById("globalSearch").value = state.searchQuery;

  updateMetricsUI();
  updateProfileUI();
  updateVisibilityUI();
  renderLogRows();
  renderTrendChart();
  saveState();
}

renderBars();
renderCalendar(new Date());
bindEvents();
if (!state.logs.length) addLog("Manual", "Initial totals loaded");
render();
