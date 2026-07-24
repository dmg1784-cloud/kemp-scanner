/* =====================================================
   KEMP QR SCANNER v2.1 EVENT EDITION
===================================================== */

/* =====================================================
   CONFIG
===================================================== */

const API_URL =
"https://kemp-scanner-proxy.dmg1784.workers.dev";

const SCAN_DELAY = 1500;

const AUTO_RESUME_DELAY = 1200;

const ENABLE_SOUND = true;

const ENABLE_VIBRATION = true;

const ENABLE_FLASH = true;

/* =====================================================
   GLOBAL STATE
===================================================== */

let STAFF = null;

let scanner = null;

let scanLocked = false;

let isScanning = false;

let audioContext = null;

let offlineQueue = [];

/* =====================================================
   DOM ELEMENTS
===================================================== */

const loginSection =
document.getElementById("loginSection");

const scannerSection =
document.getElementById("scannerSection");

const loginBtn =
document.getElementById("loginBtn");

const logoutBtn =
document.getElementById("changeStaffBtn");

const status =
document.getElementById("status");

const result =
document.getElementById("result");

const reader =
document.getElementById("reader");

const currentStaff =
document.getElementById("currentStaff");

const flashOverlay =
document.getElementById("flashOverlay");

const staffIdInput =
document.getElementById("staffId");

const pinInput =
document.getElementById("pin");

const manualEntryBtn =
document.getElementById("manualEntryBtn");

const manualModal =
document.getElementById("manualModal");

const manualCode =
document.getElementById("manualCode");

const verifyManualBtn =
document.getElementById("verifyManualBtn");

const cancelManualBtn =
document.getElementById("cancelManualBtn");

/* =====================================================
   INIT
===================================================== */

window.addEventListener("load", initializeApp);

/* =====================================================
   INITIALIZE
===================================================== */

async function initializeApp(){

    initAudio();

    restoreOfflineQueue();

    attachEvents();

    const saved =
    localStorage.getItem("scanner_staff");

    if(saved){

        STAFF = JSON.parse(saved);

        showScanner();

    }

}

/* =====================================================
   EVENT BINDINGS
===================================================== */

function attachEvents(){

    loginBtn.addEventListener(
        "click",
        login
    );

    logoutBtn.addEventListener(
        "click",
        logout
    );

    manualEntryBtn.addEventListener(
        "click",
        openManualEntry
    );

    verifyManualBtn.addEventListener(
        "click",
        verifyManualCode
    );

    cancelManualBtn.addEventListener(
        "click",
        closeManualEntry
    );

    manualCode.addEventListener(
        "keydown",
        function(e){

            if(e.key==="Enter"){

                verifyManualCode();

            }

        }
    );

}

/* =====================================================
   AUDIO ENGINE
===================================================== */

function initAudio(){

    if(!ENABLE_SOUND){

        return;

    }

    try{

        audioContext =
        new(
            window.AudioContext ||
            window.webkitAudioContext
        )();

    }

    catch(e){

        console.log(
            "Audio unsupported."
        );

    }

}
/* =====================================================
   AUDIO HELPERS
===================================================== */

function playTone(freq,duration,type="sine"){

    if(!ENABLE_SOUND) return;

    if(!audioContext) return;

    try{

        if(audioContext.state==="suspended"){

            audioContext.resume();

        }

        const osc =
        audioContext.createOscillator();

        const gain =
        audioContext.createGain();

        osc.type = type;

        osc.frequency.value = freq;

        gain.gain.value = 0.08;

        osc.connect(gain);

        gain.connect(audioContext.destination);

        osc.start();

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + duration
        );

        osc.stop(
            audioContext.currentTime + duration
        );

    }

    catch(e){

        console.log(e);

    }

}

/* =====================================================
   SUCCESS SOUND
===================================================== */

function playSuccess(){

    playTone(750,.08);

    setTimeout(function(){

        playTone(980,.12);

    },90);

}

