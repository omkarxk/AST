const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English", "Computer Science", "History"];
const state = {
  session: null,
  data: null,
  student: null,
  undoStack: [],
  searchQuery: "",
  logFilter: "All",
  pendingSync: 0,
  theme: localStorage.getItem("ast_theme") || "light",
  themePreset: localStorage.getItem("ast_theme_preset") || "academic",
  charts: { trend: null, classBars: null },
};

function pct(total, attended) {
  if (!total) return 0;
  return (attended / total) * 100;
}

function fmtPct(value) {
  return `${value.toFixed(1)}%`;
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join("");
}

function setAvatar(el, name, photo) {
  if (!el) return;
  if (photo) {
    el.style.backgroundImage = `url("${photo}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.textContent = "";
    return;
  }
  el.style.backgroundImage = "";
  el.textContent = initials(name) || "ST";
}

function selectedLogs() {
  const logs = state.student.logs || [];
  const q = state.searchQuery.trim().toLowerCase();
  return logs.filter((l) => {
    const filterOk = state.logFilter === "All" || l.type === state.logFilter;
    if (!filterOk) return false;
    if (!q) return true;
    const blob = `${l.type} ${l.action} ${l.time} ${l.percent}`.toLowerCase();
    return blob.includes(q);
  });
}

function setTheme(theme) {
  state.theme = theme;
  document.body.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").checked = theme === "dark";
  localStorage.setItem("ast_theme", theme);
}

function setThemePreset(preset) {
  state.themePreset = preset;
  document.body.setAttribute("data-preset", preset);
  const presetSelect = document.getElementById("themePreset");
  if (presetSelect) presetSelect.value = preset;
  localStorage.setItem("ast_theme_preset", preset);
}

function pageByRole(role) {
  if (role === "Teacher") return "Teacher Dashboard";
  if (role === "Admin") return "Admin Control Center";
  return "Student Dashboard";
}

function syncBannerText() {
  if (navigator.onLine) {
    if (state.pendingSync > 0) {
      const text = `Online. Synced ${state.pendingSync} offline actions.`;
      state.pendingSync = 0;
      return text;
    }
    return "Online. All changes are synced.";
  }
  return `Offline mode. ${state.pendingSync} actions pending sync.`;
}

function renderCalendar(date = new Date()) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const grid = document.getElementById("calendar");
  grid.innerHTML = "";
  document.getElementById("calendarMonth").textContent = date.toLocaleString("en-US", { month: "short", year: "numeric" });
  dayNames.forEach((d) => {
    const n = document.createElement("div");
    n.className = "day-name";
    n.textContent = d;
    grid.appendChild(n);
  });
  for (let i = first - 1; i >= 0; i -= 1) {
    const d = document.createElement("div");
    d.className = "day-num muted";
    d.textContent = prevDays - i;
    grid.appendChild(d);
  }
  for (let day = 1; day <= days; day += 1) {
    const d = document.createElement("div");
    d.className = `day-num${day === date.getDate() ? " active" : ""}`;
    d.textContent = day;
    grid.appendChild(d);
  }
}

function renderCharts() {
  const trendEl = document.getElementById("trendChart");
  const classEl = document.getElementById("classChart");
  if (!window.Chart || !trendEl || !classEl) return;

  const trendPoints = (state.student.logs || [])
    .slice(0, 10)
    .reverse()
    .map((l) => (typeof l.percentValue === "number" ? Number(l.percentValue.toFixed(1)) : 0));
  const points = trendPoints.length ? trendPoints : [pct(state.student.totalClasses, state.student.attendedClasses)];
  while (points.length < 10) points.unshift(points[0]);

  const trendCtx = trendEl.getContext("2d");
  const trendGradient = trendCtx.createLinearGradient(0, 0, 0, 220);
  trendGradient.addColorStop(0, "rgba(109,118,247,0.42)");
  trendGradient.addColorStop(1, "rgba(109,118,247,0.05)");

  if (!state.charts.trend) {
    state.charts.trend = new Chart(trendEl, {
      type: "line",
      data: {
        labels: points.map((_, i) => `P${i + 1}`),
        datasets: [
          {
            data: points,
            borderColor: "#6d76f7",
            backgroundColor: trendGradient,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: { label: (ctx) => `Attendance: ${ctx.parsed.y.toFixed(1)}%` },
          },
        },
        scales: { y: { min: 0, max: 100 } },
        responsive: true,
        maintainAspectRatio: true,
      },
    });
  } else {
    state.charts.trend.data.labels = points.map((_, i) => `P${i + 1}`);
    state.charts.trend.data.datasets[0].data = points;
    state.charts.trend.data.datasets[0].backgroundColor = trendGradient;
    state.charts.trend.update("none");
  }

  const bars = [78, 85, 91, 74, 88, 82, 90, 76, 83, 87];
  const classColors = bars.map((v) => (v >= 85 ? "rgba(49,186,146,0.65)" : v < 75 ? "rgba(239,91,102,0.65)" : "rgba(109,118,247,0.65)"));
  if (!state.charts.classBars) {
    state.charts.classBars = new Chart(classEl, {
      type: "bar",
      data: {
        labels: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"],
        datasets: [{ data: bars, backgroundColor: classColors, borderRadius: 8 }],
      },
      options: {
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}% attendance` } },
        },
        scales: { y: { min: 0, max: 100 } },
        responsive: true,
        maintainAspectRatio: true,
      },
    });
  } else {
    state.charts.classBars.data.datasets[0].data = bars;
    state.charts.classBars.data.datasets[0].backgroundColor = classColors;
    state.charts.classBars.update("none");
  }
}

