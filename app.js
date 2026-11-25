"use strict";

const storageKey = "screenwell-v1";
const statuses = ["Booked", "Attended", "No-show", "Cancelled"];
const routes = {
  home: ["", "", ""],
  booking: ["Public booking", "Book a health screening", "Choose an available slot and register for your screening."],
  overview: ["Staff workspace", "Screening overview", "Manage bookings and track participation across your programs."],
  programs: ["Staff workspace", "Programs & slots", "Create screening programs and set appointment capacity."],
  appointments: ["Staff workspace", "Appointments", "Track attendance, update booking status and prepare reminders."],
};

function localDate(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, "0")).join("-");
}

const additionalPrograms = [
  { id: "physical", name: "Physical Exam", location: "Community Clinic · Exam Room", description: "A routine physical examination.", times: ["09:00", "13:30"], capacity: 5 },
  { id: "flu", name: "Flu Vaccination", location: "Community Clinic · Vaccination Desk", description: "Book an appointment for a seasonal flu shot.", times: ["10:30", "15:00"], capacity: 10 },
  { id: "lab", name: "Lab Tests", location: "Community Clinic · Laboratory", description: "Schedule a visit for sample collection.", times: ["08:30", "11:00"], capacity: 6 },
  { id: "general", name: "General Health Screening", location: "Community Clinic · Room 4", description: "A screening visit to review basic health measurements.", times: ["09:30", "14:30"], capacity: 6 },
  { id: "mental", name: "Mental Health Screening", location: "Community Clinic · Consultation Room", description: "A private appointment to discuss mental wellbeing.", times: ["11:30", "16:00"], capacity: 4 },
];

function addScreeningOptions(state) {
  if (state.screeningOptionsVersion === 1) return state;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = localDate(tomorrow);
  for (const { times, capacity, ...program } of additionalPrograms) {
    if (state.programs.some(existing => existing.id === program.id)) continue;
    state.programs.push(program);
    state.slots.push(...times.map((time, index) => ({
      id: program.id + "-demo-" + index,
      program: program.id,
      start: date + "T" + time,
      capacity,
    })));
  }
  state.screeningOptionsVersion = 1;
  return state;
}

function seed() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = localDate(tomorrow);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const past = localDate(yesterday);
  return {
    programs: [
      { id: "heart", name: "Heart Health Check", location: "Community Clinic · Room 1" },
      { id: "vision", name: "Vision Screening", location: "Community Clinic · Room 2" },
      { id: "wellness", name: "General Wellness Check", location: "Community Clinic · Room 3" },
    ],
    slots: [
      { id: "heart-am", program: "heart", start: date + "T10:00", capacity: 6 },
      { id: "vision-am", program: "vision", start: date + "T11:30", capacity: 4 },
      { id: "wellness-pm", program: "wellness", start: date + "T14:00", capacity: 8 },
      { id: "heart-past", program: "heart", start: past + "T10:00", capacity: 6 },
    ],
    bookings: [
      { id: "demo-001", slot: "heart-am", name: "Maya Shah", email: "maya@example.com", status: "Booked" },
      { id: "demo-002", slot: "heart-past", name: "Alex Rao", email: "alex@example.com", status: "Attended" },
      { id: "demo-003", slot: "heart-past", name: "Jordan Lee", email: "jordan@example.com", status: "No-show" },
      { id: "demo-004", slot: "vision-am", name: "Sam Patel", email: "sam@example.com", status: "Cancelled" },
    ],
  };
}

