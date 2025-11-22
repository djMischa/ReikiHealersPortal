const API_BASE = "https://script.google.com/macros/s/AKfycbxIau2Ma0wdrAhTsdPdfJT05OobXRAVfzeKzIOAGkIFFRZZd5qQ88PvkSMhQYyU-4sz/exec";

let classesData = [];
let usersData = [];

// Fetch Users and Classes
async function init() {
  try {
    usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());
    classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
    renderClasses();
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Render class cards
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";

  // Sort by date
  classesData.sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time));

  classesData.forEach(cls => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.classList.add("class-card");

    // Checkbox top-right
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "checkbox";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.id = cls.id;
    checkboxDiv.appendChild(input);

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    const count = cls.capacity - getRegistrationsCount(cls.id);
    locElem.innerHTML = `${cls.location} - ${cls.capacity - count} healer${count !== 1 ? "s" : ""}`;

    // Date
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} • ${cls.time}`;

    // Participant list
    const ul = document.createElement("ul");
    const participants = getRegistrationsForClass(cls.id);
    participants.sort((a,b) => a.fullName.localeCompare(b.fullName));
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.fullName;
      ul.appendChild(li);
    });

    // Remaining spaces link at bottom
    const remaining = cls.capacity - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.display = "block";
    remainLink.style.marginTop = "12px";
    remainLink.addEventListener("mouseenter", () => remainLink.style.textShadow = "0 0 8px rgba(255,215,140,0.9)");
    remainLink.addEventListener("mouseleave", () => remainLink.style.textShadow = "none");
    remainLink.textContent = remaining > 0 ? `${remaining} spaces remain` : "Class full – standby available";

    // Append elements
    div.appendChild(checkboxDiv);
    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);
    div.appendChild(remainLink);

    container.appendChild(div);
  });
}

// Helpers for registrations
function getRegistrationsForClass(classId) {
  return usersData.filter(u => u.registeredClasses && u.registeredClasses.includes(classId));
}

function getRegistrationsCount(classId) {
  return getRegistrationsForClass(classId).length;
}

// Register Now button
document.getElementById("cta").addEventListener("click", () => {
  const selectedClasses = Array.from(document.querySelectorAll(".class-card input[type=checkbox]:checked"))
    .map(input => input.dataset.id);

  if (!selectedClasses.length) {
    alert("Select at least one class to register.");
    return;
  }

  openRegistrationModal(selectedClasses);
});

// Modal logic
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = () => modal.style.display = "none";

function openRegistrationModal(selectedClasses) {
  modal.style.display = "block";
  const form = document.getElementById("registration-form");
  form.selectedClasses = selectedClasses;
}

// Form submission
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;
  const selectedClasses = form.selectedClasses;

  if (!selectedClasses.length) {
    alert("Select at least one class.");
    return;
  }

  // Prefill existing user
  const existingUser = usersData.find(u => u.email.toLowerCase() === email);
  if (existingUser) {
    fullName = existingUser.fullName;
    whatsapp = existingUser.whatsapp;
  }

  const payload = { email, fullName, whatsapp, ack, selectedClasses };

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      alert("Registration successful!");
      modal.style.display = "none";
      init(); // refresh cards
    } else {
      alert("Error: " + res.message);
    }
  } catch (err) {
    console.error(err);
    alert("Registration failed. See console for details.");
  }
});

// Prefill fields on email blur
document.getElementById("email").addEventListener("blur", e => {
  const email = e.target.value.trim().toLowerCase();
  const user = usersData.find(u => u.email.toLowerCase() === email);
  if (user) {
    document.getElementById("fullName").value = user.fullName;
    document.getElementById("whatsapp").value = user.whatsapp;
  } else {
    document.getElementById("fullName").value = "";
    document.getElementById("whatsapp").value = "";
  }
});

init();