function renderStudentList() {
  const select = document.getElementById("studentSelect");
  select.innerHTML = state.data.students.map((s) => `<option value="${s.id}">${s.name} (${s.roll})</option>`).join("");
  select.value = state.student.id;
}

function renderLogs() {
  const tbody = document.getElementById("logRows");
  const logs = selectedLogs();
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No records found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = logs
    .map((l) => `<tr><td>${l.time}</td><td>${l.action}</td><td>${l.total}</td><td>${l.attended}</td><td>${l.percent}</td></tr>`)
    .join("");
}

function renderNotifications() {
  const root = document.getElementById("notificationList");
  const notes = state.data.notifications || [];
  if (!notes.length) {
    root.innerHTML = `<li><p class="empty-state">No alerts yet.</p></li>`;
    return;
  }
  root.innerHTML = notes
    .slice(0, 6)
    .map((n) => `<li><time>${n.time}</time><p>${n.message}</p></li>`)
    .join("");
}

function renderLeaveRequests() {
  const root = document.getElementById("leaveRows");
  const requests = state.data.leaveRequests || [];
  if (!requests.length) {
    root.innerHTML = `<tr><td colspan="5"><div class="empty-state">No leave requests yet.</div></td></tr>`;
    return;
  }
  root.innerHTML = requests
    .map((r) => {
      const actions =
        r.status === "Pending" && (state.session.role === "Teacher" || state.session.role === "Admin")
          ? `<button type="button" class="btn mini" data-id="${r.id}" data-action="Approved">Approve</button>
             <button type="button" class="btn mini" data-id="${r.id}" data-action="Rejected">Reject</button>`
          : "-";
      return `<tr><td>${r.date}</td><td>${r.reason}</td><td>${r.studentName}</td><td>${r.status}</td><td>${actions}</td></tr>`;
    })
    .join("");
}

function renderHeatmap() {
  const root = document.getElementById("heatmapGrid");
  const today = new Date();
  root.innerHTML = "";
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const value = state.student.dailyAttendance[key] ?? Math.max(45, Math.min(95, state.data.classAveragePercent - 9 + (i % 8)));
    const light = 92 - Math.round((value / 100) * 48);
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.style.backgroundColor = `hsl(227 70% ${light}%)`;
    cell.title = `${key}: ${value}%`;
    root.appendChild(cell);
  }
}

function renderComparison() {
  const sp = pct(state.student.totalClasses, state.student.attendedClasses);
  const cp = state.data.classAveragePercent;
  document.getElementById("compareStudentBar").style.width = `${Math.min(100, sp)}%`;
  document.getElementById("compareClassBar").style.width = `${Math.min(100, cp)}%`;
  document.getElementById("compareStudentText").textContent = fmtPct(sp);
  document.getElementById("compareClassText").textContent = fmtPct(cp);
}

