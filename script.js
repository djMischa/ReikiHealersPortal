const API_BASE = "https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec";

let classesData = [];
let registrationsData = [];
let currentUser = null; // Logged-in user's data
let userRegistered = false; // Tracks if user submitted WhatsApp or registered

// --------------------
// Normalize phone numbers
// --------------------
function normalizePhone(num) {
  if (!num) return "";
  let digits = num.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.substring(1);
  return digits;
}

// --------------------
// Initialization
// --------------------
async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());

  renderRegistrationForm();
  renderClasses();
}

// --------------------
// Registration Form
// --------------------
function renderRegistrationForm() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div style="max-width: 400px; margin: 20px auto; text-align:center;">
      <input id="regWhatsApp" type="tel" inputmode="numeric" placeholder="Enter your WhatsApp number"
             style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
      <button id="whatsappSubmit" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#ffffff; border:none; border-radius:8px; cursor:pointer;">Submit</button>
      <div id="regMessage" style="margin-top:10px; font-weight:bold;"></div>
      <div id="extraFields" style="margin-top:12px; display:none;">
        <input id="regFirstName" type="text" placeholder="First Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regLastName" type="text" placeholder="Last Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regEmail" type="email" placeholder="Email" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <button id="fullRegister" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#ffffff; border:none; border-radius:8px; cursor:pointer;">Register</button>
      </div>
    </div>
  `;

  document.getElementById("whatsappSubmit").addEventListener("click", handleWhatsAppSubmit);
  document.getElementById("fullRegister")?.addEventListener("click", handleFullRegistration);
}

// --------------------
// Handle WhatsApp submit
// --------------------
async function handleWhatsAppSubmit() {
  const whatsappInput = document.getElementById("regWhatsApp");
  const submitBtn = document.getElementById("whatsappSubmit");
  const msgBox = document.getElementById("regMessage");
  const rawWhatsApp = whatsappInput.value.trim();

  if (!rawWhatsApp) {
    msgBox.textContent = "Please enter your WhatsApp number.";
    msgBox.style.color = "red";
    return;
  }

  whatsappInput.disabled = true;
  submitBtn.disabled = true;

  try {
    const usersResponse = await fetch(`${API_BASE}?type=users`);
    if (!usersResponse.ok) throw new Error("Failed to fetch users");
    const users = await usersResponse.json();

    // Find user exactly
    const user = users.find(u => u.whatsapp === rawWhatsApp);

    if (user) {
      currentUser = user;
      userRegistered = true;
      msgBox.style.fontSize = "26px";
      msgBox.style.color = "#ffffff";
      msgBox.textContent = `Welcome ${user.firstName}! Please toggle classes you would like to join.`;
    } else {
      document.getElementById("extraFields").style.display = "block";
      msgBox.style.fontSize = "26px";
      msgBox.style.color = "#ffffff";
      msgBox.textContent = "Please complete your registration.";
    }

    whatsappInput.style.display = "none";
    submitBtn.style.display = "none";

    // Only call renderClasses if registrationsData is loaded
    if (Array.isArray(registrationsData)) {
      renderClasses();
    } else {
      console.warn("registrationsData not loaded yet!");
    }

  } catch (err) {
    console.error("WhatsApp submit error:", err);
    msgBox.style.color = "red";
    msgBox.textContent = "Error contacting server. Try again.";
    whatsappInput.disabled = false;
    submitBtn.disabled = false;
  }
}




// --------------------
// Handle full registration
// --------------------
async function handleFullRegistration() {
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const rawWhatsApp = document.getElementById("regWhatsApp").value.trim();
  const whatsapp = normalizePhone(rawWhatsApp);

  const msgBox = document.getElementById("regMessage");

  if (!firstName || !lastName || !email) {
    msgBox.textContent = "Please complete all fields.";
    msgBox.style.color = "red";
    return;
  }

  try {
    // Send new user to Users tab
    const resText = await fetch(API_BASE, {
      method: "POST",
      body: new URLSearchParams({
        firstName,
        lastName,
        email,
        whatsapp,
        ack: true
      })
    }).then(r => r.text());

    let result;
    try {
      result = JSON.parse(resText);
    } catch (e) {
      console.error("Failed to parse JSON from server:", resText);
      msgBox.textContent = `Error: Unexpected response from server.`;
      msgBox.style.color = "red";
      return;
    }

    if (result.success) {
      currentUser = { firstName, lastName, email, whatsapp };
      userRegistered = true;
      msgBox.style.fontSize = "26px";
      msgBox.textContent = `Welcome to the Reiki Collective, ${firstName}! Please toggle classes you would like to join.`;
      msgBox.style.color = "#ffffff";

      // Hide extra fields
      document.getElementById("extraFields").style.display = "none";

      renderClasses(); // Now toggles are active
    } else {
      msgBox.textContent = `Error: ${result.message || "Unknown error"}`;
      msgBox.style.color = "red";
    }
  } catch (err) {
    console.error("Registration request failed:", err);
    msgBox.textContent = "Error: Could not connect to server.";
    msgBox.style.color = "red";
  }
}


// --------------------
// Format class time
// --------------------
function formatClassTime(dateStr, timeStr) {
  return `${dateStr || ""} @ ${timeStr || ""}`;
}

// --------------------
// Render Classes
// --------------------
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";
  container.style.display = "block";

  classesData.sort((a, b) => parseInt(a.displayOrder || 999) - parseInt(b.displayOrder || 999));

  classesData.forEach((cls, i) => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    const participants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "confirmed")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    const standbyParticipants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "standby")
      .map(r => r.fullName)
      .sort((a, b) => a.localeCompare(b));

    // Location & date
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} – ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    div.appendChild(locElem);
    div.appendChild(dateElem);

    // Participants list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Standby list
    if (standbyParticipants.length) {
      const standbyTitle = document.createElement("div");
      standbyTitle.textContent = "ON STANDBY";
      standbyTitle.style.marginTop = "10px";
      standbyTitle.style.fontWeight = "bold";
      standbyTitle.style.fontSize = "26px"; // match location
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

    // Remaining / toggle
    const remaining = cls.capacity - participants.length;
    const wrapper = document.createElement("div");
    wrapper.className = "spaces-toggle-wrapper";

    const remainText = document.createElement("span");
    remainText.textContent = remaining > 0 ? `→ ${remaining} spaces remaining` : "CLASS FULL – JOIN STANDBY";

    const toggle = document.createElement("div");
    toggle.className = "lux-toggle";
    toggle.dataset.classId = cls.id;

    // Disable until registered
    if (!userRegistered) toggle.style.pointerEvents = "none";

    // Highlight if currentUser already enrolled
    if (currentUser) {
      const isEnrolled = registrationsData.some(r =>
        r.classId === cls.id &&
        r.whatsapp === currentUser.whatsapp &&
        (r.status === "confirmed" || r.status === "standby")
      );
      if (isEnrolled) {
        toggle.classList.add("active");
        toggle.style.border = "2px solid #ffd78c"; // gold border
      }
    }

    toggle.addEventListener("click", async () => {
      if (!userRegistered) return;

      const isActive = toggle.classList.contains("active");
      toggle.classList.toggle("active");

      toggle.style.pointerEvents = "none";

      if (!isActive) {
        // Add registration locally
        registrationsData.push({
          classId: cls.id,
          fullName: `${currentUser.firstName} ${currentUser.lastName || ""}`,
          whatsapp: currentUser.whatsapp,
          status: remaining > 0 ? "confirmed" : "standby"
        });
        toggle.style.border = "2px solid #ffd78c"; // gold border
        await submitSingleClass(cls.id, remaining > 0 ? "confirmed" : "standby");
      } else {
        // Remove registration locally
        registrationsData = registrationsData.filter(r =>
          !(r.classId === cls.id && r.whatsapp === currentUser.whatsapp)
        );
        toggle.style.border = ""; // remove gold border
        await submitSingleClass(cls.id, "remove");
      }

      toggle.style.pointerEvents = "auto";
    });

    wrapper.appendChild(remainText);
    wrapper.appendChild(toggle);
    div.appendChild(wrapper);

    container.appendChild(div);

    // Fade-in
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

// --------------------
// Submit single class (server)
// --------------------
async function submitSingleClass(classId, status) {
  if (!currentUser) return;

  const selectedClasses = [{ classId, status }];

  await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      email: currentUser.email || "",
      fullName: `${currentUser.firstName} ${currentUser.lastName || ""}`,
      whatsapp: currentUser.whatsapp,
      selectedClasses: JSON.stringify(selectedClasses),
      ack: true
    })
  });
}

init();



// https://script.google.com/macros/s/AKfycbxIh2pNznerXY9k6hDS912Brb5w6-nhJVTNQP37Av0yffRedLf4KYqtvyS05iFEGQ2V/exec
