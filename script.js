// ========================
// SECTION 1/3
// CONFIG + COPY PROTECTION + HELPERS + GLOBALS + INIT + REGISTRATION FORM
// ========================

// ------------------------
// CONFIG
// ------------------------
const API_PROXY = "https://reikihealers.chiroyoga.ca/api-proxy.php";
const ADMIN_WHATSAPP = "1925196419";
const ADMIN_WHATSAPP_NORM = cleanNumber(ADMIN_WHATSAPP);

// ------------------------
// COPY / PASTE PROTECTION
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("copy-protect");
});

let copyBlockListeners = [];

function enableCopyProtection(userNumber = null) {
  const normalized = cleanNumber(userNumber || (currentUser ? currentUser.normalizedWhatsapp : ""));
  if (normalized && normalized === ADMIN_WHATSAPP_NORM) {
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

// ------------------------
// GLOBAL VARIABLES
// ------------------------
let classesData = [];
let registrationsData = [];
let currentUser = null;
let userRegistered = false;

// Service worker cleanup
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (let reg of regs) reg.unregister();
  });
}

// ------------------------
// HELPERS
// ------------------------
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

// ------------------------
// SECURE API CALL
// ------------------------
async function apiCall(action, data = {}) {
  const resp = await fetch(API_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data })
  });

  if (!resp.ok) throw new Error(`Network error ${resp.status}`);
  const json = await resp.json();
  if (!json.success) throw new Error(json.error || "Unknown API error");
  return json.data;
}

// ------------------------
// DATA NORMALIZATION
// ------------------------
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

// ------------------------
// INITIALIZATION
// ------------------------
async function init() {
  try {
    const cached = sessionStorage.getItem("rc_currentUser");
    if (cached && cached !== "null" && cached !== "") {
      currentUser = JSON.parse(cached);
      if (currentUser) {
        currentUser.normalizedWhatsapp = cleanNumber(currentUser.normalizedWhatsapp || currentUser.whatsapp || "");
        userRegistered = true;
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
    const [classesDataResp, registrationsDataResp] = await Promise.all([
      apiCall("readClasses"),
      apiCall("readRegistrations")
    ]);

    classesData = Array.isArray(classesDataResp) ? classesDataResp : [];
    registrationsData = Array.isArray(registrationsDataResp) ? registrationsDataResp : [];

    normalizeFetchedData();
    renderClasses();
  } catch (err) {
    console.error('Initialization failed:', err);
    showToast('Error loading data. Try reloading.', true);
  }
}

// ------------------------
// REGISTRATION FORM
// ------------------------
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



// ========================
// SECTION 2/3
// PASSWORD, WHATSAPP SUBMIT, FULL REGISTRATION, HELPER LOGIC
// ========================

// ------------------------
// PASSWORD FIELD RENDERING
// ------------------------
function renderPasswordField(placeholderText, onSubmit) {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="pwd-wrapper" style="position:relative; max-width:400px; margin:20px auto; height:48px;">
      <input type="hidden" name="username" value="${currentUser?.whatsapp || currentUser?.normalizedWhatsapp || ''}">
      <input id="pwdField" type="password" placeholder="${placeholderText}"
             autocomplete="${currentUser && currentUser.password ? 'current-password' : 'new-password'}"
             style="width:100%; height:100%; font-size:18px; padding:12px 44px 12px 12px; border:2px solid #c59b5a; border-radius:8px; box-sizing:border-box; line-height:1.2;">
      <span id="togglePwd" 
            style="position:absolute; right:30px; top:60%; transform:translateY(-50%); cursor:pointer; font-size:20px; color:#c59b5a; user-select:none;">🙈</span>
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
      toggle.textContent = "🙊";
    } else {
      pwdField.type = "password";
      toggle.textContent = "🙈";
    }
  });

  document.getElementById("pwdSubmit").addEventListener("click", () => {
    const pwd = pwdField.value.trim();
    onSubmit(pwd);
  });
}

// ------------------------
// WELCOME MESSAGE
// ------------------------
function renderWelcomeMessage() {
  const wrapper = document.getElementById("registration-section");
  if (!wrapper || !currentUser) return;

  wrapper.innerHTML = `
    <div style="text-align:center;font-size:30px;color:#c59b5a;">
      ✦ WELCOME ${currentUser.firstName.toUpperCase()} ✦
    </div>
    <div style="font-size:18px;color:#ffffff;">
      PLEASE SELECT THE HEALING SESSIONS YOU FEEL CALLED TO SHARE YOUR REIKI PRESENCE WITH
    </div>
  `;

  renderClasses();
}

