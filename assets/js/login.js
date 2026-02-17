async function initLogin() {
  const existing = await window.attendanceApi.getSession();
  if (existing) {
    window.location.href = "./index.html";
    return;
  }

  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("loginName").value.trim();
    const role = document.getElementById("loginRole").value;
    if (!name) return;
    await window.attendanceApi.login({ name, role });
    window.location.href = "./index.html";
  });
}

initLogin();