const $ = selector => document.querySelector(selector);
const content = $("#content");
const notice = message => { $("#notice").textContent = message; };
const read = () => addScreeningOptions(JSON.parse(localStorage.getItem(storageKey)) ?? seed());
const save = state => localStorage.setItem(storageKey, JSON.stringify(state));
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const id = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join("-");
const formatTime = time => new Date(time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const seats = (state, slot) => slot.capacity - state.bookings.filter(
  booking => booking.slot === slot.id && booking.status !== "Cancelled"
).length;

let staff = sessionStorage.getItem("staff") === "yes";
let statusFilter = "";
let selectedProgram = "";
let lastRoute;

content.addEventListener("click", event => {
  const link = event.target.closest("[data-program]");
  if (link) selectedProgram = link.dataset.program;
});

function table(headers, rows, empty) {
  if (!rows.length) return `<p>${empty}</p>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join("")}
    </tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function section(title, body) {
  return `<section class="card"><h2>${title}</h2>${body}</section>`;
}

function programOptions(state, selected) {
  return state.programs.map(program => `<option value="${program.id}" ${program.id === selected ? "selected" : ""}>${escape(program.name)}</option>`).join("");
}

function homePage(state) {
  const descriptions = {
    heart: "Blood pressure and heart health screening.",
    vision: "A basic check of your eyesight.",
    wellness: "A general preventive health screening.",
  };
  const cards = state.programs.map(program => {
    const available = state.slots.filter(slot => slot.program === program.id &&
      new Date(slot.start) > Date.now() && seats(state, slot) > 0).length;
    return `<article class="screening">
      <div class="screening-icon" aria-hidden="true">${({ heart: "♡", vision: "◎", wellness: "✚", physical: "✚", flu: "✦", lab: "◇", general: "＋", mental: "☼" })[program.id] ?? "+"}</div>
      <h3>${escape(program.name)}</h3>
      <p>${escape(program.description ?? descriptions[program.id] ?? program.location)}</p>
      <span class="availability">${available} available appointment times</span>
      <a href="#booking" data-program="${escape(program.id)}">View appointments <span aria-hidden="true">↗</span></a>
    </article>`;
  }).join("");
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <p class="eyebrow">PREVENTIVE HEALTH SCREENINGS</p>
      <h1 id="hero-title">Make time for<br>your <em>health.</em></h1>
      <p>Find a screening program and book an appointment at the community clinic.</p>
      <a class="button" href="#booking">Book a screening <span aria-hidden="true">↗</span></a>
    </div>
    <div class="hero-photo" role="img" aria-label="Healthcare professionals at a clinic"></div>
  </section>
  <section class="screenings" aria-labelledby="program-title">
    <p class="eyebrow">COMMUNITY CLINIC</p>
    <h2 id="program-title">Explore screenings</h2>
    <div class="screening-grid">${cards}</div>
  </section>`;
}

function bookingPage(state) {
  if (!state.programs.length) return section("Registration", "<p>No programs are available.</p>");
  const program = state.programs.find(item => item.id === selectedProgram) ?? state.programs[0];
  return section("Registration", `
    <form id="book">
      <div class="grid">
        <label>Program <select name="program" required>${programOptions(state, program.id)}</select></label>
        <label>Appointment <select name="slot" required></select></label>
      </div>
      <p id="location"></p>
      <div class="grid">
        <label>Full name <input name="name" autocomplete="name" maxlength="100" required></label>
        <label>Email <input name="email" type="email" autocomplete="email" maxlength="200" required></label>
      </div>
      <button>Book appointment</button>
    </form>`);
}

function updateSlots() {
  const state = read();
  const form = $("#book");
  selectedProgram = form.elements.program.value;
  const program = state.programs.find(item => item.id === selectedProgram);
  const slots = state.slots.filter(slot => slot.program === selectedProgram && new Date(slot.start) > Date.now() && seats(state, slot) > 0)
    .sort((a, b) => a.start.localeCompare(b.start));
  form.elements.slot.innerHTML = slots.length
    ? '<option value="">Select a slot</option>' + slots.map(slot => `<option value="${slot.id}">${escape(formatTime(slot.start))} · ${seats(state, slot)} available</option>`).join("")
    : '<option value="">No slots available</option>';
  $("#location").textContent = program?.location ?? "";
  form.querySelector("button").disabled = !slots.length;
}

function summary(state) {
  return state.programs.map(program => {
    const bookings = state.bookings.filter(booking => state.slots.some(slot => slot.id === booking.slot && slot.program === program.id));
    return [program.name, ...statuses.map(status => bookings.filter(booking => booking.status === status).length)];
  });
}

function overviewPage(state) {
  const metrics = [
    ["Programs", state.programs.length],
    ["Booked", state.bookings.filter(item => item.status === "Booked").length],
    ["Attended", state.bookings.filter(item => item.status === "Attended").length],
  ];
  return `<div class="grid">${metrics.map(([label, value]) => `<div class="card metric">${label}<strong>${value}</strong></div>`).join("")}</div>` +
    section("Program summary", '<div class="toolbar"><button id="export" class="secondary">Download summary CSV</button></div>' +
      table(["Program", ...statuses], summary(state).map(row => row.map(escape)), "Add a screening program to start tracking participation."));
}

function programsPage(state) {
  return section("Screening programs", `
    <form id="program" class="grid">
      <label>Program name <input name="name" maxlength="100" required></label>
      <label>Location <input name="location" maxlength="120" required></label>
      <button>Add program</button>
    </form>` + table(["Program", "Location"], state.programs.map(item => [escape(item.name), escape(item.location)]), "No programs yet.")) +
    section("Appointment slots", `
    <form id="slot" class="grid">
      <label>Program <select name="program" required>${programOptions(state)}</select></label>
      <label>Starts at <input name="start" type="datetime-local" required></label>
      <label>Capacity <input name="capacity" type="number" min="1" max="999" required></label>
      <button ${state.programs.length ? "" : "disabled"}>Add slot</button>
    </form>` + table(["Program", "Starts at", "Capacity", "Available"], [...state.slots].sort((a, b) => a.start.localeCompare(b.start)).map(slot => [
      escape(state.programs.find(program => program.id === slot.program).name),
      escape(formatTime(slot.start)),
      `<form data-slot="${slot.id}"><label>Seats <input type="number" name="capacity" min="${Math.max(1, slot.capacity - seats(state, slot))}" max="999" value="${slot.capacity}" required></label><button class="secondary">Save</button></form>`,
      seats(state, slot),
    ]), "No slots yet."));
}

function appointmentsPage(state) {
  const rows = state.bookings.filter(item => !statusFilter || item.status === statusFilter).map(booking => {
    const slot = state.slots.find(item => item.id === booking.slot);
    const program = state.programs.find(item => item.id === slot.program);
    const body = `Hello ${booking.name},\n\nThis is a reminder for ${program.name} on ${formatTime(slot.start)} at ${program.location}.\n\nCareSlot`;
    return [
      `${escape(booking.name)}<br>${escape(booking.email)}`,
      `${escape(program.name)}<br>${escape(formatTime(slot.start))}`,
      `<select aria-label="Status for ${escape(booking.name)}" data-booking="${booking.id}">${statuses.map(status =>
        `<option ${status === booking.status ? "selected" : ""}>${status}</option>`).join("")}</select>`,
      booking.status === "Booked"
        ? `<a class="button secondary" href="mailto:${encodeURIComponent(booking.email)}?subject=Screening%20reminder&amp;body=${encodeURIComponent(body)}">Open draft</a>`
        : "—",
    ];
  });
  return section("Participant register", `<div class="toolbar"><label>Status filter <select id="filter"><option value="">All statuses</option>
    ${statuses.map(status => `<option ${status === statusFilter ? "selected" : ""}>${status}</option>`).join("")}</select></label></div>` +
    table(["Participant", "Appointment", "Status", "Reminder"], rows, "No appointments match this view."));
}

function render() {
  const requested = document.body.dataset.page || (location.hash.slice(1) || "home");
  const route = Object.hasOwn(routes, requested) && (staff || requested === "booking" || requested === "home") ? requested : "booking";
  document.body.classList.toggle("home", route === "home");
  const [workspace, heading, intro] = routes[route];
  $("#workspace").textContent = workspace.toUpperCase();
  $("#heading").textContent = heading;
  $("#intro").textContent = intro;
  $("#staff-toggle").textContent = staff ? "Staff demo sign-out" : "Staff demo sign-in";
  document.querySelectorAll("[data-staff]").forEach(link => { link.hidden = !staff; });
  document.querySelectorAll("nav a").forEach(link => {
    if (link.hash === "#" + route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const state = read();
  content.innerHTML = { home: homePage, booking: bookingPage, overview: overviewPage, programs: programsPage, appointments: appointmentsPage }[route](state);
  if (route === "booking" && $("#book")) updateSlots();
  if (lastRoute !== route) {
    content.classList.remove("enter");
    void content.offsetWidth;
    content.classList.add("enter");
    lastRoute = route;
  }
}

function mutate(change) {
  const apply = () => {
    try {
      const state = read();
      const message = change(state);
      save(state);
      render();
      notice(message);
    } catch (error) {
      notice(error.message);
    }
  };
  if (navigator.locks) navigator.locks.request(storageKey, apply);
  else apply();
}

content.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const field = key => String(data.get(key) ?? "").trim();
  mutate(state => {
    if (form.id === "book") {
      const slot = state.slots.find(item => item.id === field("slot") && item.program === field("program"));
      if (!slot || new Date(slot.start) <= Date.now() || seats(state, slot) < 1) throw Error("That slot is no longer available. Choose another appointment.");
      const name = field("name");
      const email = field("email");
      if (!name || !email) throw Error("Enter your name and email.");
      if (state.bookings.some(item => item.slot === slot.id && item.email.toLowerCase() === email.toLowerCase() && item.status !== "Cancelled")) {
        throw Error("This email already has a booking for that slot.");
      }
      const bookingId = id();
      state.bookings.push({ id: bookingId, slot: slot.id, name, email, status: "Booked" });
      return `Appointment booked for ${formatTime(slot.start)}. Reference ${bookingId.slice(0, 8).toUpperCase()}.`;
    }
    if (!staff) throw Error("Sign in to the staff demo first.");
    if (form.id === "program") {
      const name = field("name");
      const location = field("location");
      if (!name || !location) throw Error("Enter a program name and location.");
      if (state.programs.some(item => item.name.toLowerCase() === name.toLowerCase())) throw Error("A program with that name already exists.");
      state.programs.push({ id: id(), name, location });
      return "Program added.";
    }
    const capacity = Number(field("capacity"));
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 999) throw Error("Capacity must be between 1 and 999.");
    if (form.dataset.slot) {
      const slot = state.slots.find(item => item.id === form.dataset.slot);
      if (capacity < slot.capacity - seats(state, slot)) throw Error("Capacity cannot be lower than occupied seats.");
      slot.capacity = capacity;
      return "Capacity updated.";
    }
    const program = field("program");
    const start = field("start");
    if (!state.programs.some(item => item.id === program) || !(new Date(start) > Date.now())) throw Error("Select a program and a future start time.");
    if (state.slots.some(item => item.program === program && item.start === start)) throw Error("That program already has a slot at that time.");
    state.slots.push({ id: id(), program, start, capacity });
    return "Appointment slot added.";
  });
});

content.addEventListener("change", event => {
  const input = event.target;
  if (input.form?.id === "book" && input.name === "program") updateSlots();
  if (input.id === "filter") {
    statusFilter = input.value;
    render();
    $("#filter").focus();
  }
  if (!staff || !input.dataset.booking) return;
  const status = input.value;
  mutate(state => {
    const booking = state.bookings.find(item => item.id === input.dataset.booking);
    const slot = state.slots.find(item => item.id === booking.slot);
    if (booking.status === "Cancelled" && status !== "Cancelled" && seats(state, slot) < 1) {
      input.value = booking.status;
      throw Error("This slot is full. Increase its capacity before restoring the appointment.");
    }
    booking.status = status;
    return "Appointment status updated.";
  });
});

content.addEventListener("click", event => {
  if (!staff || event.target.id !== "export") return;
  const rows = [["Program", ...statuses], ...summary(read())];
  const csv = rows.map(row => row.map(value => {
    const cell = String(value);
    const safe = /^[=+\-@\t\r\n]/.test(cell) ? "'" + cell : cell;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "careslot-summary.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("#staff-toggle").addEventListener("click", () => {
  staff = !staff;
  sessionStorage.setItem("staff", staff ? "yes" : "no");
  location.href = "index.html#" + (staff ? "overview" : "home");
  render();
});
$(".skip").addEventListener("click", event => { event.preventDefault(); $("#main").focus(); });
window.addEventListener("hashchange", () => { notice(""); render(); });
window.addEventListener("storage", event => {
  if (event.key === storageKey && (staff || !$("#book"))) render();
});
render();

