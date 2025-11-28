// ---------- config ----------
const API_BASE = "https://script.google.com/macros/s/AKfycbyjtbmTmw-CGVuLO2jscrukZHdumWt7oPlxLK8PY39YrHjfppuB3QU-DlHr97iJmDq1/exec";

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
  const s = String(raw);
  let digits = s.replace(/\D/g, "");
  // remove leading zeros
  digits = digits.replace(/^0+/, "");
  // If US-style leading '1' and 11 digits, strip
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  const normalized = digits;
  const fallback = digits.length >= 10 ? digits.slice(-10) : digits;
  return { normalized, fallback };
}

// small helper: coerce any incoming value to digits-only string
function cleanNumber(v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\D/g, "");
}

// convert an ISO date (or Date) to your manual classId format, e.g. Nov2524
function formatClassIdFromDate(d) {
  try {
    const date = (d instanceof Date) ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    const month = date.toLocaleString('en-US', { month: 'short' }); // e.g. "Nov"
    const day = String(date.getDate()).padStart(2, '0'); // 01..31
    const yr = String(date.getFullYear()).slice(-2); // last 2 digits
    return `${month}${day}${yr}`;
  } catch (e) {
    return "";
  }
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
  // Try to load cached currentUser from sessionStorage (clears when tab/browser closes)
try {
  const cached = sessionStorage.getItem("rc_currentUser");
  if (cached && cached !== "null" && cached !== "") {
    currentUser = JSON.parse(cached);
    if (currentUser) {
      currentUser.normalizedWhatsapp = cleanNumber(
        currentUser.normalizedWhatsapp || currentUser.whatsapp || ""
      );
      userRegistered = true;
    }
  }
} catch (e) { /* ignore */ }


  // Basic parallel fetch for now
  try {
    const [classesResp, regsResp] = await Promise.all([
      fetch(`${API_BASE}?type=classes`),
      fetch(`${API_BASE}?type=registrations`)
    ]);

    const rawClasses = classesResp.ok ? await classesResp.json() : [];
    const rawRegs = regsResp.ok ? await regsResp.json() : [];

    classesData = Array.isArray(rawClasses) ? rawClasses : [];
    registrationsData = Array.isArray(rawRegs) ? rawRegs : [];

    // Normalize incoming users/registrations so comparisons are consistent
    normalizeFetchedData();

    // renderRegistrationForm();
    renderClasses();
  } catch (err) {
    console.error('Initialization failed:', err);
    showToast('Error loading data. Try reloading.', true);
  }
}

