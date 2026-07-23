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

      timestamp: Date.now(),

      synced: false

    });

    tx.oncomplete = () => {

      console.log("✅ Saved Offline");

      resolve();

    };

    tx.onerror = e => {

      reject(e);

    };

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

      resolve(
        request.result.filter(
          x => !x.synced
        )
      );

    };

    request.onerror = reject;

  });

}

window.addEventListener(
  "load",
  initOfflineDB
);
