const API_URL =
  "https://kemp-scanner-proxy.dmg1784.workers.dev";

const STAFF_NAME =
  "GitHub Scanner";

const DEVICE_NAME =
  navigator.userAgent;

let scanner = null;
let scannerRunning = false;
let lastScan = "";

const status =
  document.getElementById(
    "status"
  );

const result =
  document.getElementById(
    "result"
  );

const startBtn =
  document.getElementById(
    "startBtn"
  );

const stopBtn =
  document.getElementById(
    "stopBtn"
  );

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

async function startScanner() {

  try {

    if (
      scannerRunning
    ) {
      return;
    }

    result.innerHTML =
      "Starting camera...";

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

    for (
      const cam of cameras
    ) {

      const label =
        (
          cam.label || ""
        ).toLowerCase();

      if (
        label.includes(
          "back"
        ) ||
        label.includes(
          "rear"
        ) ||
        label.includes(
          "environment"
        )
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
      onScanSuccess
    );

    scannerRunning =
      true;

    result.innerHTML =
      "Ready to scan";

  }
  catch (err) {

    console.error(err);

    result.innerHTML =
      err.toString();

  }

}

async function stopScanner() {

  try {

    if (
      !scanner ||
      !scannerRunning
    ) {
      return;
    }

    await scanner.stop();

    scannerRunning =
      false;

    result.innerHTML =
      "Scanner stopped";

  }
  catch (err) {

    console.error(err);

  }

}

async function onScanSuccess(
  decodedText
) {

  if (
    !scannerRunning
  ) {
    return;
  }

  if (
    lastScan ===
    decodedText
  ) {
    return;
  }

  lastScan =
    decodedText;

  result.innerHTML =
    "Processing...";

  try {

    const url =
      API_URL +
      "?token=" +
      encodeURIComponent(
        decodedText
      ) +
      "&staff=" +
      encodeURIComponent(
        STAFF_NAME
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

    result.innerHTML =
      data.message ||
      "Done";

  }
  catch (err) {

    console.error(err);

    if (!navigator.onLine) {

      await saveOfflineScan({

        token: decodedText,

        staff: STAFF_NAME,

        device: DEVICE_NAME

      });

      result.innerHTML =
        "✅ Saved Offline";

    }
    else {

      result.innerHTML =
        err.toString();

    }

  }

  setTimeout(
    function () {

      lastScan = "";

    },
    2000
  );

}

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("sw.js")
      .then(() => {

        console.log("✅ Service Worker Registered");

      })
      .catch(err => {

        console.error(err);

      });

  });

}
