const API_BASE = "https://script.google.com/macros/s/AKfycbxIau2Ma0wdrAhTsdPdfJT05OobXRAVfzeKzIOAGkIFFRZZd5qQ88PvkSMhQYyU-4sz/exec";

let classesData = [];
let registrationsData = [];

// Fetch classes and registrations
async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
}

function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";

  // Sort classes by date
  classesData.sort((a, b) => new Date(a.date) - new Date(b.date));

  classesData.forEach(cls => {
    const div = document.createElement("div");
    div.classList.add("class-container");

    // Add checkbox in top-right corner
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "checkbox";
    checkboxDiv.innerHTML = `<input type="checkbox" data-id="${cls.id}">`;
    div.appendChild(checkboxDiv);

    // Class title / location
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = cls.location;
    div.appendChild(locElem);

    // Class date / time
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} ${cls.time}`;
    div.appendChild(dateElem);

    // Participant list
    const ul = document.createElement("ul");
    const participants = registrationsData
      .filter(r => r.classId === cls.id)
      .map(r => r.fullName);

    participants.sort((a, b) => a.localeCompare(b)).forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });

    div.appendChild(ul);

    // Remaining spaces at bottom
    const remaining = cls.capacity - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.display = "block";
    remainLink.style.marginTop = "10px";
    remainLink.style.fontSize = "18px";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";

    if (remaining > 0) {
      remainLink.textContent = `${remaining} spaces remaining`;
    } else {
      remainLink.textContent = "Class full – standby available";
    }

    div.appendChild(remainLink);

    container.appendChild(div);
  });
}

// Initialize on page load
init();