// ------------------------
// HANDLE WHATSAPP SUBMIT
// ------------------------
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

    const users = await apiCall("readUsers");

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
        if (!user.password || user.password === "") {
          renderPasswordField("Please create a password", async (pwd) => {
            if (!pwd) return;
            try {
              await apiCall("setPassword", { normalizedWhatsapp: currentUser.normalizedWhatsapp, password: pwd });
              currentUser.password = pwd;
              currentUser.regStat = true;
              userRegistered = true;
              sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

              renderWelcomeMessage();
              showToast("Password saved successfully!");
            } catch (err) {
              console.error(err);
              showToast("Password may have been saved, but an error occurred.", true);
            }
          });
        } else {
          renderPasswordField("Enter your password", (pwd) => {
            if (pwd === currentUser.password) {
              currentUser.regStat = true;
              userRegistered = true;
              sessionStorage.setItem("rc_currentUser", JSON.stringify(currentUser));

              enableCopyProtection();
              renderWelcomeMessage();
              showToast("Welcome back!");
            } else {
              showToast("Incorrect password. Please try again.", true);
            }
          });
        }
      } else {
        msgBox.innerHTML = `
          <div style="text-align:center;font-size:28px;color:#c59b5a;">
            ✦ WELCOME ${user.firstName.toUpperCase()} ✦
          </div>
          <div style="font-size:17px;color:#7FFF00;">
            SORRY! WE ARE HAVING DIFFICULTIES LOGGING YOU IN AT THE MOMENT, ADMIN HAS BEEN NOTIFIED
          </div>
        `;
        userRegistered = false;
        renderClasses();
      }

    } else {
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

// ------------------------
// HANDLE FULL REGISTRATION
// ------------------------
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
    const result = await apiCall("createUser", { firstName, lastName, email, whatsapp, normalizedWhatsapp: whatsapp });

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

// ------------------------
// HELPER: FORMAT CLASS TIME
// ------------------------
function formatClassTime(dateStr, timeStr) {
  return `${dateStr || ""} @ ${timeStr || ""}`;
}

// ------------------------
// HELPER: IS REGISTRATION FOR CLASS
// ------------------------
function isRegistrationForClass(reg, cls) {
  if (!reg || !cls) return false;
  const regClassId = String(reg.classId || '');
  if (regClassId === String(cls.id)) return true;
  const maybeDate = new Date(regClassId);
  if (!Number.isNaN(maybeDate.getTime())) {
    const converted = formatClassIdFromDate(maybeDate);
    if (converted && converted === String(cls.id)) return true;
  }
  return false;
}





// ========================
// SECTION 3/3
// CLASS RENDERING, TOGGLE BOOKING, FOOTER, PARALLAX, AUTO-LOGOUT
// ========================

// ------------------------
// RENDER CLASSES
// ------------------------
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

    // Participants
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
      const nameSpan = document.createElement("span");
      nameSpan.className = "healer-name";

      const isApproved = (currentUser && (currentUser.regStat === true || String(currentUser.regStat).toLowerCase() === "true"));
      if (!isApproved) nameSpan.classList.add("locked");
      else nameSpan.classList.add("revealed");

      if (currentUser && p.normalizedWhatsapp === currentUser.normalizedWhatsapp) {
        nameSpan.style.color = "#c59b5a";
        nameSpan.style.fontWeight = "900";
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
        if (!isApproved) span.classList.add("locked");
        else span.classList.add("revealed");

        if (currentUser && p.normalizedWhatsapp === currentUser.normalizedWhatsapp) {
          span.style.color = "#c59b5a";
          span.style.fontWeight = "900";
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

    const remainText = document.createElement("span");
    remainText.textContent = remaining > 0 ? `→ ${remaining} space${remaining === 1 ? '' : 's'} remaining` : "CLASS FULL – JOIN STANDBY";

    const toggle = document.createElement("div");
    toggle.className = "lux-toggle";
    toggle.dataset.classId = cls.id;

    if (!userRegistered) {
      toggle.style.pointerEvents = "none";
      toggle.title = "Please sign in to book";
    } else toggle.style.pointerEvents = "auto";

    if (currentUser && currentUser.normalizedWhatsapp) {
      const isEnrolled = registrationsData.some(r => {
        if (!isRegistrationForClass(r, cls)) return false;
        const rNorm = cleanNumber(r.normalizedWhatsapp || r.whatsapp || "");
        return rNorm === currentUser.normalizedWhatsapp;
      });
      if (isEnrolled) {
        toggle.classList.add("active");
        toggle.style.border = "2px solid #ffd78c";
      } else toggle.classList.remove("active");
    }

    // Toggle click handler
    toggle.addEventListener("click", async () => {
      if (!userRegistered) return;
      const isActive = toggle.classList.contains("active");
      if (toggle.dataset.inflight === "1") return;
      toggle.dataset.inflight = "1";

      toggle.classList.toggle("active");
      if (!isActive) toggle.style.border = "2px solid #ffd78c";
      else toggle.style.border = "";

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
          !(isRegistrationForClass(r, cls) && cleanNumber(r.normalizedWhatsapp || r.whatsapp || "") === currentUser.normalizedWhatsapp)
        );
      }

      try {
        const resp = await submitSingleClass(cls.id, !isActive ? (remaining > 0 ? "confirmed" : "standby") : "remove");
        if (resp && resp.success && Array.isArray(resp.updatedRegistrations)) {
          registrationsData = registrationsData.filter(r => !isRegistrationForClass(r, cls));
          resp.updatedRegistrations.forEach(r => {
            registrationsData.push({ ...r, normalizedWhatsapp: cleanNumber(r.normalizedWhatsapp || r.whatsapp || "") });
          });
        }
        renderClasses();
      } catch (err) {
        console.error("Booking update failed:", err);
        showToast("Booking update failed — please try again.", true);
        if (!isActive) registrationsData = registrationsData.filter(r => !(isRegistrationForClass(r, cls) && cleanNumber(r.normalizedWhatsapp) === currentUser.normalizedWhatsapp));
        renderClasses();
      } finally {
        toggle.dataset.inflight = "0";
      }
    });

    wrapper.appendChild(remainText);
    wrapper.appendChild(toggle);
    div.appendChild(wrapper);
    container.appendChild(div);

    setTimeout(() => {
      div.style.opacity = "1";
      div.style.transform = "translateY(0)";
    }, i * 150);
  });

  revealHealerNamesIfApproved();
  ensureFooterImage();
}

