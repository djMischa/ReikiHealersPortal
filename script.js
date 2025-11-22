const API_BASE = "https://script.google.com/macros/s/AKfycbyTdeHOJeyRcDpTHe5_TYfuM7-D5oL7YcCjP0v7s09glv304n_fIAtegj9IdHfG-x0Y/exec"; // your Apps Script URL
const REGISTRATION_URL = "https://tinyurl.com/ReikiReg";

let classesData = [];
let usersData = [];

// Initialize: fetch classes and users
async function init() {
  usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  renderClasses();
}

// Render class cards
function renderClasses() {
  const container = document.getElementById("classes-container");
  container.innerHTML = "";

  // Sort by displayOrder or date
  classesData.sort((a,b) => new Date(a.date) - new Date(b.date));

  classesData.forEach(cls => {
    if(cls.status === "hidden") return;

    const div = document.createElement("div");
    div.classList.add("class-card");

    // Checkbox
    const checkboxDiv = document.createElement("div");
    checkboxDiv.classList.add("checkbox");
    checkboxDiv.innerHTML = `<input type="checkbox" data-id="${cls.id}">`;
    div.appendChild(checkboxDiv);

    // Class name
    const nameElem = document.createElement("h3");
    nameElem.textContent = cls.name;
    div.appendChild(nameElem);

    // Location
    const locElem = document.createElement("h4");
    locElem.textContent = cls.location;
    div.appendChild(locElem);

    // Date and time
    const dtElem = document.createElement("p");
    dtElem.textContent = `${cls.date} • ${cls.time}`;
    div.appendChild(dtElem);

    // Spaces remaining
    const registeredCount = cls.registered || 0; // later fetch real count from Registrations
    const remaining = cls.capacity - registeredCount;
    const remainLink = document.createElement("a");
    remainLink.href = REGISTRATION_URL;
    remainLink.target = "_blank";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none"; // no underline
    remainLink.style.fontSize = "16px";
    remainLink.style.marginTop = "8px";
    remainLink.style.display = "inline-block";
    remainLink.textContent = remaining > 0 ? `- ${remaining} healers` : "Class full - standby available";
    div.appendChild(remainLink);

    container.appendChild(div);
  });
}

// Modal logic
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = () => modal.style.display = "none";

// Form submission
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;

  // Selected classes
  const selectedClasses = Array.from(document.querySelectorAll(".class-card input[type=checkbox]:checked"))
    .map(c => c.dataset.id);

  if(!selectedClasses.length){ alert("Select at least one class"); return; }

  // Prefill if user exists
  const existingUser = usersData.find(u => u.email.toLowerCase() === email);
  if(existingUser){
    fullName = existingUser.fullname;
    whatsapp = existingUser.whatsapp;
  }

  const payload = { email, fullName, whatsapp, ack, selectedClasses };

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if(res.success){
      alert("Registration successful!");
      modal.style.display = "none";
      init(); // refresh class cards (update spaces remaining)
    } else {
      alert("Error: "+res.message);
    }
  } catch(err) {
    console.error(err);
    alert("Error submitting registration.");
  }
});

// Prefill form fields when email is entered
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

// Initialize page
init();

