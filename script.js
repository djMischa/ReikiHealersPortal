const API_BASE = "https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec";

let classesData = [];
let registrationsData = [];

// =======================
// Initialize
// =======================
async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
  renderRegistrationForm();
}

// =======================
// Format date/time
// =======================
function formatClassTime(dateStr, timeStr) {
  if (!dateStr) dateStr = '';
  if (!timeStr) timeStr = '';
  return `${dateStr} @ ${timeStr}`;
}

// =======================
// Render class cards
// =======================
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";
  container.style.display = "block";

  // Respect displayOrder
  classesData.sort((a, b) => {
    const ao = parseInt(a.displayOrder || 999);
    const bo = parseInt(b.displayOrder || 999);
    return ao - bo;
  });

  classesData.forEach((cls, i) => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";
    div.style.position = "relative";

    // Participants
    const participants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "confirmed")
      .map(r => r.fullName)
      .sort((a,b) => a.localeCompare(b));

    const standbyParticipants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "standby")
      .map(r => r.fullName)
      .sort((a,b) => a.localeCompare(b));

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} - ${participants.length} healer${participants.length !== 1 ? 's' : ''}`;

    // Date/time
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    // Participant list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });

    // Standby sublist
    let standbyUl = null;
    if (standbyParticipants.length) {
      const standbyTitle = document.createElement("div");
      standbyTitle.textContent = "Standby:";
      standbyTitle.style.marginTop = "10px";
      standbyTitle.style.color = "#ffd78c";
      standbyTitle.style.fontWeight = "bold";

      standbyUl = document.createElement("ul");
      standbyParticipants.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        standbyUl.appendChild(li);
      });

      div.appendChild(standbyTitle);
      div.appendChild(standbyUl);
    }

    // Remaining spaces + Join toggle
    const remaining = cls.capacity - participants.length;
    const joinDiv = document.createElement("div");
    joinDiv.style.display = "flex";
    joinDiv.style.justifyContent = "space-between";
    joinDiv.style.alignItems = "center";
    joinDiv.style.marginTop = "12px";

    const remainText = document.createElement("span");
    remainText.style.color = "#c59b5a";
    remainText.style.fontSize = "18px";
    remainText.style.fontWeight = "bold";
    remainText.textContent = remaining > 0 ? `→ ${remaining} spaces remaining` : "CLASS FULL – STANDBY AVAILABLE";

    const checkboxLabel = document.createElement("label");
    checkboxLabel.style.display = "flex";
    checkboxLabel.style.alignItems = "center";
    checkboxLabel.style.gap = "6px";
    checkboxLabel.style.cursor = "pointer";
    checkboxLabel.style.fontWeight = "bold";
    checkboxLabel.style.fontSize = "16px";
    checkboxLabel.style.color = remaining > 0 ? "#00ffff" : "#00ff00"; // neon blue / neon green

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.classId = cls.id;
    checkbox.dataset.status = remaining > 0 ? "confirmed" : "standby";
    checkbox.style.width = "18px";
    checkbox.style.height = "18px";
    checkbox.style.margin = "0";
    checkbox.style.cursor = "pointer";
    checkbox.style.accentColor = remaining > 0 ? "#00ffff" : "#00ff00"; // neon glow color

    checkboxLabel.appendChild(document.createTextNode(remaining > 0 ? "Join Class" : "Join Standby"));
    checkboxLabel.appendChild(checkbox);

    joinDiv.appendChild(remainText);
    joinDiv.appendChild(checkboxLabel);

    // Append all to card
    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);
    div.appendChild(joinDiv);

    container.appendChild(div);

    // Fade-in animation
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

// =======================
// Render registration form
// =======================
function renderRegistrationForm() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <h2 style="text-align:center; margin-top:60px;">Register for Classes</h2>
    <div style="max-width:380px;margin:25px auto;text-align:center;">
      <input id="regEmail" type="email" placeholder="Enter your email"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;border:2px solid #c59b5a;">
      <input id="regName" type="text" placeholder="Full Name"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;border:2px solid #c59b5a;">
      <input id="regWhatsApp" type="text" placeholder="WhatsApp Number"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;border:2px solid #c59b5a;">

      <button id="regSubmit"
        style="width:100%;padding:12px;border-radius:8px;background:#c59b5a;color:white;font-size:18px;font-weight:bold;">
        Submit Registration
      </button>

      <div id="regMessage" style="margin-top:15px;font-size:16px;"></div>
    </div>
  `;

  document.getElementById("regEmail").addEventListener("blur", checkUserExists);
  document.getElementById("regSubmit").addEventListener("click", submitRegistration);
}

// =======================
// Check if user exists
// =======================
async function checkUserExists() {
  const email = document.getElementById("regEmail").value.trim();
  if (!email) return;

  const users = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  const match = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (match) {
    document.getElementById("regName").value = match.fullName || "";
    document.getElementById("regWhatsApp").value = match.whatsapp || "";
  }
}

// =======================
// Submit registration
// =======================
async function submitRegistration() {
  const email = document.getElementById("regEmail").value.trim();
  const name = document.getElementById("regName").value.trim();
  const whatsapp = document.getElementById("regWhatsApp").value.trim();
  const msgBox = document.getElementById("regMessage");

  if (!email || !name || !whatsapp) {
    msgBox.innerHTML = "Please complete all fields.";
    msgBox.style.color = "red";
    return;
  }

  // Collect selected classes with status
  const selected = [...document.querySelectorAll(".class-checkbox input:checked")].map(c => ({
    classId: c.dataset.classId,
    status: c.dataset.status
  }));

  if (selected.length === 0) {
    msgBox.innerHTML = "Please choose at least one class.";
    msgBox.style.color = "red";
    return;
  }

  msgBox.innerHTML = "Submitting...";
  msgBox.style.color = "#ffd78c";

  const result = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      email,
      fullName: name,
      whatsapp,
      selectedClasses: JSON.stringify(selected),
      ack: true
    })
  }).then(r => r.json());

  if (result.success) {
    msgBox.innerHTML = "Registration successful!";
    msgBox.style.color = "lightgreen";
    registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
    renderClasses();
  } else {
    msgBox.innerHTML = `Error: ${result.message || "Unknown error"}`;
    msgBox.style.color = "red";
  }
}

init();



// https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec
