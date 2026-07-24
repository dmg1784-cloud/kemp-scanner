const DB_NAME = "KEMPScannerDB";
const DB_VERSION = 1;
const STORE_NAME = "offlineQueue";

let offlineDB = null;

async function initOfflineDB() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {

        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });

      }

    };

    request.onsuccess = (event) => {

      offlineDB = event.target.result;

      console.log("✅ Offline DB Ready");

      if (navigator.onLine) {
        syncOfflineScans();
      }

      resolve();

    };

    request.onerror = (event) => reject(event.target.error);

  });
}

async function saveOfflineScan(scan) {

  if (!offlineDB) {
    await initOfflineDB();
  }

  return new Promise((resolve, reject) => {

    const tx = offlineDB.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

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

    tx.onerror = (e) => reject(e.target.error);

  });

}

async function getPendingScans() {

  return new Promise((resolve, reject) => {

    const tx = offlineDB.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);

  });

}

async function deleteOfflineScan(id) {

  return new Promise((resolve, reject) => {

    const tx = offlineDB.transaction(STORE_NAME, "readwrite");

    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);

  });

}

async function syncOfflineScans() {

  if (!navigator.onLine) return;
  if (!offlineDB) return;

  const scans = await getPendingScans();

  if (!scans.length) {

    console.log("✅ No Pending Scans");

    return;

  }

  console.log(`🔄 Syncing ${scans.length} scan(s)...`);

  for (const scan of scans) {

    try {

     const url =
  API_URL +
  "?action=scan" +
  "&token=" + encodeURIComponent(scan.token) +
  "&staff=" + encodeURIComponent(scan.staff) +
  "&device=" + encodeURIComponent(scan.device);

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Upload Failed");
      }

      await deleteOfflineScan(scan.id);

      console.log("✅ Synced:", scan.token);

    }
    catch (err) {

      console.error("❌ Sync Failed:", err);

      break;

    }

  }

}

window.addEventListener("online", () => {

  console.log("🌐 Back Online");

  syncOfflineScans();

});

window.addEventListener("load", initOfflineDB);
