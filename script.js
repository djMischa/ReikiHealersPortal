// ---------- config ----------
const API_BASE = "https://script.google.com/macros/s/AKfycbwwWgPaY-U_Y1LxDf1P1wq3u0gYWozfHVyqRE-LRMDeC4y5_ZMNGjQpFdIjtjUJeIII/exec";

let classesData = [];
let registrationsData = [];
let currentUser = null; // Logged-in user's data (should include normalizedWhatsapp)
let userRegistered = false; // Tracks if user submitted WhatsApp or registered

// --------------------
// Normalize phone numbers (robust)
// returns { normalized, fallback }
// normalized: digits-only, trimmed leading country 1 (if US)
// fallback: last 10 digits for legacy matching
// --------------------
function normalizeWhatsapp(raw) {
  if (!raw) return { normalized: "", fallback: "" };
  let digits = raw.replace(/\D/g, "");
  // remove leading zeros
  digits = digits.replace(/^0+/, "");
  // If US-style leading '1' and 11 digits, strip
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  const normalized = digits;
  const fallback = digits.length >= 10 ? digits.slice(-10) : digits;
  return { normalized, fallback };
}

// small utility: show a transient message
function showToast(msg, isError = false) {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    box.style.position = "fixed";
    box.style.left = "50%";
    box.style.top = "20px";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "10px 18px";
    box.style.borderRadius = "8px";
    box.style.zIndex = 9999;
    box.style.fontWeight = "700";
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.style.background = isError ? "#ff4d4d" : "rgba(0,0,0,0.85)";
  box.style.color = "#fff";
  box.style.opacity = "1";
  setTimeout(() => { box.style.opacity = "0"; }, 3000);
}

// --------------------
// Initialization
// --------------------
async function init() {
  // Try to load cached currentUser from localStorage (speeds up UX)
  try {
    const cached = localStorage.getItem("rc_currentUser");
    if (cached) {
      currentUser = JSON.parse(cached);
      userRegistered = true;
    }
  } catch (e) { /* ignore */ }

  // Basic parallel fetch for now; we'll replace with a batch endpoint in code.gs
  const [classesResp, regsResp] = await Promise.all([
    fetch(`${API_BASE}?type=classes`),
    fetch(`${API_BASE}?type=registrations`)
  ]);
  classesData = (classesResp.ok ? await classesResp.json() : []);
  registrationsData = (regsResp.ok ? await regsResp.json() : []);

  renderRegistrationForm();
  renderClasses();
}

