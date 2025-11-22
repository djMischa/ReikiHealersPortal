const API_BASE = "https://script.google.com/macros/s/AKfycbzeCSPatbn6VmWm_ps-0js8tSmW2W33nD68RVroy7L1UpH8umtXsGTqs8CaFBoCSJct/exec";

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
  container.style.display = "grid";
  container.innerHTML = "";

  // Sort classes by date+time
  classesData.sort((a,b)=>{
    const aTime = parseClassTime(a.date, a.time);
    const bTime = parseClassTime(b.date, b.time);
    return aTime - bTime;
  });

  classesData.forEach((cls,i)=>{
    if(cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    // Checkbox for selecting class
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "class-checkbox";
    checkbox.dataset.id = cls.id;
    div.appendChild(checkbox);

    // Participants for this class
    const participants = registrationsData
      .filter(r => r.classId === cls.id)
      .map(r => r.fullName)
      .sort((a,b)=>a.localeCompare(b));

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} - ${participants.length} healer${participants.length !== 1 ? 's' : ''}`;
    
    // Date + time properly formatted
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    const formatted = formatClassTime(cls.date, cls.time);
    dateElem.textContent = formatted;

    // Participant list
    const ul = document.createElement("ul");
    participants.forEach(p=>{
      const li = document.createElement("li");
      li.textContent = p;
      ul.appendChild(li);
    });

    // Remaining spaces link
    const remaining = cls.capacity - participants.length;
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.textContent = remaining > 0 ? `${remaining} spaces remain` : "Class full – standby available";

    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);
    div.appendChild(remainLink);

    container.appendChild(div);

    // Card entrance animation
    setTimeout(()=>{
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i*150);
  });
}

// Converts weird spreadsheet time into JS Date
function parseClassTime(dateStr, timeStr){
  const time = new Date(timeStr);
  if(!isNaN(time.getTime())) return time;
  // fallback for ISO string
  return new Date('1970-01-01T' + timeStr);
}

// Formats the time nicely
function formatClassTime(dateStr, timeStr){
  const time = parseClassTime(dateStr, timeStr);
  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2,'0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${dateStr} @ ${hour12}:${minutes} ${ampm}`;
}

init();


https://script.google.com/macros/s/AKfycbzeCSPatbn6VmWm_ps-0js8tSmW2W33nD68RVroy7L1UpH8umtXsGTqs8CaFBoCSJct/exec
