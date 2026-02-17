const APP_DATA_KEY = "ast_attendance_app_data_v1";
const APP_SESSION_KEY = "ast_attendance_session_v1";
const API_BASE_URL = window.API_BASE_URL || "";

const defaultStudent = {
  id: "stu-1001",
  name: "Avery Johnson",
  roll: "NB-2026-1042",
  className: "Grade 10",
  section: "A",
  email: "avery.johnson@northbridge.edu",
  phone: "+1 415 555 0182",
  visibilityPublic: true,
  photoDataUrl: "",
  totalClasses: 42,
  attendedClasses: 36,
  goalPercent: 85,
  logs: [],
  dailyAttendance: {},
};

const defaultData = {
  selectedStudentId: defaultStudent.id,
  classAveragePercent: 82,
  qrSessionCode: "",
  leaveRequests: [],
  notifications: [],
  students: [
    defaultStudent,
    {
      ...defaultStudent,
      id: "stu-1002",
      name: "Noah Martinez",
      roll: "NB-2026-1060",
      email: "noah.martinez@northbridge.edu",
      totalClasses: 40,
      attendedClasses: 35,
      goalPercent: 88,
    },
  ],
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function now() {
  return new Date().toLocaleString();
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function ensureData() {
  const data = readJSON(APP_DATA_KEY, null);
  if (!data || !Array.isArray(data.students) || !data.students.length) {
    writeJSON(APP_DATA_KEY, defaultData);
    return structuredClone(defaultData);
  }
  return data;
}

function getSession() {
  return readJSON(APP_SESSION_KEY, null);
}

function setSession(session) {
  writeJSON(APP_SESSION_KEY, session);
}

function clearSession() {
  localStorage.removeItem(APP_SESSION_KEY);
}

function withDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), 40));
}

async function tryRemote(path, options) {
  if (!API_BASE_URL) return null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function findSelectedStudent(data) {
  return data.students.find((s) => s.id === data.selectedStudentId) || data.students[0];
}

const api = {
  async login({ name, role }) {
    const remote = await tryRemote("/auth/login", {
      method: "POST",
      body: JSON.stringify({ name, role }),
    });
    if (remote) return remote;
    const session = { name, role, loginAt: now() };
    setSession(session);
    return withDelay(session);
  },

  async getSession() {
    const remote = await tryRemote("/auth/session");
    if (remote) return remote;
    return withDelay(getSession());
  },

  async logout() {
    clearSession();
    return withDelay(true);
  },

  async getDashboard() {
    const remote = await tryRemote("/dashboard");
    if (remote) return remote;
    const data = ensureData();
    const student = findSelectedStudent(data);
    return withDelay({ data, student });
  },

  async listStudents() {
    const remote = await tryRemote("/students");
    if (remote) return remote;
    const data = ensureData();
    return withDelay(data.students);
  },

  async addStudent(payload) {
    const remote = await tryRemote("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (remote) return remote;
    const data = ensureData();
    const student = {
      ...defaultStudent,
      id: uid("stu"),
      name: payload.name,
      roll: payload.roll,
      className: payload.className,
      section: payload.section,
      email: payload.email,
      phone: payload.phone,
      totalClasses: Number(payload.totalClasses) || 0,
      attendedClasses: Number(payload.attendedClasses) || 0,
      goalPercent: Number(payload.goalPercent) || 85,
      logs: [],
      dailyAttendance: {},
    };
    data.students.push(student);
    data.selectedStudentId = student.id;
    writeJSON(APP_DATA_KEY, data);
    return withDelay(student);
  },

  async selectStudent(studentId) {
    const remote = await tryRemote(`/students/${studentId}/select`, { method: "POST" });
    if (remote) return remote;
    const data = ensureData();
    if (data.students.some((s) => s.id === studentId)) {
      data.selectedStudentId = studentId;
      writeJSON(APP_DATA_KEY, data);
    }
    return withDelay(true);
  },

  async updateSelectedStudent(patch) {
    const remote = await tryRemote("/students/selected", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (remote) return remote;
    const data = ensureData();
    const student = findSelectedStudent(data);
    Object.assign(student, patch);
    writeJSON(APP_DATA_KEY, data);
    return withDelay(student);
  },

  async appendLog(type, action) {
    const data = ensureData();
    const student = findSelectedStudent(data);
    const percent = student.totalClasses ? (student.attendedClasses / student.totalClasses) * 100 : 0;
    student.logs.unshift({
      type,
      action,
      time: now(),
      total: student.totalClasses,
      attended: student.attendedClasses,
      percent: `${percent.toFixed(1)}%`,
      percentValue: percent,
    });
    student.logs = student.logs.slice(0, 80);
    writeJSON(APP_DATA_KEY, data);
    return withDelay(student.logs);
  },

  async addNotification(message, level = "info") {
    const data = ensureData();
    data.notifications.unshift({ message, level, time: new Date().toLocaleTimeString() });
    data.notifications = data.notifications.slice(0, 30);
    writeJSON(APP_DATA_KEY, data);
    return withDelay(data.notifications);
  },

  async setQrSessionCode(code) {
    const data = ensureData();
    data.qrSessionCode = code;
    writeJSON(APP_DATA_KEY, data);
    return withDelay(code);
  },

  async addLeaveRequest({ date, reason, studentName }) {
    const data = ensureData();
    data.leaveRequests.unshift({
      id: uid("leave"),
      date,
      reason,
      studentName,
      status: "Pending",
    });
    writeJSON(APP_DATA_KEY, data);
    return withDelay(data.leaveRequests);
  },

  async updateLeaveStatus(id, status) {
    const data = ensureData();
    const request = data.leaveRequests.find((item) => item.id === id);
    if (request) request.status = status;
    writeJSON(APP_DATA_KEY, data);
    return withDelay(data.leaveRequests);
  },

  async setClassAverage(percent) {
    const data = ensureData();
    data.classAveragePercent = percent;
    writeJSON(APP_DATA_KEY, data);
    return withDelay(percent);
  },
};

window.attendanceApi = api;
