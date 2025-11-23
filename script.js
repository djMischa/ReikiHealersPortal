const API_BASE = "https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec";

let classesData = [];
let registrationsData = [];
let currentUser = null; // Stores the recognized or newly registered user
let selectedClasses = {}; // Stores toggled classes { classId: status }

async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderRegistrationSection();
  renderClasses();
}

// Utility to format class date/time
function formatClassTime(dateStr, timeStr) {
  return `${dateStr || ''} @ ${timeStr || ''}`;
}

// --- Render Registration / Login Section ---
function renderRegistrationSection() {
  const wrapper = document.getElementById("registration-section");
  wrapper.innerHTML = `
    <div style="max-width:400px; margin:20px auto; text-align:center;">
      <input id="inputWhatsApp" type="text" placeholder="Enter your WhatsApp Number" style="
        width: 90%;
        padding: 12px;
        font-size: 18px;
        border-radius: 8px;
        border: 2px solid #c59b5a;
        margin-bottom: 12px;
        box-sizing: border-box;
      ">
      <button id="btnWhatsAppSubmit" style="
        width: 90%;
        padding: 12px;
        background: #c59b5a;
        color: #ffffff;
        font-weight: bold;
        border: 2px solid #c59b5a;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">Submit</button>
      <div id="regMessage" style="margin-top:12px; color:#ffd78c;"></div>
    </div>
  `;

  // Hover effect for luxury button
  const btn = document.getElementById("btnWhatsAppSubmit");
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#ffd78c";
    btn.style.color = "#000000";
    btn.style.borderColor = "#ffd78c";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#c59b5a";
    btn.style.color = "#ffffff";
    btn.style.borderColor = "#c59b5a";
  });

  document.getElementById("btnWhatsAppSubmit").addEventListener("click", handleWhatsAppSubmit);
}


// --- Handle WhatsApp lookup ---
async function handleWhatsAppSubmit() {
  const whatsapp = document.getElementById("inputWhatsApp").value.trim();
  const msgBox = document.getElementById("regMessage");
  if (!whatsapp) {
    msgBox.textContent = "Please enter your WhatsApp number.";
    msgBox.style.color = "red";
    return;
  }

  const users = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  const user = users.find(u => u.whatsapp === whatsapp);

  if (user) {
    // Existing user found
    currentUser = user;
    msgBox.innerHTML = `Welcome ${user.firstName}! Please toggle the classes you would like to join.`;
    msgBox.style.color = "#ffffff";

    document.getElementById("inputWhatsApp").style.display = "none";
    document.getElementById("btnWhatsAppSubmit").style.display = "none";

    enableClassToggles();
  } else {
    // New user
    msgBox.innerHTML = "WhatsApp not found. Please complete your registration.";
    msgBox.style.color = "#ffd78c";

    const wrapper = document.getElementById("registration-section");
    wrapper.innerHTML += `
      <div style="max-width:380px;margin:20px auto;text-align:center;">
        <input id="inputFirstName" type="text" placeholder="First Name">
        <input id="inputLastName" type="text" placeholder="Last Name">
        <input id="inputEmail" type="email" placeholder="Email">
        <button id="btnRegisterUser">Register</button>
        <div id="regMessage2" style="margin-top:12px; color:#ffd78c;"></div>
      </div>
    `;

    document.getElementById("btnRegisterUser").addEventListener("click", handleNewUserRegistration);
  }
}

// --- Handle new user registration ---
async function handleNewUserRegistration() {
  const firstName = document.getElementById("inputFirstName").value.trim();
  const lastName = document.getElementById("inputLastName").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const whatsapp = document.getElementById("inputWhatsApp").value.trim();
  const msgBox = document.getElementById("regMessage2");

  if (!firstName || !lastName || !email || !whatsapp) {
    msgBox.textContent = "Please complete all fields.";
    msgBox.style.color = "red";
    return;
  }

  msgBox.textContent = "Registering...";
  msgBox.style.color = "#ffd78c";

  const newUser = { firstName, lastName, email, whatsapp };
  const result = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      firstName,
      lastName,
      email,
      whatsapp,
      ack: true,
      type: "addUser"
    })
  }).then(r => r.json());

  if (result.success) {
    currentUser = newUser;
    msgBox.textContent = `Welcome to the Reiki Collective, ${firstName}! Please toggle the classes you would like to join.`;
    msgBox.style.color = "#ffffff";

    // Remove registration fields
    document.getElementById("inputFirstName").remove();
    document.getElementById("inputLastName").remove();
    document.getElementById("inputEmail").remove();
    document.getElementById("btnRegisterUser").remove();
  } else {
    msgBox.textContent = `Error: ${result.message || "Unknown error"}`;
    msgBox.style.color = "red";
  }

  enableClassToggles();
}

// --- Enable class toggles only after user recognized/registered ---
function enableClassToggles() {
  document.querySelectorAll(".lux-toggle").forEach(toggle => {
    toggle.style.pointerEvents = "auto";
  });
}

// --- Render Classes ---
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";



  classesData.sort((a, b) => parseInt(a.displayOrder || 999) - parseInt(b.displayOrder || 999));

  classesData.forEach((cls, i) => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    // --- Participants ---
    const participants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "confirmed")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    const standbyParticipants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "standby")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    // --- Location & Date ---
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} – ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;

    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    div.appendChild(locElem);
    div.appendChild(dateElem);

    // --- Participant list ---
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // --- Standby list ---
    if (standbyParticipants.length) {
      const standbyTitle = document.createElement("span");
      standbyTitle.textContent = "ON STANDBY";
      standbyTitle.style.color = "#c59b5a";
      standbyTitle.style.fontWeight = "bold";
      standbyTitle.style.fontSize = "18px";
      standbyTitle.style.display = "block";
      standbyTitle.style.marginTop = "6px";

      div.appendChild(standbyTitle);

      const standbyUl = document.createElement("ul");
      standbyParticipants.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        standbyUl.appendChild(li);
      });

      div.appendChild(standbyUl);
    }

    // --- Remaining / Toggle ---
    const remaining = cls.capacity - participants.length;
    const wrapper = document.createElement("div");
    wrapper.className = "spaces-toggle-wrapper";

    const remainText = document.createElement("span");
    remainText.textContent =
      remaining > 0 ? `→ ${remaining} spaces remaining` : "CLASS FULL – JOIN STANDBY";

    // --- Toggle ---
    const toggle = document.createElement("div");
    toggle.className = "lux-toggle";
    toggle.dataset.classId = cls.id;

    // Disabled by default until user recognized/registered
    toggle.style.pointerEvents = currentUser ? "auto" : "none";

    toggle.addEventListener("click", async () => {
      if (!currentUser) return;

      const classId = cls.id;
      const status = remaining > 0 ? "confirmed" : "standby";

      // Prevent double clicks
      toggle.style.pointerEvents = "none";

      await submitSingleClass(classId, status, currentUser);
      toggle.style.pointerEvents = "auto";

      // Optional: update class cards live
      registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
      renderClasses();
    });

    wrapper.appendChild(remainText);
    wrapper.appendChild(toggle);
    div.appendChild(wrapper);

    container.appendChild(div);

    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

// --- Submit a single class for the current user ---
async function submitSingleClass(classId, status, user) {
  if (!user) return;

  const selected = [{ classId, status }];
  await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      email: user.email || "",
      fullName: `${user.firstName} ${user.lastName}`,
      whatsapp: user.whatsapp,
      selectedClasses: JSON.stringify(selected),
      ack: true
    })
  });
}

init();



// https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec
