const API_URL =
  "https://kemp-scanner-proxy.dmg1784.workers.dev";

let STAFF = null;

try {

  STAFF =
    JSON.parse(
      localStorage.getItem("staff")
    );

}
catch {

  STAFF = null;

}

const DEVICE_NAME =
  navigator.userAgent;

let scanner = null;
let scannerRunning = false;
let lastScan = "";

// =========================
// ELEMENTS
// =========================

const loginCard =
  document.getElementById("loginCard");

const scannerSection =
  document.getElementById("scannerSection");

const staffIdInput =
  document.getElementById("staffId");

const staffPinInput =
  document.getElementById("staffPin");

const loginBtn =
  document.getElementById("loginBtn");

const changeStaffBtn =
  document.getElementById("changeStaffBtn");

const currentStaff =
  document.getElementById("currentStaff");

const status =
  document.getElementById("status");

const result =
  document.getElementById("result");

const startBtn =
  document.getElementById("startBtn");

const stopBtn =
  document.getElementById("stopBtn");

// =========================
// INIT
// =========================

init();

function init() {

  if (STAFF) {

    showScanner();

  }
  else {

    loginCard.style.display =
      "block";

    scannerSection.style.display =
      "none";

  }

}

function showScanner() {

  loginCard.style.display =
    "none";

  scannerSection.style.display =
    "block";

  currentStaff.innerHTML =
    "👤 " +
    STAFF.name +
    "<br><small>" +
    STAFF.role +
    "</small>";

}

// =========================
// LOGIN
// =========================

loginBtn.addEventListener(
  "click",
  async () => {

    const staffId =
      staffIdInput.value.trim();

    const pin =
      staffPinInput.value.trim();

    if (!staffId || !pin) {

      alert(
        "Please enter Staff ID and PIN."
      );

      return;

    }

    loginBtn.disabled = true;

    loginBtn.innerHTML =
      "Logging in...";

    try {

      const response =
        await fetch(

          API_URL +

          "?action=login" +

          "&staffId=" +

          encodeURIComponent(
            staffId
          ) +

          "&pin=" +

          encodeURIComponent(
            pin
          ),

          {
            method: "GET",
            cache: "no-store"
          }

        );

      const data =
        await response.json();

      if (!data.success) {

        alert(
          data.message ||
          "Login Failed"
        );

        return;

      }

      STAFF =
        data.staff;

      localStorage.setItem(

        "staff",

        JSON.stringify(
          STAFF
        )

      );

      showScanner();

    }
    catch (err) {

      console.error(err);

      alert(
        err.message ||
        err.toString()
      );

    }
    finally {

      loginBtn.disabled = false;

      loginBtn.innerHTML =
        "Login";

    }

  }

);

changeStaffBtn.addEventListener(

  "click",

  async () => {

    if (scannerRunning) {

      await stopScanner();

    }

    localStorage.removeItem(
      "staff"
    );

    location.reload();

  }

);

// =========================
// EVENTS
// =========================

startBtn.addEventListener(
  "click",
  startScanner
);

stopBtn.addEventListener(
  "click",
  stopScanner
);

window.addEventListener(
  "online",
  updateConnectionStatus
);

window.addEventListener(
  "offline",
  updateConnectionStatus
);

updateConnectionStatus();
// =========================
// STATUS
// =========================

function updateConnectionStatus() {

  if (navigator.onLine) {

    status.innerHTML =
      "🟢 Online";

  }
  else {

    status.innerHTML =
      "🔴 Offline Mode";

  }

}
// =========================
// SOUND ENGINE
// =========================

let audioContext = null;

function getAudioContext() {

    if (!audioContext) {

        const AudioCtx =
            window.AudioContext ||
            window.webkitAudioContext;

        audioContext = new AudioCtx();

    }

    return audioContext;

}

function beep(
    duration = 120,
    frequency = 900,
    volume = 0.25
) {

    try {

        const ctx = getAudioContext();

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = frequency;

        gain.gain.value = volume;

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();

        setTimeout(() => {

            osc.stop();

        }, duration);

    }
    catch (err) {

        console.log("Audio not supported");

    }

}

// =========================
// VIBRATION
// =========================

function vibrate(pattern) {

    if ("vibrate" in navigator) {

        navigator.vibrate(pattern);

    }

}

// =========================
// RESULT UI
// =========================

function showResult(
  type,
  message
) {

  result.className = "";

  let icon = "";

  switch (type) {

    case "success":

      result.classList.add(
        "result-success"
      );

      icon = "✅";

      break;

    case "warning":

      result.classList.add(
        "result-warning"
      );

      icon = "⚠️";

      break;

    case "error":

      result.classList.add(
        "result-error"
      );

      icon = "❌";

      break;

    case "processing":

      result.classList.add(
        "result-processing"
      );

      icon = "⏳";

      break;

    case "ready":

      result.classList.add(
        "result-ready"
      );

      icon = "📷";

      break;

    default:

      result.classList.add(
        "result-ready"
      );

      icon = "📷";

  }

  result.innerHTML = `
    <div class="result-icon">${icon}</div>
    <div class="result-message">${message}</div>
  `;

}

