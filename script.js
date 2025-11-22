const API_BASE = "https://script.google.com/macros/s/AKfycbwKw5Oloqn_Zm22VPeYrEeSxpzRi-LXmGQDSl1hhBxE1IscWQfovJBPqUp4JkeNH6u-/exec";

let classesData = [];
let usersData = [];

// =======================
// Initialize data and render
// =======================
async function init() {
  try {
    // Fetch users
    usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());

    // Fetch classes
    classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());

    // Map participants string into array for rendering
    classesData = classesData.map(cls => ({
      id: cls.id,
      name: cls.name,
      date: cls.date,
      time: cls.time,
      location: cls.location,
      capacity: parseInt(cls.capacity, 10),
      status: cls.status,
      displayOrder: cls.displayOrder,
      participantsList: cls.participants ? cls.participants.split(",").map(p => p.trim()) : []
    }));

    renderClasses();
  } catch (err) {
    console.error("Error initializing:", err);
  }
}

// =======================
// Render class cards
// =======================
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";

  // Sort by displayOrder
  classesData.sort((a, b) => a.displayOrder - b.displayOrder);

  classesData.forEach(cls => {
    if (cls.status === "hidden") return;

    const card = document.createElement("div");
    card.classList.add("class-container");

    // Checkbox top right
    const checkboxDiv = document.createElement("div");
    checkboxDiv.classList.add("checkbox");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.id = cls.id;
    checkboxDiv.appendChild(checkbox);

    // Class title
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} - ${cls.participantsList.length} healer${cls.participantsList.length !== 1 ? 's' : ''}`;

    // Date & time
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} • ${cls.time}`;

    // Participant list
    const ul = document.createElement("ul");
    cls.participantsList.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });

    // Remaining spaces at bottom
    const remaining = cls.capacity - cls.participantsList.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.fontSize = "16px";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.display = "block";
    remainLink.style.marginTop = "10px";

    if (remaining > 0) {
      remainLink.textContent = `${remaining} spaces remaining`;
    } else {
      remainLink.textContent = "Class full - standby available";
    }

    // Append elements
    card.appendChild(checkboxDiv);
    card.appendChild(locElem);
    card.appendChild(dateElem);
    card.appendChild(ul);
    card.appendChild(remainLink);

    container.appendChild(card);
  });
}

// =======================
// Modal logic
// =======================
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = () => modal.style.display = "none";

// Bottom CTA click
document.getElementById("cta").addEventListener("click", () => {
  const selectedClasses = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"))
    .map(c => c.dataset.id);

  if (!selectedClasses.length) {
    alert("Select at least one class first!");
    return;
  }

  // Show modal
  modal.style.display = "block";

  // Clear previous form
  document.getElementById("registration-form").reset();

  // Prefill classes
  const selectedList = document.getElementById("registration-form").querySelector(".selected-classes");
  if (selectedList) selectedList.remove();
  const listDiv = document.createElement("div");
  listDiv.className = "selected-classes";
  listDiv.style.marginBottom = "12px";
  listDiv.innerHTML = "<strong>Selected Classes:</strong> " + selectedClasses.map(id => {
    const c = classesData.find(cl => cl.id === id);
    return c ? c.name + " (" + c.date + ")" : "";
  }).join(", ");
  document.getElementById("registration-form").prepend(listDiv);
});

// =======================
// Registration form submit
// =======================
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;

  const selectedClasses = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"))
    .map(c => c.dataset.id);

  if (!selectedClasses.length) { alert("Select at least one class"); return; }
  if (!email || !fullName || !ack) { alert("Please complete all required fields"); return; }

  // Check if user exists
  const existingUser = usersData.find(u => u.email.toLowerCase() === email);
  if (existingUser) {
    fullName = existingUser.fullname;
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
      init(); // refresh class cards with updated participants
    } else {
      alert("Error: " + res.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// Prefill fullName & WhatsApp when email is entered
document.getElementById("email").addEventListener("blur", e => {
  const email = e.target.value.trim().toLowerCase();
  const user = usersData.find(u => u.email.toLowerCase() === email);
  if (user) {
    document.getElementById("fullName").value = user.fullname;
    document.getElementById("whatsapp").value = user.whatsapp;
  } else {
    document.getElementById("fullName").value = "";
    document.getElementById("whatsapp").value = "";
  }
});

// =======================
// Initialize
// =======================
init();