/* =====================================================
   WARNING SOUND
===================================================== */

function playWarning(){

    playTone(500,.20,"triangle");

}

/* =====================================================
   ERROR SOUND
===================================================== */

function playError(){

    playTone(260,.20,"sawtooth");

    setTimeout(function(){

        playTone(180,.20,"sawtooth");

    },120);

}

/* =====================================================
   OFFLINE SOUND
===================================================== */

function playOffline(){

    playTone(420,.12);

    setTimeout(function(){

        playTone(420,.12);

    },180);

}

/* =====================================================
   VIBRATION
===================================================== */

function vibrate(pattern){

    if(!ENABLE_VIBRATION) return;

    if(!navigator.vibrate) return;

    navigator.vibrate(pattern);

}

function successVibrate(){

    vibrate([70]);

}

function warningVibrate(){

    vibrate([120]);

}

function errorVibrate(){

    vibrate([200,120,200]);

}

function offlineVibrate(){

    vibrate([80,80,80]);

}

/* =====================================================
   FLASH
===================================================== */

function flashScreen(type){

    if(!ENABLE_FLASH) return;

    flashOverlay.className="";

    switch(type){

        case "success":

            flashOverlay.classList.add(
                "flash-success"
            );

            break;

        case "warning":

            flashOverlay.classList.add(
                "flash-warning"
            );

            break;

        case "error":

            flashOverlay.classList.add(
                "flash-error"
            );

            break;

        case "offline":

            flashOverlay.classList.add(
                "flash-offline"
            );

            break;

    }

    setTimeout(function(){

        flashOverlay.className="";

    },400);

}

/* =====================================================
   STATUS
===================================================== */

function setStatus(message){

    status.innerHTML = message;

}

/* =====================================================
   RESULT CARD
===================================================== */

function showResult(type,title,icon){

    result.className="";

    result.id="result";

    result.classList.add("result-"+type);

    result.innerHTML=`

        <div class="result-icon">

            ${icon}

        </div>

        <div class="result-message">

            ${title}

        </div>

    `;

}

/* =====================================================
   READY SCREEN
===================================================== */

function showReady(){

    showResult(

        "ready",

        "Ready to Scan",

        "📷"

    );

}

/* =====================================================
   PROCESSING
===================================================== */

function showProcessing(){

    result.className="";

    result.id="result";

    result.classList.add(

        "result-processing"

    );

    result.innerHTML=`

        <div class="spinner"></div>

        <div class="result-message">

            Processing...

        </div>

    `;

}
/* =====================================================
   LOGIN
===================================================== */

async function login(){

    const staffId =
    staffIdInput.value.trim();

    const pin =
    pinInput.value.trim();

    if(!staffId || !pin){

        playWarning();
        warningVibrate();
        flashScreen("warning");

        showResult(
            "warning",
            "Enter Staff ID and PIN",
            "⚠️"
        );

        return;

    }

    showProcessing();

    setStatus("Authenticating...");

    try{

        const response =
        await fetch(

            API_URL +

            "?action=login" +

            "&staffId=" +
            encodeURIComponent(staffId) +

            "&pin=" +
            encodeURIComponent(pin)

        );

        const data =
        await response.json();

        if(!data.success){

            playError();
            errorVibrate();
            flashScreen("error");

            showResult(
                "error",
                data.message ||
                "Login Failed",
                "❌"
            );

            setStatus("Login Failed");

            return;

        }

        STAFF = data.staff;

        localStorage.setItem(
            "scanner_staff",
            JSON.stringify(STAFF)
        );

        playSuccess();
        successVibrate();
        flashScreen("success");

        setStatus("Login Successful");

        showScanner();

    }

    catch(err){

        console.error(err);

        playError();
        errorVibrate();
        flashScreen("error");

        showResult(
            "error",
            "Cannot connect to server",
            "🌐"
        );

        setStatus("Offline");

    }

}

/* =====================================================
   LOGOUT
===================================================== */

function logout(){

    stopScanner();

    STAFF = null;

    localStorage.removeItem(
        "scanner_staff"
    );

    loginSection.style.display = "block";

    scannerSection.style.display = "none";

    staffIdInput.value = "";

    pinInput.value = "";

    showReady();

    setStatus("Logged Out");

}

/* =====================================================
   SHOW SCANNER
===================================================== */

async function showScanner(){

    loginSection.style.display = "none";

    scannerSection.style.display = "block";

    currentStaff.innerHTML = `
        👤 <strong>${STAFF.name}</strong><br>
        <small>${STAFF.staffId}</small>
    `;

    showReady();

    setStatus("Ready to Scan");

    await startScanner();

}
/* =====================================================
   START SCANNER
===================================================== */

async function startScanner(){

    if(isScanning){
        return;
    }

    scanner = new Html5Qrcode("reader");

    try{

        await scanner.start(

            {
                facingMode:"environment"
            },

            {
                fps:10,
                qrbox:250
            },

            onScanSuccess

        );

        isScanning = true;

        setStatus("📷 Scanner Ready");

    }

    catch(err){

        console.error(err);

        showResult(
            "error",
            "Camera Error",
            "📷"
        );

        setStatus("Camera Error");

    }

}

/* =====================================================
   STOP SCANNER
===================================================== */

async function stopScanner(){

    if(!scanner){
        return;
    }

    try{

        await scanner.stop();

        await scanner.clear();

    }

    catch(e){

        console.log(e);

    }

    scanner = null;

    isScanning = false;

    setStatus("Scanner Stopped");

}
/* =====================================================
   PAUSE
===================================================== */

async function pauseScanner(){

    if(!scanner){

        return;

    }

    try{

        await scanner.pause();

    }

    catch(e){

    }

}

/* =====================================================
   RESUME
===================================================== */

async function resumeScanner(){

    if(!scanner){

        return;

    }

    try{

        await scanner.resume();

    }

    catch(e){

    }

}

/* =====================================================
   QR SUCCESS
===================================================== */

async function onScanSuccess(qrCode){

    if(scanLocked){

        return;

    }

    scanLocked=true;

    await pauseScanner();

    verifyQRCode(

        qrCode.trim()

    );

}
/* =====================================================
   VERIFY QR CODE
===================================================== */

async function verifyQRCode(code){

    showProcessing();

    setStatus("Verifying...");

    try{

        const response =
        await fetch(

            API_URL +

            "?action=scan" +

            "&token=" +
            encodeURIComponent(code) +

            "&staff=" +
            encodeURIComponent(STAFF.name) +

            "&device=Browser"

        );

        const data =
        await response.json();

        handleScanResult(data);

    }

    catch(err){

        console.error(err);

        saveOffline(code);

        playOffline();

        offlineVibrate();

        flashScreen("offline");

        showResult(
            "warning",
            "Offline Saved",
            "📡"
        );

        setStatus(
            "Saved Offline"
        );

        unlockScanner();

    }

}

/* =====================================================
   HANDLE RESULT
===================================================== */

function handleScanResult(data){

    if(data.success){

        playSuccess();

        successVibrate();

        flashScreen("success");

        showResult(

            "success",

            data.message ||

            "Verified",

            "✅"

        );

    }

    else{

        playWarning();

        warningVibrate();

        flashScreen("warning");

        showResult(

            "warning",

            data.message ||

            "Already Claimed",

            "⚠️"

        );

    }

    setStatus(

        data.message

    );

    unlockScanner();

}

/* =====================================================
   MANUAL VERIFY
===================================================== */

function verifyManualCode(){

    const code =
    manualCode.value.trim();

    if(!code){

        manualCode.focus();

        return;

    }

    closeManualEntry();

    verifyQRCode(code);

}

/* =====================================================
   OPEN MODAL
===================================================== */

