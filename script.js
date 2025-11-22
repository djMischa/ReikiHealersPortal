const API_BASE = "https://script.google.com/macros/s/AKfycby2Qsh6DlzFiqcGkwohFpuhzUMW6tJqYwvmsXM-xEX_lQTk6jGx1UGfDTPRxL97RAKZ/exec"; // replace with your deployed Apps Script URL

let classesData = [];
let usersData = [];

// Fetch Users and Classes
async function init() {
  usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  renderClasses();
}

function renderClasses() {
  const container = document.getElementById("classes-container");
  container.innerHTML = "";
  classesData.sort((a,b) => new Date(a.date) - new Date(b.date));
  classesData.forEach(cls => {
    if(cls.status === "hidden") return;
    const div = document.createElement("div");
    div.classList.add("class-card");
    div.innerHTML = `
      <div class="checkbox">
        <input type="checkbox" data-id="${cls.id}">
      </div>
      <h3>${cls.name}</h3>
      <p>${cls.location} | ${cls.date} ${cls.time}</p>
      <p class="spaces" data-id="${cls.id}">${cls.capacity} spaces remain</p>
    `;
    container.appendChild(div);
  });
}

// Modal logic
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = ()=> modal.style.display = "none";

document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;
  const selectedClasses = Array.from(document.querySelectorAll(".class-card input[type=checkbox]:checked"))
    .map(c => c.dataset.id);

  if(!selectedClasses.length){ alert("Select at least one class"); return; }

  // Prefill fullName if existing user
  const existingUser = usersData.find(u => u.email.toLowerCase() === email);
  if(existingUser){
    fullName = existingUser.fullname;
    whatsapp = existingUser.whatsapp;
  }

  const payload = { email, fullName, whatsapp, ack, selectedClasses };

  const res = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload)
  }).then(r=>r.json());

  if(res.success){
    alert("Registration successful!");
    modal.style.display = "none";
    init(); // refresh class counts
  } else {
    alert("Error: "+res.message);
  }
});

// Prefill fields when email is typed
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

init();
