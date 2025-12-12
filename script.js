// ---------- config ----------
const API_BASE = "";
const API_KEY = ""; 
// replace with your secret
const ADMIN_WHATSAPP = "1925196419"; // admin WhatsApp
const ADMIN_WHATSAPP_NORM = cleanNumber(ADMIN_WHATSAPP);

// Default: block copy/paste for everyone
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("copy-protect");
});

// Keep track of listeners
let copyBlockListeners = [];

function enableCopyProtection(userNumber = null) {
  // Use currentUser if userNumber not provided
  const normalized = cleanNumber(userNumber || (currentUser ? currentUser.normalizedWhatsapp : ""));
  console.log("DEBUG â€” checking admin bypass:", { userNumber, normalized, ADMIN_WHATSAPP_NORM });

  // ADMIN BYPASS
  if (normalized && normalized === ADMIN_WHATSAPP_NORM) {
    console.log("DEBUG â€” ADMIN detected, disabling copy protection");
    disableAllCopyProtectionJS();
    document.body.classList.remove("copy-protect");
    document.body.classList.add("copy-allowed");
    return;
  }

  document.body.classList.remove("copy-allowed");
  document.body.classList.add("copy-protect");

  const add = (event, handler) => {
    document.addEventListener(event, handler);
    copyBlockListeners.push({ event, handler });
  };

  add('contextmenu', e => e.preventDefault());
  add('selectstart', e => e.preventDefault());
  add('copy', e => e.preventDefault());
  add('cut', e => e.preventDefault());
  add('paste', e => e.preventDefault());
  add('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['c','x','v','a'].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "PrintScreen") e.preventDefault();
  });

  document.documentElement.style.webkitUserSelect = "none";
  document.documentElement.style.webkitTouchCallout = "none";
  document.body.style.userSelect = "none";
}



function disableAllCopyProtectionJS() {
  for (const { event, handler } of copyBlockListeners) {
    document.removeEventListener(event, handler);
  }
  copyBlockListeners = [];
  document.documentElement.style.webkitUserSelect = "";
  document.documentElement.style.webkitTouchCallout = "";
  document.body.style.userSelect = "";
}

// --------------------
let classesData = [];
let registrationsData = [];
let currentUser = null;
let userRegistered = false;

// Service Worker cleanup
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (let reg of regs) reg.unregister();
  });
}

// --------------------
// Helpers
// --------------------
function normalizeWhatsapp(raw) {
  if (!raw) return { normalized: "", fallback: "" };
  let digits = String(raw).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  const normalized = digits;
  const fallback = digits.length >= 10 ? digits.slice(-10) : digits;
  return { normalized, fallback };
}

function cleanNumber(v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\D/g, "");
}

function formatClassIdFromDate(d) {
  try {
    const date = (d instanceof Date) ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = String(date.getDate()).padStart(2, '0');
    const yr = String(date.getFullYear()).slice(-2);
    return `${month}${day}${yr}`;
  } catch (e) { return ""; }
}

function showToast(msg, isError = false) {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    Object.assign(box.style, {
      position: "fixed",
      left: "50%",
      top: "20px",
      transform: "translateX(-50%)",
      padding: "10px 18px",
      borderRadius: "8px",
      zIndex: 9999,
      fontWeight: "700"
    });
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
  try {
    const cached = sessionStorage.getItem("rc_currentUser");
    if (cached && cached !== "null" && cached !== "") {
      currentUser = JSON.parse(cached);
      if (currentUser) {
        currentUser.normalizedWhatsapp = cleanNumber(currentUser.normalizedWhatsapp || currentUser.whatsapp || "");
        userRegistered = true;

        // âœ… Check admin copy/paste bypass on cached user
        if (currentUser.normalizedWhatsapp === ADMIN_WHATSAPP_NORM) {
          disableAllCopyProtectionJS();
          document.body.classList.remove("copy-protect");
          document.body.classList.add("copy-allowed");
        } else {
          enableCopyProtection(currentUser.normalizedWhatsapp);
        }
      }
    } else {
      enableCopyProtection(null);
    }
  } catch (e) { enableCopyProtection(null); }

  try {
    const [classesResp, regsResp] = await Promise.all([
      fetch(`${API_BASE}?type=classes&apiKey=${API_KEY}`),
      fetch(`${API_BASE}?type=registrations&apiKey=${API_KEY}`)
    ]);

    const classesJson = await classesResp.json();
    const regsJson = await regsResp.json();

    classesData = Array.isArray(classesJson) ? classesJson : [];
    registrationsData = Array.isArray(regsJson) ? regsJson : [];

    normalizeFetchedData();
    renderClasses();
  } catch (err) {
    console.error('Initialization failed:', err);
    showToast('Error loading data. Try reloading.', true);
  }
}