// =========================
// START / STOP EVENTS
// =========================

startBtn.addEventListener(
  "click",
  startScanner
);

stopBtn.addEventListener(
  "click",
  stopScanner
);

// =========================
// SCANNER STATUS
// =========================

function resetLastScan() {

  setTimeout(() => {

    lastScan = "";

  }, 2000);

}

function requireLogin() {

  if (!STAFF) {

    showResult(
      "error",
      "Please login first."
    );

    return false;

  }

  return true;

}
// =========================
// START SCANNER
// =========================

async function startScanner() {

  if (!requireLogin()) {
    return;
  }

  try {

    if (scannerRunning) {
      return;
    }

    showResult(
      "processing",
      "Starting Camera..."
    );

    if (!scanner) {

      scanner =
        new Html5Qrcode(
          "reader"
        );

    }

    const cameras =
      await Html5Qrcode.getCameras();

    if (
      !cameras ||
      cameras.length === 0
    ) {

      throw new Error(
        "No camera found."
      );

    }

    let cameraId =
      cameras[0].id;

    for (const cam of cameras) {

      const label =
        (
          cam.label || ""
        ).toLowerCase();

      if (

        label.includes("back") ||

        label.includes("rear") ||

        label.includes("environment")

      ) {

        cameraId =
          cam.id;

        break;

      }

    }

    await scanner.start(

      cameraId,

      {

        fps: 10,

        qrbox: 250

      },

      onScanSuccess,

      () => {

        // Ignore scan errors

      }

    );

    scannerRunning = true;

    showResult(

      "ready",

      "Ready to Scan"

    );

  }
  catch (err) {

    console.error(err);

    showResult(

      "error",

      err.message ||
      err.toString()

    );

  }

}

// =========================
// STOP SCANNER
// =========================

async function stopScanner() {

  try {

    if (!scanner) {
      return;
    }

    if (scannerRunning) {

      await scanner.stop();

      scannerRunning = false;

    }

    await scanner.clear();

    scanner = null;

    showResult(

      "ready",

      "Scanner Stopped"

    );

  }
  catch (err) {

    console.error(err);

    showResult(

      "error",

      err.message ||
      err.toString()

    );

  }

}
// =========================
// SCAN SUCCESS
// =========================

async function onScanSuccess(
  decodedText
) {

  if (!scannerRunning) {
    return;
  }

  if (!requireLogin()) {
    return;
  }

  if (lastScan === decodedText) {
    return;
  }

  lastScan = decodedText;

  // ==========================
  // OFFLINE MODE
  // ==========================

  if (!navigator.onLine) {

    try {

      await saveOfflineScan({

        token:
          decodedText,

        staff:
          STAFF.name,

        device:
          DEVICE_NAME

      });

      playOffline();

showResult(
    "success",
    "Saved Offline"
);

    }
    catch (err) {

      console.error(err);

      showResult(

        "error",

        "Offline Save Failed"

      );

    }

    resetLastScan();

    return;

  }

  // ==========================
  // ONLINE MODE
  // ==========================

  showResult(

    "processing",

    "Checking..."

  );

  try {

    const url =

      API_URL +

      "?action=scan" +

      "&token=" +

      encodeURIComponent(
        decodedText
      ) +

      "&staff=" +

      encodeURIComponent(
        STAFF.name
      ) +

      "&device=" +

      encodeURIComponent(
        DEVICE_NAME
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    console.log(
      "Status:",
      response.status
    );

    console.log(
      "API Response:",
      data
    );

    if (data.success) {

    playSuccess();

    showResult(
        "success",
        data.message || "Success"
    );

    }
    else {

      const msg =

        (
          data.message || ""
        ).toLowerCase();

      if (

        msg.includes(
          "already"
        ) ||

        msg.includes(
          "claimed"
        ) ||

        msg.includes(
          "limit"
        )

      ) {

        playWarning();

showResult(
    "warning",
    data.message
);

      }
      else {

        playError();

showResult(
    "error",
    data.message || "Request Failed"
);

      }

    }

  }
  catch (err) {

    console.error(err);

    playError();

    showResult(
        "error",
        err.message || err.toString()
    );

  }

  resetLastScan();

}
// =========================
// SERVICE WORKER
// =========================

if ("serviceWorker" in navigator) {

  window.addEventListener(

    "load",

    () => {

      navigator.serviceWorker

        .register("sw.js")

        .then(() => {

          console.log(

            "✅ Service Worker Registered"

          );

        })

        .catch((err) => {

          console.error(

            "Service Worker Error:",

            err

          );

        });

    }

  );

}

// =========================
// AUTO LOGIN
// =========================

if (STAFF) {

  console.log(

    "✅ Logged in:",

    STAFF.name,

    "(" + STAFF.role + ")"

  );

}
else {

  console.log(

    "⚠️ No active staff session."

  );

}

// =========================
// DEBUG
// =========================

window.KEMP = {

  getStaff() {

    return STAFF;

  },

  logout() {

    localStorage.removeItem(
      "staff"
    );

    location.reload();

  },

  scanner() {

    return scanner;

  }

};

console.log(
  "🚀 KEMP Scanner Ready"
);