function renderMetrics() {
  const t = state.student.totalClasses;
  const a = state.student.attendedClasses;
  const m = t - a;
  const p = pct(t, a);
  const goal = state.student.goalPercent;
  const canMiss = t ? Math.floor(a / 0.75 - t) : 0;
  const needGoal = Math.max(0, Math.ceil(((goal / 100) * t - a) / (1 - goal / 100)));

  document.getElementById("kpiTotalClasses").textContent = String(t);
  document.getElementById("kpiAttendedClasses").textContent = String(a);
  document.getElementById("kpiMissedClasses").textContent = String(m);
  document.getElementById("kpiAttendancePercent").textContent = fmtPct(p);
  document.getElementById("attendancePercentLarge").textContent = fmtPct(p);
  document.getElementById("attendanceProgress").style.width = `${Math.min(100, p)}%`;
  document.getElementById("currentPercent").textContent = fmtPct(p);
  document.getElementById("profilePercent").textContent = fmtPct(p);
  document.getElementById("safeBunk").textContent = canMiss >= 0 ? String(canMiss) : `Need ${Math.ceil((0.75 * t - a) / 0.25)}`;
  document.getElementById("goalValue").textContent = `${goal}%`;
  document.getElementById("goalMessage").textContent =
    p >= goal ? `You are +${(p - goal).toFixed(1)}% above your target.` : `You are ${(goal - p).toFixed(1)}% away from target.`;
  document.getElementById("predictorText").textContent =
    needGoal > 0 ? `You need ${needGoal} more present classes to reach ${goal}%.` : `You are at or above ${goal}% target.`;

  let streak = 0;
  for (const l of state.student.logs) {
    if (l.type === "Present") streak += 1;
    else break;
  }
  document.getElementById("streakCount").textContent = String(streak);
  document.getElementById("badgeLabel").textContent =
    streak >= 20 ? "Attendance Champion" : streak >= 10 ? "Consistency Star" : streak >= 5 ? "Rising Streak" : "Starter";
}

function renderProfile() {
  const s = state.student;
  const roleText = `${s.className} • Sec ${s.section}`;
  document.querySelector(".profile-name").textContent = s.name;
  document.getElementById("sidebarRole").textContent = `${state.session.role} • ${roleText}`;
  setAvatar(document.querySelector(".avatar"), s.name, s.photoDataUrl);
  document.getElementById("publicName").textContent = s.name;
  document.getElementById("publicClass").textContent = roleText;
  document.getElementById("publicRoll").textContent = s.roll;
  document.getElementById("heroName").textContent = s.name;
  document.getElementById("heroClass").textContent = `${s.className} • Sec ${s.section}`;
  setAvatar(document.getElementById("heroAvatar"), s.name, s.photoDataUrl);

  document.getElementById("profileNameInput").value = s.name;
  document.getElementById("rollNumberInput").value = s.roll;
  document.getElementById("classInput").value = s.className;
  document.getElementById("sectionInput").value = s.section;
  document.getElementById("emailInput").value = s.email;
  document.getElementById("phoneInput").value = s.phone;
  document.getElementById("goalRange").value = String(s.goalPercent);
  document.getElementById("totalClassesInput").value = String(s.totalClasses);
  document.getElementById("attendedClassesInput").value = String(s.attendedClasses);
  document.getElementById("visibilityToggle").checked = s.visibilityPublic;

  const preview = document.getElementById("profilePhotoPreview");
  if (s.photoDataUrl) {
    preview.src = s.photoDataUrl;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
    preview.removeAttribute("src");
  }
}

