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

const students = [
  { roll: 442, name: "Savannah Nguyen", present: true, absent: false, leave: false },
  { roll: 157, name: "Brooklyn Simmons", present: true, absent: false, leave: false },
  { roll: 195, name: "David Steward", present: false, absent: true, leave: false },
  { roll: 174, name: "Anvia McKinley", present: true, absent: false, leave: false },
  { roll: 422, name: "Cameron Williamson", present: false, absent: false, leave: true },
  { roll: 115, name: "Cody Fisher", present: true, absent: false, leave: false },
];

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

function dot(isTrue, style) {
  return `<span class="status-dot ${isTrue ? style : "dot-muted"}"></span>`;
}

function renderRows() {
  const root = document.getElementById("studentRows");
  root.innerHTML = students
    .map(
      (s) => `
      <tr>
        <td>${s.roll}</td>
        <td>${s.name}</td>
        <td>${dot(s.present, "dot-success")}</td>
        <td>${dot(s.absent, "dot-danger")}</td>
        <td>${dot(s.leave, "dot-muted")}</td>
      </tr>
    `
    )
    .join("");
}

function renderCalendar(year, month, selectedDay) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

renderBars();
renderRows();
renderCalendar(2026, 1, 11);
