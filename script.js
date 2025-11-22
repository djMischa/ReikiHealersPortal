const API_BASE = "https://script.google.com/macros/s/AKfycbzeCSPatbn6VmWm_ps-0js8tSmW2W33nD68RVroy7L1UpH8umtXsGTqs8CaFBoCSJct/exec";

let classesData = [];
let registrationsData = [];
let usersData = [];

// Initialize: fetch classes, registrations, and users
async function init() {
  [classesData, registrationsData, usersData] = await Promise.all([
    fetch(`${API_BASE}?type=classes`).then(r => r.json()),
    fetch(`${API_BASE}?type=registrations`).then(r => r.json()),
    fetch(`${API_BASE}?type=users`).then(r => r.json())
  ]);

  renderClasses();
}

function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";

  classesData.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

  classesData.forEach((cls,i) => {
    if(cls.status === "hidden") return;

    const participants = registrationsData
      .filter(r => r.classId === cls.id)
      .map(r => r.fullName)
      .sort((a,b) => a.localeCompare(b));

    const div = document.createElement("div");
    div.className = "class-container";
    div.style.position = "relative"; // for checkbox

    // ✅ Checkbox
    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.style.position = "absolute";
    checkboxWrapper.style.top = "10px";
    checkboxWrapper.style.right = "10px";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.id = cls.id;
    checkboxWrapper.appendChild(checkbox);
    div.appendChild(checkboxWrapper);

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} - ${participants.length} healer${participants.length !== 1 ? 's' : ''}`;
    div.appendChild(locElem);

    // ✅ Date/time formatting
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    const dateObj = new Date(cls.date + ' ' + cls.time);
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('en-US', options);
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    dateElem.textContent = `${formattedDate} @ ${formattedTime}`;
    div.appendChild(dateElem);

    // Participant list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Remaining spaces
    const remaining = cls.capacity - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "#";
    remainLink.style.fontSize = "18px";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.display = "block";
    remainLink.style.marginTop = "12px";
    remainLink.textContent = remaining > 0 ? `${remaining} spaces remain` : "Class full – standby available";
    div.appendChild(remainLink);

    container.appendChild(div);

    // Entrance animation
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 100);
  });
}


// --------------------
// Modal & registration
// --------------------
const modal = document.getElementById("modal");
const closeBtn = modal.querySelector(".close");
closeBtn.onclick = () => modal.style.display = "none";

document.getElementById("registerBtn").addEventListener("click", () => {
  // Only proceed if at least one checkbox selected
  const selectedCheckboxes = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"));
  if(!selectedCheckboxes.length){
    alert("Please select at least one class to register.");
    return;
  }
  modal.style.display = "block";
});

// Prefill fullName and whatsapp on email blur
document.getElementById("email").addEventListener("blur", e => {
  const email = e.target.value.trim().toLowerCase();
  const user = usersData.find(u => u.email.toLowerCase() === email);
  if(user){
    document.getElementById("fullName").value = user.fullname;
    document.getElementById("whatsapp").value = user.whatsapp;
  } else {
    document.getElementById("fullName").value = "";
    document.getElementById("whatsapp").value = "";
  }
});

// Handle form submission
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const fullName = document.getElementById("fullName").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;

  if(!ack){ alert("You must acknowledge the terms."); return; }

  // Gather selected classes
  const selectedClasses = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"))
    .map(cb => cb.dataset.id);

  if(!selectedClasses.length){ alert("Please select at least one class."); return; }

  const payload = { email, fullName, whatsapp, ack, selectedClasses };

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if(res.success){
      alert("Registration successful!");
      modal.style.display = "none";
      // Clear checkboxes
      document.querySelectorAll(".class-container input[type=checkbox]").forEach(cb => cb.checked = false);
      init(); // refresh classes
    } else {
      alert("Error: " + res.message);
    }
  } catch(err){
    alert("Error submitting registration: " + err.message);
  }
});

init();


