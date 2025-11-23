const API_BASE = "https://script.google.com/macros/s/AKfycbzeCSPatbn6VmWm_ps-0js8tSmW2W33nD68RVroy7L1UpH8umtXsGTqs8CaFBoCSJct/exec";

let classesData = [];
let registrationsData = [];

// Initialize
async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
  renderRegistrationForm();
}

// Format date/time (already works fine)
function formatClassTime(dateStr, timeStr){
  if(!dateStr) dateStr = '';
  if(!timeStr) timeStr = '';
  return `${dateStr} @ ${timeStr}`;
}

/* -------------------------------------------------------------
   1. RENDER CLASS CARDS
------------------------------------------------------------- */
function renderClasses() {
  const container = document.getElementById("classes");
  container.style.display = "block";
  container.innerHTML = "";

  // Respect displayOrder if present
  classesData.sort((a, b) => {
    const ao = parseInt(a.displayOrder || 999);
    const bo = parseInt(b.displayOrder || 999);
    return ao - bo;
  });

  classesData.forEach((cls, i) => {
    if(cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";
    div.style.position = "relative";

    // Checkbox (select class for registration)
    const checkDiv = document.createElement("div");
    checkDiv.className = "class-checkbox";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.classId = cls.id;

    checkDiv.appendChild(checkbox);
    div.appendChild(checkDiv);

    // Find participants
    const participants = registrationsData
      .filter(r => r.classId === cls.id)
      .map(r => r.fullName)
      .sort((a,b) => a.localeCompare(b));

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";

    const locText = document.createTextNode(`${cls.location} `);
    locElem.appendChild(locText);

    const countSpan = document.createElement("span");
    countSpan.textContent = `- ${participants.length} healer${participants.length !== 1 ? 's' : ''}`;
    countSpan.style.color = "white";
    countSpan.style.fontSize = "26px";
    locElem.appendChild(countSpan);

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

    // Append in order
    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);

    container.appendChild(div);

    // Fade-in animation
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

/* -------------------------------------------------------------
   2. RENDER REGISTRATION FORM BELOW CARDS
------------------------------------------------------------- */
function renderRegistrationForm(){
  const wrapper = document.getElementById("registration-section");
  if(!wrapper) return;

  wrapper.innerHTML = `
    <h2 style="text-align:center; margin-top:60px;">Register for Classes</h2>

    <div style="max-width:450px;margin:25px auto;text-align:center;">
      <input id="regEmail" type="email" placeholder="Enter your email"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;">
      <input id="regName" type="text" placeholder="Full Name"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;">
      <input id="regWhatsApp" type="text" placeholder="WhatsApp Number"
        style="width:100%;padding:12px;border-radius:8px;margin-bottom:12px;">

      <button id="regSubmit"
        style="width:100%;padding:12px;border-radius:8px;background:#c59b5a;color:white;font-size:18px;">
        Submit Registration
      </button>

      <div id="regMessage" style="margin-top:15px;font-size:16px;"></div>
    </div>
  `;

  // Autofill when email entered
  document.getElementById("regEmail").addEventListener("blur", checkUserExists);
  document.getElementById("regSubmit").addEventListener("click", submitRegistration);
}

/* -------------------------------------------------------------
   3. CHECK IF USER EXISTS
------------------------------------------------------------- */
async function checkUserExists(){
  const email = document.getElementById("regEmail").value.trim();
  if(!email) return;

  const users = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  const match = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

  if(match){
    document.getElementById("regName").value = match.fullName || "";
    document.getElementById("regWhatsApp").value = match.whatsapp || "";
  }
}

/* -------------------------------------------------------------
   4. SUBMIT REGISTRATION
------------------------------------------------------------- */
async function submitRegistration(){
  const email = document.getElementById("regEmail").value.trim();
  const name = document.getElementById("regName").value.trim();
  const whatsapp = document.getElementById("regWhatsApp").value.trim();
  const msgBox = document.getElementById("regMessage");

  if(!email || !name || !whatsapp){
    msgBox.innerHTML = "Please complete all fields.";
    msgBox.style.color = "red";
    return;
  }

  // Get selected classes
  const selected = [...document.querySelectorAll(".class-checkbox input:checked")]
      .map(c => c.dataset.classId);

  if(selected.length === 0){
    msgBox.innerHTML = "Please choose at least one class.";
    msgBox.style.color = "red";
    return;
  }

  msgBox.innerHTML = "Submitting...";
  msgBox.style.color = "gold";

  const result = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams({
      email,
      fullName: name,
      whatsapp,
      classIds: JSON.stringify(selected)
    })
  }).then(r => r.text());

  msgBox.innerHTML = "Registration successful!";
  msgBox.style.color = "lightgreen";

  // Refresh data
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
}

init();



// https://script.google.com/macros/s/AKfycbzeCSPatbn6VmWm_ps-0js8tSmW2W33nD68RVroy7L1UpH8umtXsGTqs8CaFBoCSJct/exec
