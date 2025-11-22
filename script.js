const API_BASE = "https://script.google.com/macros/s/AKfycbyRIBH_Jmtzgvd-e77Hjn53QtnLO52XwZCiVVz79rno7z5oTRgpQkCcfeoS72_PzVPB/exec"; // replace if updated

let classesData = [];
let usersData = [];

// Fetch Users and Classes
async function init() {
  try {
    usersData = await fetch(`${API_BASE}?type=users`).then(r => r.json());
    classesData = await fetch(`${API_BASE}?type=classes`).then(r => r.json());
    renderClasses();
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Render class cards
function renderClasses() {
  const container = document.getElementById("classes");
  container.innerHTML = "";
  
  // Sort by date
  classesData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  classesData.forEach(cls => {
    if(cls.status === "hidden") return;

    const div = document.createElement("div");
    div.classList.add("class-container");

    // Checkbox top-right
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.id = cls.id;
    checkboxDiv.appendChild(checkbox);
    div.appendChild(checkboxDiv);

    // Class location + headcount
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = cls.location + " ";
    const countSpan = document.createElement("span");
    countSpan.textContent = `- ${cls.participants || 0} healer${cls.participants != 1 ? 's' : ''}`;
    countSpan.style.color = "white";
    countSpan.style.textShadow = "0 0 5px rgba(197,155,90,0.6)";
    locElem.appendChild(countSpan);
    div.appendChild(locElem);

    // Date & Time
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = `${cls.date} ${cls.time || ""}`;
    div.appendChild(dateElem);

    // Participants list
    const ul = document.createElement("ul");
    if(cls.participantsList && cls.participantsList.length){
      cls.participantsList.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p;
        ul.appendChild(li);
      });
    }
    div.appendChild(ul);

    // Remaining spaces
    const remaining = (cls.capacity || 0) - (cls.participantsList ? cls.participantsList.length : 0);
    const remainLink = document.createElement("a");
    remainLink.href = "https://tinyurl.com/ReikiReg";
    remainLink.target = "_blank";
    remainLink.style.fontSize = "18px";
    remainLink.style.color = "#c59b5a";
    remainLink.style.textDecoration = "none";
    remainLink.style.marginTop = "12px";
    remainLink.style.display = "block";
    remainLink.addEventListener("mouseenter", () => remainLink.style.textShadow = "0 0 8px rgba(255,215,140,0.9)");
    remainLink.addEventListener("mouseleave", () => remainLink.style.textShadow = "none");

    if(remaining > 0){
      remainLink.textContent = `${remaining} spaces remaining`;
    } else {
      remainLink.textContent = "Class full – standby available";
    }
    div.appendChild(remainLink);

    container.appendChild(div);
  });
}

// Modal logic
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close");
closeBtn.onclick = ()=> modal.style.display = "none";

// Show modal when clicking bottom CTA
document.getElementById("cta").addEventListener("click", () => {
  const selectedCheckboxes = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"));
  if(!selectedCheckboxes.length){
    alert("Please select at least one class to register.");
    return;
  }
  // Populate modal with selected classes
  modal.style.display = "block";
});

// Registration form submit
document.getElementById("registration-form").addEventListener("submit", async e => {
  e.preventDefault();
  
  const email = document.getElementById("email").value.trim().toLowerCase();
  let fullName = document.getElementById("fullName").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  const ack = document.getElementById("ack").checked;

  const selectedClasses = Array.from(document.querySelectorAll(".class-container input[type=checkbox]:checked"))
    .map(c => c.dataset.id);

  if(!selectedClasses.length){ alert("Select at least one class"); return; }

  // Prefill fullName & WhatsApp if user exists
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
      init(); // refresh class cards with updated counts
    } else {
      alert("Error: "+res.message);
    }
  } catch(err){
    console.error(err);
    alert("Failed to register. See console for details.");
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

// Initialize
init();


