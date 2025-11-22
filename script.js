const API_BASE = "https://script.google.com/macros/s/AKfycbyRIBH_Jmtzgvd-e77Hjn53QtnLO52XwZCiVVz79rno7z5oTRgpQkCcfeoS72_PzVPB/exec";
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

    // Checkbox top-right
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.id = cls.id;
    checkboxDiv.appendChild(checkbox);
    div.appendChild(checkboxDiv);

    // Class Name
    const h3 = document.createElement("h3");
    h3.textContent = cls.name;
    h3.classList.add("class-name");
    div.appendChild(h3);

    // Location + Date
    const locDate = document.createElement("p");
    locDate.textContent = `${cls.location} | ${cls.date} ${cls.time}`;
    div.appendChild(locDate);

    // Participants
    const ul = document.createElement("ul");
    cls.participants?.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.replace(/\s*\([^)]*\)/g,''); // remove timestamps
      ul.appendChild(li);
    });
    div.appendChild(ul);

    container.appendChild(div);
  });
}

// =======================
// Modal logic
// =======================
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = () => modal.style.display = "none";

document.getElementById("registerButton").addEventListener("click", () => {
  const selectedCards = Array.from(document.querySelectorAll(".class-card input[type=checkbox]:checked"));
  if(!selectedCards.length){
    alert("Select at least one class to register.");
    return;
  }

  // Populate modal with selected classes
  const selectedClasses = selectedCards.map(c => {
    const card = c.closest(".class-card");
    return { id: c.dataset.id, name: card.querySelector(".class-name").textContent };
  });

  // Show selected classes in modal
  const classListDiv = document.getElementById("selectedClasses");
  classListDiv.innerHTML = "";
  selectedClasses.forEach(cls => {
    const div = document.createElement("div");
    div.textContent = cls.name;
    classListDiv.appendChild(div);
  });

  // Store selected class IDs in modal dataset
  modal.dataset.selectedClasses = JSON.stringify(selectedClasses.map(c=>c.id));

  modal.style.display = "block";
});

// =======================
// Submit registration
// =======================
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;

  const selectedClasses = JSON.parse(modal.dataset.selectedClasses || "[]");

  if(!selectedClasses.length || !ack){
    alert("Please select at least one class and acknowledge the terms.");
    return;
  }

  // Prefill fullName & WhatsApp if user exists
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


