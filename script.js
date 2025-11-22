const API_BASE = "https://script.google.com/macros/s/AKfycbxIau2Ma0wdrAhTsdPdfJT05OobXRAVfzeKzIOAGkIFFRZZd5qQ88PvkSMhQYyU-4sz/exec";

let classesData = [];
let usersData = [];
let registrationsData = [];

// Fetch data from backend
async function init() {
  try {
    usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());
    classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
    registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());

    console.log("Users:", usersData.length, "Classes:", classesData.length, "Registrations:", registrationsData.length);

    renderClasses();
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";

  if (!classesData || !classesData.length) {
    container.innerHTML = "<p>No classes available</p>";
    return;
  }

  // Sort by date
  classesData.sort((a, b) => new Date(a.date) - new Date(b.date));

  classesData.forEach((cls, index) => {
    if (cls.status && cls.status.toLowerCase() === "hidden") return;

    // Get participants for this class
    const participants = registrationsData.filter(r => {
      if (!r.classId || !cls.id) {
        console.warn("Missing classId in registration or class id:", r, cls);
        return false;
      }
      return r.classId.trim() === cls.id.trim();
    });

    const div = document.createElement("div");
    div.className = "class-container";

    // Checkbox top-right
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "checkbox";
    checkboxDiv.innerHTML = `<input type="checkbox" data-id="${cls.id}">`;
    div.appendChild(checkboxDiv);

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = cls.location + " ";
    const countSpan = document.createElement("span");
    countSpan.textContent = `- ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;
    countSpan.style.color = "white";
    countSpan.style.textShadow = "0 0 5px rgba(197,155,90,0.6)";
    countSpan.style.fontSize = "26px";
    locElem.appendChild(countSpan);
    div.appendChild(locElem);

    // Date and time
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} ${cls.time || ""}`.trim();
    div.appendChild(dateElem);

    // Participant list
    const ul = document.createElement("ul");
    participants.sort((a, b) => a.fullName.localeCompare(b.fullName)).forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.fullName;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Remaining spaces
    const remaining = (cls.capacity || 15) - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.fontSize = "18px";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.marginTop = "12px";
    remainLink.style.display = "block";
    remainLink.addEventListener("mouseenter", () => {
      remainLink.style.textShadow = "0 0 8px rgba(255,215,140,0.9)";
    });
    remainLink.addEventListener("mouseleave", () => {
      remainLink.style.textShadow = "none";
    });

    if (remaining > 0) {
      remainLink.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#c59b5a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px #c59b5a);">
          <path d="M8 5l8 7-8 7V5z"/>
        </svg>
        ${remaining} spaces remaining
      </span>`;
    } else {
      remainLink.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#c59b5a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px #c59b5a);">
          <path d="M8 5l8 7-8 7V5z"/>
        </svg>
        Class full – standby available
      </span>`;
    }

    div.appendChild(remainLink);

    container.appendChild(div);

    // Animate
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, index * 150);
  });
}

// Initialize
init();