function normalizeFetchedData() {
  registrationsData = registrationsData.map(r => ({
    ...r,
    classId: String(r.classId || ''),
    whatsapp: String(r.whatsapp || ''),
    normalizedWhatsapp: cleanNumber(r.normalizedWhatsapp || r.whatsapp || '')
  }));

  classesData = classesData.map(c => ({
    ...c,
    id: String(c.id || ''),
    capacity: Number(c.capacity || 0)
  }));

  if (currentUser) {
    currentUser.normalizedWhatsapp = cleanNumber(currentUser.normalizedWhatsapp || currentUser.whatsapp || '');
  }
  ensureFooterImage();
  revealHealerNamesIfApproved();
}

// --------------------
// revealHealerNamesIfApproved fix
// --------------------
function revealHealerNamesIfApproved() {
  if (!currentUser) return;
  const isApproved = currentUser.regStat === true || String(currentUser.regStat).toLowerCase() === "true";

  document.querySelectorAll(".healer-name").forEach(span => {
    if (isApproved) {
      span.classList.remove("locked");
      span.classList.add("revealed");
    } else {
      span.classList.add("locked");
      span.classList.remove("revealed");
    }
  });
}

// --------------------
// The rest of your script continues unchanged
// Include registration form rendering, password field, class rendering, etc.
// Make sure anywhere currentUser is set, you also call enableCopyProtection() or admin bypass as above


// --------------------
// Registration Form
// --------------------
function renderRegistrationForm() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div style="max-width:400px;margin:20px auto;text-align:center;">
      <input id="regWhatsApp" type="tel" inputmode="numeric" placeholder="Enter your WhatsApp number"
             style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
      <button id="whatsappSubmit" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#fff; border:none; border-radius:8px; cursor:pointer;">Submit</button>
      <div id="regMessage" style="margin-top:10px; font-weight:bold;"></div>
      <div id="extraFields" style="margin-top:12px; display:none;">
        <input id="regFirstName" type="text" placeholder="First Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regLastName" type="text" placeholder="Last Name" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <input id="regEmail" type="email" placeholder="Email" style="width:100%; padding:12px; font-size:18px; margin-bottom:12px; border:2px solid #c59b5a; border-radius:8px;">
        <button id="fullRegister" style="width:100%; padding:12px; font-weight:bold; background:#c59b5a; color:#fff; border:none; border-radius:8px; cursor:pointer;">Register</button>
      </div>
    </div>
  `;

  document.getElementById("whatsappSubmit").addEventListener("click", handleWhatsAppSubmit);
  document.getElementById("fullRegister")?.addEventListener("click", handleFullRegistration);
}

// --------------------
// PASSWORD HELPERS
// --------------------
function renderPasswordField(placeholderText, onSubmit) {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="pwd-wrapper" style="position:relative; max-width:400px; margin:20px auto; height:48px;">
      <!-- hidden username for iOS password manager -->
      <input type="hidden" name="username" value="${currentUser?.whatsapp || currentUser?.normalizedWhatsapp || ''}">
      
      <input id="pwdField" type="password" placeholder="${placeholderText}"
             autocomplete="${currentUser && currentUser.password ? 'current-password' : 'new-password'}"
             style="
               width:100%;
               height:100%;
               font-size:18px;
               padding:12px 44px 12px 12px; /* right padding increased to make room for monkey */
               border:2px solid #c59b5a;
               border-radius:8px;
               box-sizing:border-box;
               line-height:1.2;
             ">
      <span id="togglePwd" 
            style="
              position:absolute;
              right:30px; /* move slightly left from edge */
              top:60%;
              transform:translateY(-50%);
              cursor:pointer;
              font-size:20px;
              color:#c59b5a;
              user-select:none;
            ">ðŸ™ˆ</span>
    </div>
    <button id="pwdSubmit" 
            style="width:100%; padding:12px; margin-top:10px; font-weight:bold; background:#c59b5a; color:#fff; border:none; border-radius:8px; cursor:pointer;">Submit</button>
    <div id="regMessage" style="margin-top:10px; font-weight:bold;"></div>
  `;

  const pwdField = document.getElementById("pwdField");
  const toggle = document.getElementById("togglePwd");

  toggle.addEventListener("click", () => {
    if (pwdField.type === "password") {
      pwdField.type = "text";
      toggle.textContent = "ðŸ™Š"; // password visible
    } else {
      pwdField.type = "password";
      toggle.textContent = "ðŸ™ˆ"; // password hidden
    }
  });

  document.getElementById("pwdSubmit").addEventListener("click", () => {
    const pwd = pwdField.value.trim();
    onSubmit(pwd);
  });
}








