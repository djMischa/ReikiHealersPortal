const API_BASE = "https://script.google.com/macros/s/AKfycbytrcInmait2RgH9F0Xpkt3GZFMC1jt8OV7_knL2vx4qCQzvvFZEmwi_jY84wm7k8aZ/exec";

let classesData = [];
let registrationsData = [];

// Initialize: fetch classes and registrations
async function init() {
  classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
  registrationsData = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
  renderClasses();
}

function renderClasses() {
  const container = document.getElementById("classes");
  container.style.display = "block";
  container.innerHTML = "";

  // Sort classes by date
  classesData.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

  classesData.forEach((cls,i) => {
    if(cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    // Participants for this class
    const participants = registrationsData
      .filter(r => r.classId === cls.id)
      .map(r => r.fullName)
      .sort((a,b) => a.localeCompare(b));

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    const locText = document.createTextNode(cls.location + " ");
    locElem.appendChild(locText);

    const countSpan = document.createElement("span");
    countSpan.textContent = `- ${participants.length} healer${participants.length !== 1 ? 's' : ''}`;
    countSpan.style.color = "white";
    countSpan.style.textShadow = "0 0 5px rgba(197,155,90,0.6)";
    countSpan.style.fontSize = "26px";
    locElem.appendChild(countSpan);

    // Date
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} • ${cls.time}`;

    // Participant list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });

    // Remaining spaces link at bottom
    const remaining = cls.capacity - participants.length;
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

    if(remaining > 0){
      remainLink.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#c59b5a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px #c59b5a);">
            <path d="M8 5l8 7-8 7V5z"/>
          </svg>
          ${remaining} spaces remain
        </span>
      `;
    } else {
      remainLink.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#c59b5a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px #c59b5a);">
            <path d="M8 5l8 7-8 7V5z"/>
          </svg>
          Class full – standby available
        </span>
      `;
    }

    // Append elements in order
    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);
    div.appendChild(remainLink);

    container.appendChild(div);

    // Card entrance animation (staggered)
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

init();



