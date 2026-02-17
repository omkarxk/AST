function pct(total, attended) {
  if (!total) return 0;
  return (attended / total) * 100;
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
  } else {
    el.style.backgroundImage = "";
    el.textContent = initials(name) || "ST";
  }
}

function renderStudent(session, student) {
  const attendance = pct(student.totalClasses, student.attendedClasses);
  const missed = Math.max(0, student.totalClasses - student.attendedClasses);
  document.getElementById("studentName").textContent = student.name;
  document.getElementById("studentRole").textContent = `${student.className} • Section ${student.section}`;
  document.getElementById("studentRoll").textContent = student.roll;
  document.getElementById("studentEmail").textContent = student.email;
  document.getElementById("studentPhone").textContent = student.phone;
  document.getElementById("studentVisibility").textContent = `${student.visibilityPublic ? "Public" : "Private"} • ${session.role}`;
  setAvatar(document.getElementById("profileAvatar"), student.name, student.photoDataUrl);

  document.getElementById("totalClasses").textContent = String(student.totalClasses);
  document.getElementById("attendedClasses").textContent = String(student.attendedClasses);
  document.getElementById("missedClasses").textContent = String(missed);
  document.getElementById("attendancePercent").textContent = `${attendance.toFixed(1)}%`;
  document.getElementById("profileProgress").style.width = `${Math.min(100, attendance)}%`;
  document.getElementById("goalNote").textContent = `Target: ${student.goalPercent}%`;

  const logs = student.logs || [];
  const root = document.getElementById("recentLogs");
  if (!logs.length) {
    root.innerHTML = `<tr><td colspan="5">No activity yet.</td></tr>`;
    return;
  }
  root.innerHTML = logs
    .slice(0, 8)
    .map((l) => `<tr><td>${l.time || "-"}</td><td>${l.action || "-"}</td><td>${l.total ?? "-"}</td><td>${l.attended ?? "-"}</td><td>${l.percent || "-"}</td></tr>`)
    .join("");
}

async function initProfile() {
  const session = await window.attendanceApi.getSession();
  if (!session) {
    window.location.href = "./login.html";
    return;
  }
  const { student } = await window.attendanceApi.getDashboard();
  renderStudent(session, student);
}

initProfile();
