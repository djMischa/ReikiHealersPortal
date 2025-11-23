const API_BASE = "https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec";

let classesData = [];
let registrationsData = [];

async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
  renderRegistrationForm();
}

function formatClassTime(dateStr, timeStr) {
  return `${dateStr || ''} @ ${timeStr || ''}`;
}

// --------------------
// Render Classes
// --------------------
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";
  container.style.display = "block";

  // Sort by display order
  classesData.sort(
    (a, b) => parseInt(a.displayOrder || 999) - parseInt(b.displayOrder || 999)
  );

  const currentEmail = document.getElementById("regEmail")?.value?.trim()?.toLowerCase() || "";

  classesData.forEach((cls, i) => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    // ---------------------------
    // Get Participants
    // ---------------------------
    const participants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "confirmed")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    const standbyParticipants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "standby")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    // Check if this user is signed up already
    const myRegistration = registrationsData.find(
      r => r.classId === cls.id && r.email?.toLowerCase() === currentEmail
    );
    const isMeConfirmed = myRegistration?.status === "confirmed";
    const isMeStandby = myRegistration?.status === "standby";

    // ---------------------------
    // Location + Date
    // ---------------------------
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} – ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;

    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    div.appendChild(locElem);
    div.appendChild(dateElem);

    // ---------------------------
    // Participant List
    // ---------------------------
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Standby List
    if (standbyParticipants.length) {
      const standbyTitle = document.createElement("div");
      standbyTitle.textContent = "ON STANDBY";
      standbyTitle.style.fontSize = "18px";
      standbyTitle.style.marginTop = "10px";
      standbyTitle.style.fontWeight = "bold";
      standbyTitle.style.color = "#c59b5a";

      const standbyUl = document.createElement("ul");
      standbyParticipants.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        standbyUl.appendChild(li);
      });

      div.appendChild(standbyTitle);
      div.appendChild(standbyUl);
    }

    // ---------------------------
    // Remaining Spaces
    // ---------------------------
    const remaining = cls.capacity - participants.length;

    const wrapper = document.createElement("div");
    wrapper.className = "spaces-toggle-wrapper";

    const remainText = document.createElement("span");
    remainText.textContent =
      remaining > 0
        ? `→ ${remaining} spaces remaining`
        : "CLASS FULL – JOIN STANDBY";

    // ---------------------------
    // Luxury Toggle
    // ---------------------------
    const toggle = document.createElement("div");
    toggle.className = "lux-toggle";
    toggle.dataset.classId = cls.id;

    // Turn ON if user already registered
    if (isMeConfirmed || isMeStandby) {
      toggle.classList.add("active");
    }

    toggle.addEventListener("click", async () => {
      const name = document.getElementById("regName")?.value?.trim();
      const email = document.getElementById("regEmail")?.value?.trim();
      const whatsapp = document.getElementById("regWhatsApp")?.value?.trim();
      const msgBox = document.getElementById("regMessage");

      if (!email || !name || !whatsapp) {
        msgBox.innerHTML = "Please complete all fields before joining a class.";
        msgBox.style.color = "red";
        return;
      }

      const wasActive = toggle.classList.contains("active");

      toggle.style.pointerEvents = "none";

      if (wasActive) {
        // User is removing themselves from the class
        await submitSingleClass(cls.id, "remove");
        toggle.classList.remove("active");
      } else {
        // User joining
        await submitSingleClass(
          cls.id,
          remaining > 0 ? "confirmed" : "standby"
        );
        toggle.classList.add("active");
      }

      toggle.style.pointerEvents = "auto";
    });

    wrapper.appendChild(remainText);
    wrapper.appendChild(toggle);
    div.appendChild(wrapper);

    container.appendChild(div);

    // Fade-in animation
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}



// --------------------
// Submit single class
// --------------------
async function submitSingleClass(classId, status) {
  const email = document.getElementById("regEmail").value.trim();
  const name = document.getElementById("regName").value.trim();
  const whatsapp = document.getElementById("regWhatsApp").value.trim();
  const msgBox = document.getElementById("regMessage");

  if (!email || !name || !whatsapp) {
    msgBox.innerHTML = "Please complete all fields before joining a class.";
    msgBox.style.color = "red";
    return;
  }

  msgBox.innerHTML = "Submitting...";
  msgBox.style.color = "#ffd78c";

  const selectedClasses = [{ classId, status }];

  const result = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      email,
      fullName: name,
      whatsapp,
      selectedClasses: JSON.stringify(selectedClasses),
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

// --------------------
// Render Registration Form
// --------------------
function renderRegistrationForm() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <h2 style="text-align:center; margin-top:60px;">Register for Classes</h2>
    <div style="max-width:380px;margin:25px auto;text-align:center;">
      <input id="regEmail" type="email" placeholder="Enter your email">
      <input id="regName" type="text" placeholder="Full Name">
      <input id="regWhatsApp" type="text" placeholder="WhatsApp Number">
      <button id="regSubmit">Submit Registration</button>
      <div id="regMessage" style="margin-top:10px;"></div>
    </div>
  `;

  document.getElementById("regEmail").addEventListener("blur", checkUserExists);
  document.getElementById("regSubmit").addEventListener("click", submitRegistration);
}

// --------------------
// Check user exists
// --------------------
async function checkUserExists() {
  const email = document.getElementById("regEmail").value.trim();
  if (!email) return;

  const users = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  const match = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (match) {
    document.getElementById("regName").value = match.fullName || "";
    document.getElementById("regWhatsApp").value = match.whatsapp || "";
  }
}

// --------------------
// Submit registration (just email + info, join classes via toggle)
// --------------------
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

  msgBox.innerHTML = "Submitting...";
  msgBox.style.color = "#ffd78c";

  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());

  msgBox.innerHTML = "Email registered! Now join classes below.";
  msgBox.style.color = "#c59b5a";
}

init();


// https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec
