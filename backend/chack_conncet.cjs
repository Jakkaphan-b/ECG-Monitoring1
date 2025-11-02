const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
   databaseURL: "https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com"
});

const rtdb = admin.database();
const deviceIds = ['ECG_001']; // เพิ่ม deviceId ได้ตามต้องการ

function monitorConnection(deviceId) {
  const statusRef = rtdb.ref(`ecg_stream/${deviceId}/status`);
  let lastSeen = 0;
  let connected = false;

  // ฟังค่าจาก Firebase เพื่ออัปเดต lastSeen และ connected
  statusRef.on('value', (snapshot) => {
    const status = snapshot.val();
    if (!status) return;
    lastSeen = status.last_seen;
    connected = status.connected;
    console.log(`[${deviceId}] last_seen: ${lastSeen}, connected: ${connected}`);
  });

  // ตรวจสอบทุก 1 วินาที
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    if (now - lastSeen > 7) {
      if (connected !== false) {
        console.log(`[${deviceId}] Set connected: false`);
        statusRef.update({ connected: false });
        connected = false;
      }
    } else {
      if (connected !== true) {
        console.log(`[${deviceId}] Set connected: true`);
        statusRef.update({ connected: true });
        connected = true;
      }
    }
  }, 1000);
}

deviceIds.forEach(monitorConnection);