function renderWelcomeMessage() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper || !currentUser) return;

  wrapper.innerHTML = `
    <div style="text-align:center;font-size:30px;color:#c59b5a;">
      âœ¦ WELCOME ${currentUser.firstName.toUpperCase()} âœ¦
    </div>
    <div style="font-size:18px;color:#ffffff;">
      PLEASE SELECT THE HEALING SESSIONS YOU FEEL CALLED TO SHARE YOUR REIKI PRESENCE WITH
    </div>
  `;

  renderClasses();
}

// --------------------
// Handle WhatsApp submit
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

    const usersResponse = await fetch(`${API_BASE}?type=users&apiKey=${API_KEY}`);
    const users = usersResponse.ok ? await usersResponse.json() : [];

    if (!Array.isArray(users)) throw new Error('Users API did not return array');

    const normUsers = users.map(u => ({
  ...u,
  whatsapp: String(u.whatsapp || ''),
  normalizedWhatsapp: cleanNumber(u.normalizedWhatsapp || u.whatsapp),
  password: u.password !== undefined && u.password !== null ? String(u.password) : ""
}));


    const user = normUsers.find(u => {
      const uNorm = u.normalizedWhatsapp;
      const uRaw = cleanNumber(u.whatsapp);
      return (uNorm === normalized || uRaw === normalized || uRaw === fallback);
    });

    if (user) {
      user.normalizedWhatsapp = cleanNumber(user.normalizedWhatsapp || user.whatsapp || "");
      currentUser = user;
      userRegistered = true;
      sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

      const regApproved = (user.regStat === true || String(user.regStat).toLowerCase() === "true");

      if (regApproved) {
        // PASSWORD LOGIC
        if (!user.password || user.password === "") {
          renderPasswordField("Please create a password", async (pwd) => {
            if (!pwd) return;
            try {
              const res = await fetch(API_BASE, {
                method: "POST",
                body: new URLSearchParams({
                  action: "setPassword",
                  normalizedWhatsapp: currentUser.normalizedWhatsapp,
                  password: pwd,
                  apiKey: API_KEY
                })
              });

              if (!res.ok) throw new Error("Network error");

              // fallback if server doesn't return proper JSON
              await res.json().catch(() => ({}));

              currentUser.password = pwd;
              currentUser.regStat = true;  // mark as approved
              userRegistered = true;
              sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

              renderWelcomeMessage();
              renderClasses();
              showToast("Password saved successfully!");

            } catch (err) {
              console.error(err);
              showToast("Password may have been saved, but an error occurred.", true);
            }
          });
        } else {
          // returning user
renderPasswordField("Enter your password", (pwd) => {
  if (pwd === currentUser.password) {
    currentUser.regStat = true;
    userRegistered = true;
    sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

    // âœ… Enable copy protection (or ADMIN bypass) AFTER user is set
    enableCopyProtection();  // no argument â€” uses currentUser internally

    renderWelcomeMessage();
    renderClasses();
    showToast("Welcome back!");
  } else {
    showToast("Incorrect password. Please try again.", true);
  }
});

        }
      } else {
        msgBox.innerHTML = `
          <div style="text-align:center;font-size:28px;color:#c59b5a;">
            âœ¦ WELCOME ${user.firstName.toUpperCase()} âœ¦
          </div>
          <div style="font-size:17px;color:#7FFF00;">
            SORRY! WE ARE HAVING DIFFICULTIES LOGGING YOU IN AT THE MOMENT, ADMIN HAS BEEN NOTIFIED
          </div>
        `;
        userRegistered = false;
        renderClasses();
      }

    } else {
      // Not found -> show register fields
      document.getElementById("extraFields").style.display = "block";
      msgBox.style.fontSize = "26px";
      msgBox.style.color = "#ffffff";
      msgBox.textContent = "Please complete your registration.";
      enableCopyProtection(null);
    }

    whatsappInput.style.display = "none";
    submitBtn.style.display = "none";

  } catch (err) {
    console.error("WhatsApp submit error:", err);
    msgBox.textContent = "Error contacting server.";
    msgBox.style.color = "red";
    whatsappInput.disabled = false;
    submitBtn.disabled = false;
  }
}

