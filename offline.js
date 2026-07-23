const DB_NAME = "KEMPScannerDB";
const DB_VERSION = 1;
const STORE_NAME = "offlineQueue";

let offlineDB = null;

async function initOfflineDB() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = function (event) {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {

        const store = db.createObjectStore(
          STORE_NAME,
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

        store.createIndex(
          "synced",
          "synced",
          {
            unique: false
          }
        );

      }

    };

    request.onsuccess = function (event) {

      offlineDB = event.target.result;

      console.log("✅ Offline DB Ready");

      syncOfflineScans();

      resolve();

    };

    request.onerror = function (event) {

      reject(event.target.error);

    };

  });

}

async function saveOfflineScan(scan) {

  return new Promise((resolve, reject) => {

    const tx =
      offlineDB.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      tx.objectStore(STORE_NAME);

    store.add({

      token: scan.token,
      staff: scan.staff,
      device: scan.device,
      timestamp: Date.now()

    });

    tx.oncomplete = () => {

      console.log("✅ Saved Offline");

      resolve();

    };

    tx.onerror = reject;

  });

}

async function getPendingScans() {

  return new Promise((resolve, reject) => {

    const tx =
      offlineDB.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      tx.objectStore(STORE_NAME);

    const request =
      store.getAll();

    request.onsuccess = () => {

      resolve(request.result);

    };

    request.onerror = reject;

  });

}

async function deleteOfflineScan(id) {

  return new Promise((resolve, reject) => {

    const tx =
      offlineDB.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      tx.objectStore(STORE_NAME);

    store.delete(id);

    tx.oncomplete = resolve;

    tx.onerror = reject;

  });

}

async function syncOfflineScans() {

  if (!navigator.onLine) {
    return;
  }

  const scans =
    await getPendingScans();

  if (scans.length === 0) {

    console.log("✅ No Pending Scans");

    return;

  }

  console.log(
    "🔄 Syncing",
    scans.length,
    "scan(s)..."
  );

  for (const scan of scans) {

    try {

      const url =
        API_URL +
        "?token=" +
        encodeURIComponent(scan.token) +
        "&staff=" +
        encodeURIComponent(scan.staff) +
        "&device=" +
        encodeURIComponent(scan.device);

      const response =
        await fetch(url);

      if (!response.ok) {

        throw new Error("Upload Failed");

      }

      await deleteOfflineScan(scan.id);

      console.log(
        "✅ Synced",
        scan.token
      );

    }
    catch (err) {

      console.error(err);

      break;

    }

  }

}

window.addEventListener(
  "online",
  syncOfflineScans
);

window.addEventListener(
  "load",
  initOfflineDB
);
