const API_URL =
  "https://script.google.com/macros/s/AKfycbwSr9GRYGnsCvsBa5IWY1lZECpQys-LfA99AyW14bMvbgnM6_02IZwvAOauYSybILioMg/exec";

let scanner = null;
let scannerRunning = false;
let lastScan = "";

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

async function startScanner() {

  try {

    if (scannerRunning) {
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

    await scanner.start(
      {
        facingMode:
          "environment"
      },
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
      "Unable to access camera";

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

  // prevent duplicate scans
  if (
    lastScan === decodedText
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
      "?action=scan" +
      "&token=" +
      encodeURIComponent(
        decodedText
      ) +
      "&staff=" +
      encodeURIComponent(
        "GitHub Scanner"
      ) +
      "&device=" +
      encodeURIComponent(
        navigator.userAgent
      ) +
      "&t=" +
      Date.now();

    const response =
      await fetch(
        url,
        {
          method: "GET",
          mode: "cors",
          redirect: "follow",
          cache: "no-store"
        }
      );

    const text =
      await response.text();

    console.log(
      "API Response:",
      text
    );

    const data =
      JSON.parse(
        text
      );

    result.innerHTML =
      data.message ||
      "Done";

  }
  catch (err) {

    console.error(err);

    result.innerHTML =
      err.toString();

  }

  setTimeout(
    function () {

      lastScan = "";

    },
    2000
  );

}