// --------------------
// Registration Form
// --------------------
function renderRegistrationForm() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div style="max-width: 400px; margin: 20px auto; text-align:center;">
      <input id="regWhatsApp" type="tel" inputmode="numeric" placeholder="Enter your WhatsApp number"
             style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
      <button id="whatsappSubmit" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#ffffff; border:none; border-radius:8px; cursor:pointer;">Submit</button>
      <div id="regMessage" style="margin-top:10px; font-weight:bold;"></div>
      <div id="extraFields" style="margin-top:12px; display:none;">
        <input id="regFirstName" type="text" placeholder="First Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regLastName" type="text" placeholder="Last Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regEmail" type="email" placeholder="Email" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <button id="fullRegister" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#ffffff; border:none; border-radius:8px; cursor:pointer;">Register</button>
      </div>
    </div>
  `;

  document.getElementById("whatsappSubmit").addEventListener("click", handleWhatsAppSubmit);
  document.getElementById("fullRegister")?.addEventListener("click", handleFullRegistration);
}

// --------------------
// Handle WhatsApp submit (LOGIN lookup)
// --------------------
async function handleWhatsAppSubmit() {
  const whatsappInput = document.getElementById("regWhatsApp");
  const submitBtn = document.getElementById("whatsappSubmit");
  const msgBox = document.getElementById("regMessage");
  const rawWhatsApp = whatsappInput.value.trim();

  if (!rawWhatsApp) {
    msgBox.textContent = "Please enter your WhatsApp number.";
    msgBox.style.color = "red";
    return;
  }

  whatsappInput.disabled = true;
  submitBtn.disabled = true;

  try {
    // Normalize once for lookup
    const { normalized, fallback } = normalizeWhatsapp(rawWhatsApp);

    // Fetch users (small dataset)
    const usersResponse = await fetch(`${API_BASE}?type=users`);
    if (!usersResponse.ok) throw new Error("Failed to fetch users");
    const users = await usersResponse.json();

    // Try to find user by normalizedWhatsapp or fallback
    const user = users.find(u => {
      if (!u) return false;
      const uNorm = (u.normalizedWhatsapp || "").replace(/\D/g, "");
      const uRaw = (u.whatsapp || "").replace(/\D/g, "");
      return (uNorm && uNorm === normalized) || (uRaw && (uRaw === normalized || uRaw === fallback));
    });

    if (user) {
      // ensure we store normalizedWhatsapp on currentUser
      const uNorm = normalizeWhatsapp(user.whatsapp || user.normalizedWhatsapp || "");
      currentUser = {
        ...user,
        normalizedWhatsapp: uNorm.normalized || user.normalizedWhatsapp || uNorm.fallback
      };
      userRegistered = true;
      // cache for faster return
      localStorage.setItem("rc_currentUser", JSON.stringify(currentUser));
      msgBox.style.fontSize = "26px";
      msgBox.style.color = "#ffffff";
      msgBox.textContent = `Welcome ${user.firstName}! Please toggle classes below to join.`;
    } else {
      // Not found
      document.getElementById("extraFields").style.display = "block";
      msgBox.style.fontSize = "26px";
      msgBox.style.color = "#ffffff";
      msgBox.textContent = "Please complete your registration.";
    }

    whatsappInput.style.display = "none";
    submitBtn.style.display = "none";

    // Re-render classes now that userRegistered/currentUser may be set
    renderClasses();

  } catch (err) {
    console.error("WhatsApp submit error:", err);
    msgBox.style.color = "red";
    msgBox.textContent = "Error contacting server. Try again.";
    whatsappInput.disabled = false;
    submitBtn.disabled = false;
  }
}

// --------------------
// Handle full registration (CREATE user)
// --------------------
async function handleFullRegistration() {
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const rawWhatsApp = document.getElementById("regWhatsApp").value.trim();
  const { normalized, fallback } = normalizeWhatsapp(rawWhatsApp);
  const whatsapp = normalized || fallback || rawWhatsApp.replace(/\D/g, "");
  const msgBox = document.getElementById("regMessage");

  if (!firstName || !lastName || !email) {
    msgBox.textContent = "Please complete all fields.";
    msgBox.style.color = "red";
    return;
  }

  try {
    // Send new user to Users tab (include normalizedWhatsapp)
    const resText = await fetch(API_BASE, {
      method: "POST",
      body: new URLSearchParams({
        action: "createUser",
        firstName,
        lastName,
        email,
        whatsapp,
        normalizedWhatsapp: whatsapp,
        ack: true
      })
    }).then(r => r.text());

    let result;
    try {
      result = JSON.parse(resText);
    } catch (e) {
      console.error("Failed to parse JSON from server:", resText);
      msgBox.textContent = `Error: Unexpected response from server.`;
      msgBox.style.color = "red";
      return;
    }

    if (result.success) {
      currentUser = {
        firstName,
        lastName,
        email,
        whatsapp,
        normalizedWhatsapp: whatsapp
      };
      userRegistered = true;
      localStorage.setItem("rc_currentUser", JSON.stringify(currentUser));
      msgBox.style.fontSize = "26px";
      msgBox.textContent = `Welcome to the Reiki Collective, ${firstName}! Please toggle classes you would like to join.`;
      msgBox.style.color = "#ffffff";

      // Hide extra fields
      document.getElementById("extraFields").style.display = "none";

      renderClasses(); // Now toggles are active
    } else {
      msgBox.textContent = `Error: ${result.message || "Unknown error"}`;
      msgBox.style.color = "red";
    }
  } catch (err) {
    console.error("Registration request failed:", err);
    msgBox.textContent = "Error: Could not connect to server.";
    msgBox.style.color = "red";
  }
}

// --------------------
// Format class time for display (unchanged)
// --------------------
function formatClassTime(dateStr, timeStr) {
  return `${dateStr || ""} @ ${timeStr || ""}`;
}

// --------------------
// Render Classes
// --------------------
function renderClasses() {
  const container = document.getElementById("classes");
  if (!container) return;

  container.innerHTML = "";
  container.style.display = "block";

  classesData.sort((a, b) => parseInt(a.displayOrder || 999) - parseInt(b.displayOrder || 999));

  classesData.forEach((cls, i) => {
    if (cls.status === "hidden") return;

    const div = document.createElement("div");
    div.className = "class-container";

    // Build canonical participants list from registrationsData
    const participants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "confirmed")
      .map(r => ({ fullName: r.fullName, normalizedWhatsapp: (r.normalizedWhatsapp || normalizeWhatsapp(r.whatsapp || "").normalized) }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    const standbyParticipants = registrationsData
      .filter(r => r.classId === cls.id && r.status === "standby")
      .map(r => ({ fullName: r.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Location & date
    const locElem = document.createElement("div");
    locElem.className = "class-location";
    locElem.textContent = `${cls.location} – ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    div.appendChild(locElem);
    div.appendChild(dateElem);

    // Participants list
    const ul = document.createElement("ul");
    participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.fullName;
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // Standby list
    if (standbyParticipants.length) {
      const standbyTitle = document.createElement("div");
      standbyTitle.textContent = "ON STANDBY";
      standbyTitle.style.marginTop = "10px";
      standbyTitle.style.fontWeight = "bold";
      standbyTitle.style.fontSize = "26px";
      standbyTitle.style.color = "#c59b5a";

      const standbyUl = document.createElement("ul");
      standbyParticipants.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.fullName;
        standbyUl.appendChild(li);
      });

      div.appendChild(standbyTitle);
      div.appendChild(standbyUl);
    }

    // Remaining / toggle
    const remaining = cls.capacity - participants.length;
    const wrapper = document.createElement("div");
    wrapper.className = "spaces-toggle-wrapper";

    const remainText = document.createElement("span");
    remainText.textContent = remaining > 0 ? `→ ${remaining} spaces remaining` : "CLASS FULL – JOIN STANDBY";

    const toggle = document.createElement("div");
    toggle.className = "lux-toggle";
    toggle.dataset.classId = cls.id;

    // Disable until registered
    if (!userRegistered) {
      toggle.style.pointerEvents = "none";
      toggle.title = "Please sign in to book";
    } else {
      toggle.style.pointerEvents = "auto";
    }

    // Highlight if currentUser already enrolled (use normalized matching)
    if (currentUser && currentUser.normalizedWhatsapp) {
      const isEnrolled = registrationsData.some(r => {
        if (r.classId !== cls.id) return false;
        const rNorm = (r.normalizedWhatsapp || "").replace(/\D/g, "");
        const rRaw = (r.whatsapp || "").replace(/\D/g, "");
        return (rNorm && rNorm === currentUser.normalizedWhatsapp) || (rRaw && (rRaw === currentUser.normalizedWhatsapp));
      });
      if (isEnrolled) {
        toggle.classList.add("active");
        toggle.style.border = "2px solid #ffd78c"; // gold border
      } else {
        toggle.classList.remove("active");
        toggle.style.border = "";
      }
    }

    // Click handler: optimistic UI + server write + revert on failure
    toggle.addEventListener("click", async () => {
      if (!userRegistered) return;

      const isActive = toggle.classList.contains("active");
      // Prevent double-clicks
      if (toggle.dataset.inflight === "1") return;
      toggle.dataset.inflight = "1";

      // Optimistic UI change
      toggle.classList.toggle("active");
      if (!isActive) toggle.style.border = "2px solid #ffd78c";
      else toggle.style.border = "";

      // Update local registrationsData optimistically
      if (!isActive) {
        registrationsData.push({
          classId: cls.id,
          fullName: `${currentUser.firstName} ${currentUser.lastName || ""}`.trim(),
          whatsapp: currentUser.whatsapp || currentUser.normalizedWhatsapp,
          normalizedWhatsapp: currentUser.normalizedWhatsapp,
          status: remaining > 0 ? "confirmed" : "standby",
          timestamp: new Date().toISOString()
        });
      } else {
        registrationsData = registrationsData.filter(r =>
          !(r.classId === cls.id && ( (r.normalizedWhatsapp && currentUser.normalizedWhatsapp && r.normalizedWhatsapp === currentUser.normalizedWhatsapp) || (r.whatsapp && currentUser.normalizedWhatsapp && r.whatsapp.replace(/\D/g, "") === currentUser.normalizedWhatsapp) ))
        );
      }

      // Send to server and handle response
      try {
        const resp = await submitSingleClass(cls.id, !isActive ? (remaining > 0 ? "confirmed" : "standby") : "remove");
        // Expect server to return updated registrations for this class or a success flag
        if (resp && resp.success) {
          // If server returned authoritative registrations, replace those entries in registrationsData
          if (Array.isArray(resp.updatedRegistrations)) {
            // remove local entries for this class, then push server's authoritative ones
            registrationsData = registrationsData.filter(r => r.classId !== cls.id);
            // ensure normalizedWhatsapp exists on each
            resp.updatedRegistrations.forEach(r => {
              registrationsData.push({
                ...r,
                normalizedWhatsapp: r.normalizedWhatsapp || normalizeWhatsapp(r.whatsapp || "").normalized
              });
            });
          }
          // Re-render the classes to update counts and lists
          renderClasses();
        } else {
          throw new Error(resp && resp.message ? resp.message : "Server rejected update");
        }
      } catch (err) {
        console.error("Booking update failed:", err);
        showToast("Booking update failed — please try again.", true);
        // Revert optimistic change
        if (!isActive) {
          // we tried to add; remove added entries
          registrationsData = registrationsData.filter(r => !(r.classId === cls.id && r.normalizedWhatsapp === currentUser.normalizedWhatsapp));
          toggle.classList.remove("active");
          toggle.style.border = "";
        } else {
          // we tried to remove; re-add entry (can't rebuild full object here, force re-render to reflect server)
          // best attempt: re-request registrations for this class (simple approach: re-fetch whole registrations)
          const reloadRegs = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
          registrationsData = reloadRegs;
        }
        renderClasses();
      } finally {
        toggle.dataset.inflight = "0";
      }
    });

    wrapper.appendChild(remainText);
    wrapper.appendChild(toggle);
    div.appendChild(wrapper);

    container.appendChild(div);

    // Fade-in
    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });
}

// --------------------
// Submit single class (server)
// returns parsed JSON or throws
// --------------------
async function submitSingleClass(classId, status) {
  if (!currentUser) throw new Error("No current user");

  const payload = {
    action: "updateRegistration",
    classId,
    status,
    email: currentUser.email || "",
    fullName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
    whatsapp: currentUser.whatsapp || currentUser.normalizedWhatsapp || "",
    normalizedWhatsapp: currentUser.normalizedWhatsapp || normalizeWhatsapp(currentUser.whatsapp || "").normalized,
    timestamp: new Date().toISOString()
  };

  const resp = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams(payload)
  });

  if (!resp.ok) throw new Error("Network error");
  const json = await resp.json();
  return json;
}

init();


// https://script.google.com/macros/s/AKfycbwwWgPaY-U_Y1LxDf1P1wq3u0gYWozfHVyqRE-LRMDeC4y5_ZMNGjQpFdIjtjUJeIII/exec