// --------------------
// Handle full registration
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
        normalizedWhatsapp: whatsapp,
        apiKey: API_KEY
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
// Format class time for display
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
    locElem.textContent = `${cls.location} â€“ ${participants.length} healer${participants.length !== 1 ? "s" : ""}`;
    const dateElem = document.createElement("div");
    dateElem.className = "class-date";
    dateElem.textContent = formatClassTime(cls.date, cls.time);

    div.appendChild(locElem);
    div.appendChild(dateElem);

    // Participants list
    const ul = document.createElement("ul");

    
  /*  participants.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.fullName;
      ul.appendChild(li);
    }); */

    participants.forEach(p => {
  const li = document.createElement("li");

  // create a span for the healer name so we can blur/reveal it
  const nameSpan = document.createElement("span");
  nameSpan.className = "healer-name";

  // Determine if the name should be locked:
  // - if no userRegistered (guest) -> lock
  // - if userRegistered but currentUser.regStat explicitly false -> lock
  // - else reveal
  const isApproved = (currentUser && (currentUser.regStat === true || String(currentUser.regStat).toLowerCase() === "true"));

  if (!isApproved) {
    nameSpan.classList.add("locked");
  } else {
    nameSpan.classList.add("revealed");
  }

  // âœ… Highlight current user in gold
  if (currentUser && p.normalizedWhatsapp === currentUser.normalizedWhatsapp) {
    // nameSpan.style.color = "#FFD700"; // gold color
    nameSpan.style.color = "#c59b5a"; // gold color
    nameSpan.style.fontWeight = "900"; // optional: make bold
  }    


      
  nameSpan.textContent = p.fullName || "";
  li.appendChild(nameSpan);
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
    const span = document.createElement("span");
    span.className = "healer-name";

    const isApproved = (currentUser && (currentUser.regStat === true || String(currentUser.regStat).toLowerCase() === "true"));

    if (!isApproved) {
      span.classList.add("locked");
    } else {
      span.classList.add("revealed");
    }

    // âœ… Highlight current user in gold
  if (currentUser && p.normalizedWhatsapp === currentUser.normalizedWhatsapp) {
    // span.style.color = "#FFD700"; // gold color
    span.style.color = "#c59b5a"; // gold color
    span.style.fontWeight = "900"; // optional: make bold
  }    


    
    span.textContent = p.fullName || "";
    li.appendChild(span);
    standbyUl.appendChild(li);
  });

  div.appendChild(standbyTitle);
  div.appendChild(standbyUl);
}


    // Remaining / toggle
    const remaining = (Number(cls.capacity) || 0) - participants.length;
    const wrapper = document.createElement("div");
    wrapper.className = "spaces-toggle-wrapper";

   // const remainText = document.createElement("span");
   // remainText.textContent = remaining > 0 ? `â†’ ${remaining} spaces remaining` : "CLASS FULL â€“ JOIN STANDBY";

    const remainText = document.createElement("span");
    remainText.textContent = remaining > 0 
    ? `â†’ ${remaining} space${remaining === 1 ? '' : 's'} remaining` 
    : "CLASS FULL â€“ JOIN STANDBY";





    
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
        showToast("Booking update failed â€” please try again.", true);
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

  // âœ… REVEAL HEALER NAMES AFTER ALL HTML HAS BEEN RENDERED
  revealHealerNamesIfApproved();

    // after rendering classes
  ensureFooterImage();




  
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
    timestamp: new Date().toISOString(),
    apiKey: API_KEY  // âœ… add this line
  };

  const resp = await fetch(API_BASE, {
    method: "POST",
    body: new URLSearchParams(payload),
    apiKey: API_KEY
  });

  if (!resp.ok) throw new Error("Network error");
  const json = await resp.json();
  return json;
}

