const API_BASE = "https://script.google.com/macros/s/AKfycbwKw5Oloqn_Zm22VPeYrEeSxpzRi-LXmGQDSl1hhBxE1IscWQfovJBPqUp4JkeNH6u-/exec"; // your deployed script

let classesData = [];
let registrationsData = [];

// Initialize page
async function init() {
  try {
    classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
    registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
    renderClasses();
  } catch(err) {
    console.error("Error fetching data:", err);
  }
}

// Render class cards
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";
  if (!classesData || classesData.length === 0) return;

  // Sort classes by date
  classesData.sort((a, b) => new Date(a.date) - new Date(b.date));

  classesData.forEach(cls => {
    const div = document.createElement("div");
    div.className = "class-container";

    // Class location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    const participants = registrationsData.filter(r => r.classId === cls.id);
    locElem.textContent = `${cls.location} - ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;
    div.appendChild(locElem);

    // Class date
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} • ${cls.time}`;
    div.appendChild(dateElem);

    // Participant list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.fullName;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Remaining spaces
    const remaining = cls.capacity - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.display = "block";
    remainLink.style.marginTop = "8px";
    remainLink.textContent = remaining > 0 ? `${remaining} spaces remaining` : "Class full – standby available";
    div.appendChild(remainLink);

    container.appendChild(div);
  });
}

window.addEventListener("DOMContentLoaded", init);