function openManualEntry(){

    manualCode.value="";

    manualModal.classList.add(

        "show"

    );

    setTimeout(function(){

        manualCode.focus();

    },120);

}

/* =====================================================
   CLOSE MODAL
===================================================== */

function closeManualEntry(){

    manualModal.classList.remove(

        "show"

    );

}

/* =====================================================
   UNLOCK SCANNER
===================================================== */

function unlockScanner(){

    setTimeout(async function(){

        scanLocked=false;

        showReady();

        setStatus(

            "Ready to Scan"

        );

        await resumeScanner();

    },

    AUTO_RESUME_DELAY);

}

/* =====================================================
   OFFLINE STORAGE
===================================================== */

function saveOffline(code){

    offlineQueue.push({

        qr:code,

        staff:STAFF.name,

        staffId:STAFF.staffId,

        time:new Date().toISOString()

    });

    localStorage.setItem(

        "offline_queue",

        JSON.stringify(

            offlineQueue

        )

    );

}

/* =====================================================
   RESTORE OFFLINE
===================================================== */

function restoreOfflineQueue(){

    const saved =

    localStorage.getItem(

        "offline_queue"

    );

    if(saved){

        offlineQueue =

        JSON.parse(saved);

    }

}
/* =====================================================
   OFFLINE SYNC
===================================================== */

window.addEventListener(
    "online",
    syncOfflineQueue
);

async function syncOfflineQueue(){

    if(
        offlineQueue.length===0 ||
        !STAFF
    ){
        return;
    }

    console.log(
        "Syncing offline scans..."
    );

    const queue=[...offlineQueue];

    offlineQueue=[];

    localStorage.removeItem(
        "offline_queue"
    );

    for(const item of queue){

        try{

            await fetch(

                API_URL +

                "?action=scan" +

                "&token=" +
                encodeURIComponent(item.qr) +

                "&staff=" +
                encodeURIComponent(item.staff) +

                "&device=Browser"

            );

        }

        catch(e){

            offlineQueue.push(item);

        }

    }

    localStorage.setItem(

        "offline_queue",

        JSON.stringify(
            offlineQueue
        )

    );

}

/* =====================================================
   CLOSE MODAL
===================================================== */

window.addEventListener(

    "click",

    function(e){

        if(

            e.target===manualModal

        ){

            closeManualEntry();

        }

    }

);

document.addEventListener(

    "keydown",

    function(e){

        if(

            e.key==="Escape"

        ){

            closeManualEntry();

        }

    }

);

/* =====================================================
   PAGE EXIT
===================================================== */

window.addEventListener(

    "beforeunload",

    function(){

        if(scanner){

            try{

                scanner.stop();

            }

            catch(e){

            }

        }

    }

);

/* =====================================================
   PAGE VISIBILITY
===================================================== */

document.addEventListener(

    "visibilitychange",

    async function(){

        if(!scanner){

            return;

        }

        if(document.hidden){

            try{

                await pauseScanner();

            }

            catch(e){

            }

        }

        else{

            if(!scanLocked){

                try{

                    await resumeScanner();

                }

                catch(e){

                }

            }

        }

    }

);

/* =====================================================
   PREVENT DOUBLE TAP
===================================================== */

let lastTap=0;

document.addEventListener(

    "touchend",

    function(e){

        const now=Date.now();

        if(now-lastTap<300){

            e.preventDefault();

        }

        lastTap=now;

    },

    {

        passive:false

    }

);

/* =====================================================
   DEBUG
===================================================== */

function debug(){

    console.table({

        staff:STAFF,

        scanning:isScanning,

        locked:scanLocked,

        offline:offlineQueue.length

    });

}

window.debugScanner=debug;

/* =====================================================
   APP READY
===================================================== */

console.log(

    "==================================="

);

console.log(

    "KEMP QR Scanner v2.1 Loaded"

);

console.log(

    "==================================="

);