document.addEventListener("DOMContentLoaded", () => {
  renderRegistrationForm();   // âœ… shows WHATSAPP FIELD IMMEDIATELY
  init();                     // âœ… classes load after in background
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


// --------------------
// Footer seed image (JS-inserted responsive)
// --------------------
function ensureFooterImage() {
  // remove any old instance
  const old = document.querySelector(".footer-image-wrapper");
  if (old) old.remove();

  const container = document.getElementById("classes") || document.body;
  // wrapper sits right after the class cards container
  const wrapper = document.createElement("div");
  wrapper.className = "footer-image-wrapper";
  // inline styles on wrapper to avoid CSS conflicts
  Object.assign(wrapper.style, {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    padding: "0px 0px",      // breathing room
    boxSizing: "border-box",
    marginTop: "-20px"
  });

  const img = document.createElement("img");
  img.src = "https://chiroyoga.ca/wp-content/uploads/2025/11/seed-2.jpg";
  img.alt = "Seed of Life â€” Gold";
  img.className = "seed-of-life-footer";

  // base styles (mobile-first)
  Object.assign(img.style, {
    display: "block",
    width: "100%",         // mobile default
    maxWidth: "420px",     // prevents oversized image on phones
    height: "auto",
    objectFit: "contain",
    margin: "0 auto"
  });

  wrapper.appendChild(img);

  // append after classes container so it appears after last class card
  if (container && container.parentNode) {
    // insert after container
    container.parentNode.insertBefore(wrapper, container.nextSibling);
  } else {
    document.body.appendChild(wrapper);
  }

  // adjust sizing for desktop vs mobile on load and resize
  function adjustFooterSizing() {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

    if (vw >= 1100) {
      // Desktop: center and shrink to ~30% visual
      img.style.width = "30%";
      img.style.maxWidth = "760px";
    } else if (vw >= 768) {
      // Tablet / small desktop
      img.style.width = "40%";
      img.style.maxWidth = "720px";
    } else {
      // Mobile
      img.style.width = "100%";
      img.style.maxWidth = "420px";
    }

    // ensure wrapper doesn't cause horizontal overflow
    wrapper.style.width = "100%";
    wrapper.style.overflow = "hidden";
  }

  // run initially
  adjustFooterSizing();

  // debounce resize
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      adjustFooterSizing();
    }, 120);
  }, { passive: true });
}



