const STORAGE_KEY = "ast_attendance_app_state_v2";

const defaults = {
  totalClasses: 0,
  attendedClasses: 0,
  visibilityPublic: true,
  goalPercent: 85,
  logs: [],
  profile: {
    name: "Avery Johnson",
    roll: "NB-2026-1042",
    className: "Grade 10",
    section: "A",
    email: "avery.johnson@northbridge.edu",
    phone: "+1 415 555 0182",
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      profile: { ...defaults.profile, ...(parsed.profile || {}) },
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return defaults;
  }
}

function percent(total, attended) {
  if (!total) return 0;
  return (attended / total) * 100;
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function render() {
  const state = loadState();
  const attendance = percent(state.totalClasses, state.attendedClasses);
  const missed = Math.max(0, state.totalClasses - state.attendedClasses);

  document.getElementById("studentName").textContent = state.profile.name;
  document.getElementById("studentRole").textContent = `${state.profile.className} • Section ${state.profile.section}`;
  document.getElementById("studentRoll").textContent = state.profile.roll;
  document.getElementById("studentEmail").textContent = state.profile.email;
  document.getElementById("studentPhone").textContent = state.profile.phone;
  document.getElementById("studentVisibility").textContent = state.visibilityPublic ? "Public" : "Private";
  document.getElementById("profileAvatar").textContent = initials(state.profile.name) || "ST";

  document.getElementById("totalClasses").textContent = String(state.totalClasses);
  document.getElementById("attendedClasses").textContent = String(state.attendedClasses);
  document.getElementById("missedClasses").textContent = String(missed);
  document.getElementById("attendancePercent").textContent = `${attendance.toFixed(1)}%`;
  document.getElementById("profileProgress").style.width = `${Math.min(100, attendance)}%`;
  document.getElementById("goalNote").textContent = `Target: ${state.goalPercent}%`;

  const logRows = document.getElementById("recentLogs");
  const logs = state.logs.slice(0, 8);
  if (!logs.length) {
    logRows.innerHTML = `<tr><td colspan="5">No activity yet.</td></tr>`;
    return;
  }

  logRows.innerHTML = logs
    .map(
      (entry) => `
      <tr>
        <td>${entry.time || "-"}</td>
        <td>${entry.action || "-"}</td>
        <td>${entry.total ?? "-"}</td>
        <td>${entry.attended ?? "-"}</td>
        <td>${entry.percent || "-"}</td>
      </tr>
    `
    )
    .join("");
}

render();