function renderVisibility() {
  const badge = document.getElementById("profileBadge");
  const card = document.getElementById("publicProfile");
  const hint = document.getElementById("visibilityHint");
  if (state.student.visibilityPublic) {
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

function renderTop() {
  document.getElementById("roleSelect").value = state.session.role;
  document.getElementById("roleLabel").textContent = state.session.role;
  document.getElementById("pageTitle").textContent = pageByRole(state.session.role);
  document.body.setAttribute("data-role", state.session.role);
  const banner = document.getElementById("syncBanner");
  banner.textContent = syncBannerText();
  banner.classList.toggle("offline", !navigator.onLine);
  document.getElementById("chipRole").textContent = `Role: ${state.session.role}`;
  document.getElementById("chipVisibility").textContent = `Visibility: ${state.student.visibilityPublic ? "Public" : "Private"}`;
  document.getElementById("chipSync").textContent = `Sync: ${navigator.onLine ? "Online" : "Offline"}`;
}

function render() {
  renderTop();
  renderStudentList();
  renderProfile();
  renderVisibility();
  renderMetrics();
  renderLogs();
  renderNotifications();
  renderLeaveRequests();
  renderComparison();
  renderHeatmap();
  renderCharts();
}

async function refresh() {
  document.body.classList.add("loading");
  const { data, student } = await window.attendanceApi.getDashboard();
  state.data = data;
  state.student = student;
  render();
  document.body.classList.remove("loading");
}

async function updateStudent(patch, type = "Manual", action = "Student data updated") {
  await window.attendanceApi.updateSelectedStudent(patch);
  await window.attendanceApi.appendLog(type, action);
  if (!navigator.onLine) state.pendingSync += 1;
  await refresh();
}

async function bindEvents() {
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await window.attendanceApi.logout();
    window.location.href = "./login.html";
  });

  document.getElementById("globalSearch").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderLogs();
  });

  document.getElementById("logFilter").addEventListener("change", (e) => {
    state.logFilter = e.target.value;
    renderLogs();
  });

  document.getElementById("clearLogBtn").addEventListener("click", async () => {
    await window.attendanceApi.updateSelectedStudent({ logs: [] });
    await refresh();
  });

  document.getElementById("roleSelect").addEventListener("change", async (e) => {
    state.session.role = e.target.value;
    await window.attendanceApi.login({ name: state.session.name, role: state.session.role });
    await window.attendanceApi.addNotification(`Role switched to ${state.session.role}.`);
    await refresh();
  });

  document.getElementById("themeToggle").addEventListener("change", (e) => setTheme(e.target.checked ? "dark" : "light"));
  document.getElementById("themePreset").addEventListener("change", (e) => setThemePreset(e.target.value));

  document.getElementById("studentSelect").addEventListener("change", async (e) => {
    await window.attendanceApi.selectStudent(e.target.value);
    await refresh();
  });

  document.getElementById("openAddStudentBtn").addEventListener("click", () => {
    document.getElementById("addStudentForm").classList.toggle("open");
  });

  document.getElementById("addStudentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("newStudentName").value.trim(),
      roll: document.getElementById("newStudentRoll").value.trim(),
      className: document.getElementById("newStudentClass").value.trim(),
      section: document.getElementById("newStudentSection").value.trim(),
      email: document.getElementById("newStudentEmail").value.trim(),
      phone: document.getElementById("newStudentPhone").value.trim(),
      totalClasses: 0,
      attendedClasses: 0,
      goalPercent: 85,
    };
    if (!payload.name || !payload.roll) return;
    await window.attendanceApi.addStudent(payload);
    await window.attendanceApi.addNotification(`Student ${payload.name} added.`);
    e.target.reset();
    e.target.classList.remove("open");
    await refresh();
  });

  document.getElementById("attendanceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    const total = Math.max(0, Number(document.getElementById("totalClassesInput").value) || 0);
    const attended = Math.max(0, Number(document.getElementById("attendedClassesInput").value) || 0);
    await updateStudent({ totalClasses: total, attendedClasses: Math.min(attended, total) }, "Manual", "Manual totals updated");
  });

  document.getElementById("markPresentBtn").addEventListener("click", async () => {
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    await updateStudent(
      { totalClasses: state.student.totalClasses + 1, attendedClasses: state.student.attendedClasses + 1 },
      "Present",
      "Marked present for class"
    );
  });

  document.getElementById("markAbsentBtn").addEventListener("click", async () => {
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    const nextTotal = state.student.totalClasses + 1;
    const nextAttended = state.student.attendedClasses;
    await updateStudent({ totalClasses: nextTotal, attendedClasses: nextAttended }, "Absent", "Marked absent for class");
    if (pct(nextTotal, nextAttended) < 75) {
      await window.attendanceApi.addNotification("Attendance dropped below 75%. Parent notification queued.", "warn");
      await refresh();
    }
  });

  document.getElementById("undoBtn").addEventListener("click", async () => {
    const prev = state.undoStack.pop();
    if (!prev) return;
    await updateStudent(prev, "Manual", "Undid last action");
  });

  document.getElementById("resetBtn").addEventListener("click", async () => {
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    await updateStudent({ totalClasses: 0, attendedClasses: 0 }, "Manual", "Reset attendance counters");
  });

  document.getElementById("goalRange").addEventListener("change", async (e) => {
    await updateStudent({ goalPercent: Number(e.target.value) }, "Manual", `Goal changed to ${e.target.value}%`);
  });

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("emailInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const emailHint = document.getElementById("emailHint");
    const phoneHint = document.getElementById("phoneHint");
    const emailOk = /\S+@\S+\.\S+/.test(email);
    const phoneOk = phone.replace(/\D/g, "").length >= 10;
    emailHint.classList.toggle("error", !emailOk);
    phoneHint.classList.toggle("error", !phoneOk);
    emailHint.textContent = emailOk ? "Use a valid email" : "Please enter a valid email";
    phoneHint.textContent = phoneOk ? "Min 10 digits" : "Phone needs at least 10 digits";
    if (!emailOk || !phoneOk) return;
    await updateStudent(
      {
        name: document.getElementById("profileNameInput").value.trim(),
        roll: document.getElementById("rollNumberInput").value.trim(),
        className: document.getElementById("classInput").value.trim(),
        section: document.getElementById("sectionInput").value.trim(),
        email: document.getElementById("emailInput").value.trim(),
        phone: document.getElementById("phoneInput").value.trim(),
      },
      "Profile",
      "Updated student profile details"
    );
  });

  document.getElementById("profilePhotoInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await updateStudent({ photoDataUrl: String(reader.result || "") }, "Profile", "Updated profile photo");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("visibilityToggle").addEventListener("change", async (e) => {
    await updateStudent({ visibilityPublic: e.target.checked }, "Profile", `Profile visibility changed to ${e.target.checked ? "public" : "private"}`);
  });

  const subjectSelect = document.getElementById("subjectSelect");
  subjectSelect.innerHTML = SUBJECTS.map((s) => `<option value="${s}">${s}</option>`).join("");

  document.getElementById("markTimetablePresentBtn").addEventListener("click", async () => {
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    const period = document.getElementById("periodSelect").value;
    await updateStudent(
      { totalClasses: state.student.totalClasses + 1, attendedClasses: state.student.attendedClasses + 1 },
      "Present",
      `Timetable check-in: ${subjectSelect.value} (${period})`
    );
  });

  document.getElementById("generateQrBtn").addEventListener("click", async () => {
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    await window.attendanceApi.setQrSessionCode(code);
    await window.attendanceApi.addNotification(`Session code ${code} generated.`);
    await refresh();
  });

  document.getElementById("checkinQrBtn").addEventListener("click", async () => {
    const value = document.getElementById("qrInput").value.trim();
    if (!state.data.qrSessionCode) {
      await window.attendanceApi.addNotification("Generate a session code first.");
      await refresh();
      return;
    }
    if (value !== state.data.qrSessionCode) {
      await window.attendanceApi.addNotification("Invalid session code entered.");
      await refresh();
      return;
    }
    state.undoStack.push({ totalClasses: state.student.totalClasses, attendedClasses: state.student.attendedClasses });
    await updateStudent(
      { totalClasses: state.student.totalClasses + 1, attendedClasses: state.student.attendedClasses + 1 },
      "Present",
      "QR check-in successful"
    );
    document.getElementById("qrInput").value = "";
  });

  document.getElementById("leaveForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("leaveDate").value;
    const reason = document.getElementById("leaveReason").value.trim();
    if (!date || !reason) return;
    await window.attendanceApi.addLeaveRequest({ date, reason, studentName: state.student.name });
    await window.attendanceApi.appendLog("Leave", "Leave request submitted");
    e.target.reset();
    await refresh();
  });

  document.getElementById("leaveRows").addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    const action = target.dataset.action;
    if (!id || !action) return;
    await window.attendanceApi.updateLeaveStatus(id, action);
    await window.attendanceApi.appendLog("Leave", `Leave request ${action.toLowerCase()}`);
    await refresh();
  });

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const rows = [
      ["Time", "Type", "Action", "Total", "Attended", "Percent"],
      ...(state.student.logs || []).map((l) => [l.time, l.type, l.action, l.total, l.attended, l.percent]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${state.student.name.replaceAll(" ", "_").toLowerCase()}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("printPdfBtn").addEventListener("click", () => window.print());

  document.querySelectorAll(".collapsible .panel-head").forEach((head) => {
    head.addEventListener("click", () => {
      if (window.innerWidth > 900) return;
      const panel = head.closest(".collapsible");
      panel?.classList.toggle("is-collapsed");
    });
  });

  window.addEventListener("online", refresh);
  window.addEventListener("offline", () => {
    state.pendingSync += 1;
    renderTop();
  });
}

async function init() {
  document.body.classList.add("loading");
  state.session = await window.attendanceApi.getSession();
  if (!state.session) {
    window.location.href = "./login.html";
    return;
  }
  setTheme(state.theme);
  setThemePreset(state.themePreset);
  await refresh();
  await bindEvents();
  document.body.classList.remove("loading");
}

renderCalendar(new Date());
init();