// Ensure fetched registrations and classes have consistent types and normalized numbers
function normalizeFetchedData() {
  // normalize registrations
  registrationsData = registrationsData.map(r => {
    const copy = Object.assign({}, r);
    // ensure classId is string
    copy.classId = copy.classId === undefined || copy.classId === null ? '' : String(copy.classId);
    copy.whatsapp = copy.whatsapp === undefined || copy.whatsapp === null ? '' : String(copy.whatsapp);
    // normalizedWhatsapp may be stored as number in sheets; coerce
    copy.normalizedWhatsapp = cleanNumber(copy.normalizedWhatsapp || copy.whatsapp || '');
    return copy;
  });

  // normalize classes (ensure id is string)
  classesData = classesData.map(c => {
    const copy = Object.assign({}, c);
    copy.id = copy.id === undefined || copy.id === null ? '' : String(copy.id);
    copy.capacity = Number(copy.capacity || 0);
    return copy;
  });

  // If currentUser exists but normalizedWhatsapp is missing, try to compute it
  if (currentUser) {
    currentUser.normalizedWhatsapp = cleanNumber(currentUser.normalizedWhatsapp || currentUser.whatsapp || '');
  }
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
    const { normalized, fallback } = normalizeWhatsapp(rawWhatsApp);

    const usersResponse = await fetch(`${API_BASE}?type=users`);
    const users = usersResponse.ok ? await usersResponse.json() : [];

    if (!Array.isArray(users)) throw new Error('Users API did not return array');

    const normUsers = users.map(u => {
      const copy = Object.assign({}, u);
      copy.whatsapp = String(copy.whatsapp || '');
      copy.normalizedWhatsapp = cleanNumber(copy.normalizedWhatsapp || copy.whatsapp);
      return copy;
    });

    const user = normUsers.find(u => {
      const uNorm = u.normalizedWhatsapp;
      const uRaw = cleanNumber(u.whatsapp);
      return (uNorm === normalized || uRaw === normalized || uRaw === fallback);
    });

    if (user) {

      const regApproved = user.regStat === true || user.regStat === "TRUE";

      currentUser = user;
      userRegistered = true;
      sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

      if (regApproved) {
        msgBox.innerHTML = `
          <div style="text-align:center;font-size:30px;color:#c59b5a;">
            ✦ WELCOME ${user.firstName.toUpperCase()} ✦
          </div>
          <div style="font-size:18px;color:#ffffff;">
            PLEASE SELECT THE HEALING SESSIONS YOU WOULD LOVE TO PARTICIPATE IN
          </div>
        `;
      } else {
        msgBox.innerHTML = `
          <div style="text-align:center;font-size:28px;color:#c59b5a;">
            ✦ WELCOME ${user.firstName.toUpperCase()} ✦
          </div>
          <div style="font-size:17px;color:#7FFF00;">
            SORRY! WE ARE HAVING DIFFICULTIES WITH YOUR LOGIN - ADMIN HAS BEEN NOTIFIED
          </div>
        `;
        userRegistered = false; // LOCK ACCESS
      }

    } else {
      document.getElementById("extraFields").style.display = "block";
      msgBox.textContent = "Please complete your registration.";
      msgBox.style.color = "#ffffff";
    }

    whatsappInput.style.display = "none";
    submitBtn.style.display = "none";
    renderClasses();

  } catch (err) {
    console.error(err);
    msgBox.textContent = "Error contacting server.";
    msgBox.style.color = "red";
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
    const resText = await fetch(API_BASE, {
      method: "POST",
      body: new URLSearchParams({
        action: "createUser",
        firstName,
        lastName,
        email,
        whatsapp,
        normalizedWhatsapp: whatsapp
      })
    }).then(r => r.text());

    const result = JSON.parse(resText);

    if (result.success) {

      currentUser = {
        firstName,
        lastName,
        email,
        whatsapp,
        normalizedWhatsapp: cleanNumber(whatsapp),
        regStat: false
      };

      userRegistered = true;
      sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

      msgBox.style.fontSize = "20px";
      msgBox.style.color = "#c59b5a";
      msgBox.innerHTML = `
        Welcome to the Collective ${firstName}.  
        Your registration is pending approval.  
        You will be notified shortly.
      `;

      document.getElementById("extraFields").style.display = "none";

      // ❌ REMOVE THIS LINE
      // renderClasses();

      // ✅ Explicitly keep class toggles locked
      document.querySelectorAll(".class-toggle").forEach(toggle => {
        toggle.checked = false;
        toggle.disabled = true;
        toggle.classList.add("locked");
      });

    } else {
      msgBox.textContent = `Error: ${result.message || "Unknown error"}`;
      msgBox.style.color = "red";
    }

  } catch (err) {
    console.error("Registration failed:", err);
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
      .filter(r => isRegistrationForClass(r, cls))
      .filter(r => r.status === "confirmed")
      .map(r => ({ fullName: r.fullName, normalizedWhatsapp: (r.normalizedWhatsapp || cleanNumber(r.whatsapp || "")) }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    const standbyParticipants = registrationsData
      .filter(r => isRegistrationForClass(r, cls))
      .filter(r => r.status === "standby")
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
      standbyTitle.style.fontSize = "18px";
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
    const remaining = (Number(cls.capacity) || 0) - participants.length;
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
        if (!isRegistrationForClass(r, cls)) return false;
        const rNorm = cleanNumber(r.normalizedWhatsapp || r.whatsapp || "");
        const rRaw = cleanNumber(r.whatsapp || "");
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
          !(isRegistrationForClass(r, cls) && ((cleanNumber(r.normalizedWhatsapp) && cleanNumber(r.normalizedWhatsapp) === currentUser.normalizedWhatsapp) || (cleanNumber(r.whatsapp) && cleanNumber(r.whatsapp) === currentUser.normalizedWhatsapp)))
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
            registrationsData = registrationsData.filter(r => !isRegistrationForClass(r, cls));
            // ensure normalizedWhatsapp exists on each
            resp.updatedRegistrations.forEach(r => {
              registrationsData.push({
                ...r,
                normalizedWhatsapp: cleanNumber(r.normalizedWhatsapp || r.whatsapp || "")
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
          registrationsData = registrationsData.filter(r => !(isRegistrationForClass(r, cls) && cleanNumber(r.normalizedWhatsapp) === currentUser.normalizedWhatsapp));
          toggle.classList.remove("active");
          toggle.style.border = "";
        } else {
          // we tried to remove; re-add entry (can't rebuild full object here, force re-render to reflect server)
          const reloadRegs = await fetch(`${API_BASE}?type=registrations`).then(r => r.json());
          registrationsData = Array.isArray(reloadRegs) ? reloadRegs.map(rr => ({ ...rr, normalizedWhatsapp: cleanNumber(rr.normalizedWhatsapp || rr.whatsapp || '') })) : [];
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

// helper: determine whether a registration row belongs to a given class object
function isRegistrationForClass(reg, cls) {
  if (!reg || !cls) return false;
  const regClassId = String(reg.classId || '');
  if (regClassId === String(cls.id)) return true;
  // if regClassId parses as a date, try to convert to classId format
  const maybeDate = new Date(regClassId);
  if (!Number.isNaN(maybeDate.getTime())) {
    const converted = formatClassIdFromDate(maybeDate);
    if (converted && converted === String(cls.id)) return true;
  }
  return false;
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

document.addEventListener("DOMContentLoaded", () => {
  renderRegistrationForm();   // ✅ shows WHATSAPP FIELD IMMEDIATELY
  init();                     // ✅ classes load after in background
});



// Auto-logout when tab or browser is closed
window.addEventListener("beforeunload", () => {
  sessionStorage.removeItem("rc_currentUser");
});

// Luxury Spa Parallax Effect
window.addEventListener('scroll', () => {
  const banner = document.querySelector('.hero-banner');
  if (!banner) return;
  const offset = window.scrollY * 0.25;
  banner.style.setProperty('--parallax-offset', offset + 'px');
});


// https://script.google.com/macros/s/AKfycbyjtbmTmw-CGVuLO2jscrukZHdumWt7oPlxLK8PY39YrHjfppuB3QU-DlHr97iJmDq1/exec