// ------------------------
// SUBMIT SINGLE CLASS
// ------------------------
async function submitSingleClass(classId, status) {
  if (!currentUser) throw new Error("No current user");
  const payload = {
    action: "updateRegistration",
    classId,
    status,
    email: currentUser.email || "",
    fullName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
    whatsapp: currentUser.whatsapp || currentUser.normalizedWhatsapp || "",
    normalizedWhatsapp: currentUser.normalizedWhatsapp,
    timestamp: new Date().toISOString()
  };
  const resp = await apiCall("updateRegistration", payload);
  return resp;
}

// ------------------------
// FOOTER IMAGE
// ------------------------
function ensureFooterImage() {
  const old = document.querySelector(".footer-image-wrapper");
  if (old) old.remove();

  const container = document.getElementById("classes") || document.body;
  const wrapper = document.createElement("div");
  wrapper.className = "footer-image-wrapper";
  Object.assign(wrapper.style, { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", padding: "0px 0px", boxSizing: "border-box", marginTop: "-20px" });

  const img = document.createElement("img");
  img.src = "https://chiroyoga.ca/wp-content/uploads/2025/11/seed-2.jpg";
  img.alt = "Seed of Life — Gold";
  img.className = "seed-of-life-footer";
  Object.assign(img.style, { display: "block", width: "100%", maxWidth: "420px", height: "auto", objectFit: "contain", margin: "0 auto" });

  wrapper.appendChild(img);
  if (container && container.parentNode) container.parentNode.insertBefore(wrapper, container.nextSibling);
  else document.body.appendChild(wrapper);

  function adjustFooterSizing() {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    if (vw >= 1100) { img.style.width = "30%"; img.style.maxWidth = "760px"; }
    else if (vw >= 768) { img.style.width = "40%"; img.style.maxWidth = "720px"; }
    else { img.style.width = "100%"; img.style.maxWidth = "420px"; }
    wrapper.style.width = "100%";
    wrapper.style.overflow = "hidden";
  }

  adjustFooterSizing();
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(adjustFooterSizing, 120);
  }, { passive: true });
}

// ------------------------
// PARALLAX EFFECT
// ------------------------
window.addEventListener('scroll', () => {
  const banner = document.querySelector('.hero-banner');
  if (!banner) return;
  const offset = window.scrollY * 0.25;
  banner.style.setProperty('--parallax-offset', offset + 'px');
});

// ------------------------
// AUTO-LOGOUT ON TAB CLOSE
// ------------------------
window.addEventListener("beforeunload", () => {
  sessionStorage.removeItem("rc_currentUser");
});

