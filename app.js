const API_URL =
  "https://script.google.com/macros/s/AKfycbwSr9GRYGnsCvsBa5IWY1lZECpQys-LfA99AyW14bMvbgnM6_02IZwvAOauYSybILioMg/exec";

let scanner = null;
let scannerRunning = false;

const result =
  document.getElementById("result");

const startBtn =
  document.getElementById("startBtn");

const stopBtn =
  document.getElementById("stopBtn");

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

    scanner =
      new Html5Qrcode(
        "reader"
      );

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

    scannerRunning = true;

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

    scannerRunning = false;

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

  if (!scannerRunning) {
    return;
  }

  result.innerHTML =
    "Processing...";

  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify({
              token:
                decodedText
            })
        }
      );

    const data =
      await response.json();

    result.innerHTML =
      data.message;

  }
  catch (err) {

    console.error(err);

    result.innerHTML =
      "Server Error";

  }

}
