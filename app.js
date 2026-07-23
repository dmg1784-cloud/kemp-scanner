const API_URL =
  "https://kemp-scanner-proxy.dmg1784.workers.dev";

let STAFF_NAME =
  localStorage.getItem("staffName") || "";

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

const staffInput =
  document.getElementById("staffName");

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

  if (STAFF_NAME) {

    showScanner();

  } else {

    loginCard.style.display = "block";
    scannerSection.style.display = "none";

  }

}

function showScanner() {

  loginCard.style.display = "none";
  scannerSection.style.display = "block";

  currentStaff.innerHTML =
    "👤 " + STAFF_NAME;

}

loginBtn.addEventListener("click", () => {

  const name =
    staffInput.value.trim();

  if (!name) {

    alert("Enter Staff Name");
    return;

  }

  STAFF_NAME = name;

  localStorage.setItem(
    "staffName",
    STAFF_NAME
  );

  showScanner();

});

changeStaffBtn.addEventListener("click", () => {

  localStorage.removeItem("staffName");

  location.reload();

});

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

  } else {

    status.innerHTML =
      "🔴 Offline Mode";

  }

}

// =========================
// START SCANNER
// =========================

async function startScanner() {

  try {

    if (scannerRunning) return;

    result.innerHTML =
      "Starting camera...";

    if (!scanner) {

      scanner =
        new Html5Qrcode("reader");

    }

    const cameras =
      await Html5Qrcode.getCameras();

    if (!cameras.length) {

      throw new Error(
        "No camera found."
      );

    }

    let cameraId =
      cameras[0].id;

    for (const cam of cameras) {

      const label =
        (cam.label || "")
        .toLowerCase();

      if (
        label.includes("back") ||
        label.includes("rear") ||
        label.includes("environment")
      ) {

        cameraId = cam.id;
        break;

      }

    }

    await scanner.start(

      cameraId,

      {
        fps: 10,
        qrbox: 250
      },

      onScanSuccess

    );

    scannerRunning = true;

    result.innerHTML =
      "Ready to scan";

  }

  catch (err) {

    console.error(err);

    result.innerHTML =
      err.toString();

  }

}

// =========================
// STOP
// =========================

async function stopScanner() {

  try {

    if (!scannerRunning)
      return;

    await scanner.stop();

    scannerRunning = false;

    result.innerHTML =
      "Scanner stopped";

  }

  catch (err) {

    console.error(err);

  }

}

// =========================
// SCAN
// =========================

async function onScanSuccess(
  decodedText
) {

  if (!scannerRunning)
    return;

  if (lastScan === decodedText)
    return;

  lastScan = decodedText;

  if (!navigator.onLine) {

    try {

      await saveOfflineScan({

        token: decodedText,
        staff: STAFF_NAME,
        device: DEVICE_NAME

      });

      result.innerHTML =
        "✅ Saved Offline";

    }

    catch {

      result.innerHTML =
        "❌ Offline Save Failed";

    }

    setTimeout(() => {

      lastScan = "";

    }, 2000);

    return;

  }

  result.innerHTML =
    "Processing...";

  try {

    const url =
      API_URL +
      "?token=" +
      encodeURIComponent(decodedText) +
      "&staff=" +
      encodeURIComponent(STAFF_NAME) +
      "&device=" +
      encodeURIComponent(DEVICE_NAME);

    const response =
      await fetch(url, {

        method: "GET",
        cache: "no-store"

      });

    const data =
      await response.json();

    result.innerHTML =
      data.message || "Done";

  }

  catch (err) {

    console.error(err);

    result.innerHTML =
      err.toString();

  }

  setTimeout(() => {

    lastScan = "";

  }, 2000);

}

// =========================
// SERVICE WORKER
// =========================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("sw.js")
      .then(() => {

        console.log(
          "✅ Service Worker Registered"
        );

      })
      .catch(console.error);

  });

}
