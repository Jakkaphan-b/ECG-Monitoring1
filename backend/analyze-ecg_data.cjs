// ECG Analysis Service (age/sex-aware) + minimal Firestore payload
// ---------------------------------------------------------------
// - ดึงอุปกรณ์จาก Firestore: devices/{deviceId}.user_id
// - อ่านโปรไฟล์ผู้ใช้: users/{user_id}.date_of_birth, .gender
// - ดึงข้อมูล RTDB: /ecg_stream/{deviceId}/ecg_data
// - วิเคราะห์ตามเกณฑ์ "ช่วงอายุ + เพศ" (HR/PR/QRS/QTc + T inversion + QRS amplitude)
// - ถ้าผิดปกติ: บันทึก Firestore -> ecg_status/{deviceId}/events/{timestamp} (payload แบบย่อ)
// - ถ้าปกติและเกิน 10 นาที: ลบจาก RTDB
// - วนซ้ำทุก 1 วินาที

const fetch = require('node-fetch');
const admin = require('firebase-admin');
const path = require('path');

// ---------- Init Firebase Admin ----------
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com',
});
const db = admin.firestore();

// ---------- Helpers: อายุ/เพศ/เกณฑ์ ----------
const userProfileCache = new Map(); // ลดรอบอ่าน Firestore ซ้ำ

function calcAgeYearsFromDOB(dob) {
  try {
    const d =
      dob && typeof dob.toDate === 'function'
        ? dob.toDate()
        : new Date(dob); // รองรับ Timestamp/ISO string
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

async function getUserProfile(userId) {
  // คืน { ageYears, gender } (default: 25 ปี, ไม่ระบุเพศ)
  if (!userId) return { ageYears: 25, gender: null };
  if (userProfileCache.has(userId)) return userProfileCache.get(userId);

  const userRef = db.doc(`users/${userId}`);
  const snap = await userRef.get();

  let ageYears = 25;
  let gender = null;

  if (snap.exists) {
    const data = snap.data() || {};
    if (data.age != null) {
      ageYears = Number(data.age);
    } else if (data.date_of_birth) {
      const v = calcAgeYearsFromDOB(data.date_of_birth);
      if (v != null && !Number.isNaN(v)) ageYears = v;
    } else if (data.dob) {
      const v = calcAgeYearsFromDOB(data.dob);
      if (v != null && !Number.isNaN(v)) ageYears = v;
    }
    if (typeof data.gender === 'string' && data.gender.trim()) {
      gender = data.gender.trim().toUpperCase(); // 'M' | 'F'
    }
  }

  const prof = { ageYears, gender };
  userProfileCache.set(userId, prof);
  return prof;
}

function getAgeSexThresholds(ageYears, gender) {
  // เกณฑ์สรุปอ่านง่าย:
  // HR (bpm), PR/QRS (s), QTc (s)
  // QTc แยกเพศ (ผู้ใหญ่/สูงอายุ)
  let hrLow, hrHigh, prUpper, qrsUpper, qtcUpper;
  const isMale = gender === 'M';
  const isFemale = gender === 'F';

  if (ageYears < 1) {
    hrLow = 100; hrHigh = 160;
    prUpper = 0.18; qrsUpper = 0.10; qtcUpper = 0.46;
  } else if (ageYears < 6) {
    hrLow = 80; hrHigh = 140;
    prUpper = 0.18; qrsUpper = 0.10; qtcUpper = 0.46;
  } else if (ageYears < 13) {
    hrLow = 70; hrHigh = 120;
    prUpper = 0.18; qrsUpper = 0.10; qtcUpper = 0.46;
  } else if (ageYears < 60) {
    hrLow = 60; hrHigh = 100;
    prUpper = 0.20; qrsUpper = 0.12;
    if (isFemale) qtcUpper = 0.48;
    else if (isMale) qtcUpper = 0.47;
    else qtcUpper = 0.47;
  } else {
    hrLow = 60; hrHigh = 100;
    prUpper = 0.22; qrsUpper = 0.12;
    if (isFemale) qtcUpper = 0.49;
    else if (isMale) qtcUpper = 0.48;
    else qtcUpper = 0.48;
  }

  return { hrLow, hrHigh, prUpper, qrsUpper, qtcUpper };
}

function calcQTcBazett(qt, heartRate, rrInterval) {
  if (!qt) return null;
  let rr = rrInterval;
  if (!rr && heartRate > 0) rr = 60 / heartRate; // RR(s) จาก HR
  if (!rr || rr <= 0) return null;
  return qt / Math.sqrt(rr);
}

// ---------- Firestore: ดึง devices พร้อมโปรไฟล์ ----------
async function getAllDeviceInfos() {
  try {
    const devicesRef = db.collection('devices');
    const snapshot = await devicesRef.get();
    const tasks = [];

   
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      // ใช้ field device_id ถ้ามี ไม่ใช้ docSnap.id
      const deviceId = data.device_id || docSnap.id;
      const userId = data.user_id || data.owner_id || null;

      tasks.push(
        (async () => {
          const prof = await getUserProfile(userId);
          return { deviceId, userId, ...prof };
        })()
      );
    });

    return await Promise.all(tasks);
  } catch (err) {
    console.error('Error fetching devices:', err);
    return [];
  }
}

// ---------- RTDB URLs ----------
function getDatabaseUrl(deviceId) {
  return `https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/${deviceId}/ecg_data.json`;
}
function getDeleteUrl(deviceId, ts) {
  return `https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/${deviceId}/ecg_data/${ts}.json`;
}

// ---------- Rules / Checks ----------
function isTWaveInverted(d) {
  return d.t_wave_amplitude < 0;
}
function isPRIntervalProlonged(d, prUpper) {
  if (d.pr_interval == null) return false;
  return d.pr_interval > prUpper;
}
function isQRSWidened(d, qrsUpper) {
  if (d.qrs_interval == null) return false;
  return d.qrs_interval > qrsUpper;
}
function isQTcProlonged(d, qtcUpper) {
  const qtc = calcQTcBazett(d.qt_interval, d.heart_rate, d.rr_interval);
  if (qtc == null) return false;
  return qtc > qtcUpper;
}

function checkAbnormalValues(ecgData, ageYears, gender) {
  const thresholds = getAgeSexThresholds(ageYears ?? 25, gender ?? null);
  const { hrLow, hrHigh, prUpper, qrsUpper, qtcUpper } = thresholds;

  let normal = true;
  const abnormalities = [];

  // HR by age
  if (ecgData.heart_rate != null) {
    const hr = ecgData.heart_rate;
    if (hr < hrLow) {
      normal = false;
      abnormalities.push('bradycardia');
    } else if (hr > hrHigh) {
      normal = false;
      abnormalities.push('tachycardia');
    }
  }

  // QRS amplitude (พื้นฐาน ปรับได้ภายหลัง)
  if (ecgData.qrs_amplitude != null && ecgData.qrs_amplitude > 1.5) {
    normal = false;
    abnormalities.push('high_qrs_amplitude');
  }

  // Morphology/intervals
  if (isTWaveInverted(ecgData)) {
    normal = false;
    abnormalities.push('t_wave_inversion');
  }
  if (isPRIntervalProlonged(ecgData, prUpper)) {
    normal = false;
    abnormalities.push('pr_interval_prolonged');
  }
  if (isQRSWidened(ecgData, qrsUpper)) {
    normal = false;
    abnormalities.push('qrs_widened');
  }
  if (isQTcProlonged(ecgData, qtcUpper)) {
    normal = false;
    abnormalities.push('qtc_prolonged');
  }

  return {
    normal,
    status: normal ? 'normal' : 'abnormal',
    abnormalities,
    thresholds_used: { hrLow, hrHigh, prUpper, qrsUpper, qtcUpper, ageYears, gender }, // ใช้ประกอบ alert-level
  };
}

function determineAlertLevel(d, t) {
  // ประเมินความรุนแรงจาก "ระยะห่าง" เกณฑ์
  const { hrLow, hrHigh, prUpper, qrsUpper, qtcUpper } = t || getAgeSexThresholds(25, null);
  let scoreHigh = 0,
    scoreMed = 0;

  if (d.heart_rate != null) {
    const hr = d.heart_rate;
    if (hr < hrLow - 20 || hr > hrHigh + 40) scoreHigh++;
    else if (hr < hrLow || hr > hrHigh) scoreMed++;
  }
  if (d.qrs_interval != null) {
    const diff = d.qrs_interval - qrsUpper;
    if (diff > 0.02) scoreHigh++;
    else if (diff > 0) scoreMed++;
  }
  if (d.pr_interval != null) {
    const diff = d.pr_interval - prUpper;
    if (diff > 0.04) scoreHigh++;
    else if (diff > 0) scoreMed++;
  }
  const qtc = calcQTcBazett(d.qt_interval, d.heart_rate, d.rr_interval);
  if (qtc != null) {
    const diff = qtc - qtcUpper;
    if (diff > 0.03) scoreHigh++;
    else if (diff > 0) scoreMed++;
  }

  if (scoreHigh > 0) return 'high';
  if (scoreMed > 0) return 'medium';
  return 'low';
}

// ---------- Firestore write (payloadแบบย่อ) ----------
async function saveStatusToFirestore(eventTimestamp, ecgData, result) {
  try {
    const deviceId = (ecgData?.device_id || 'ECG_000').trim();
    const userId = ecgData?.user_id; // ต้องมี user_id ใน ecgData
    const tsStr = String(eventTimestamp);

    if (!userId) {
      console.error('❌ Missing user_id in ECG data, cannot save to Firestore');
      return;
    }

    const alertLevel = determineAlertLevel(ecgData, result.thresholds_used);
    if (alertLevel === 'low') {
      return;
    }
    
    const payload = {
      device_id: deviceId,
      event_timestamp: ecgData?.timestamp ?? eventTimestamp,
      alert_level: alertLevel,
      abnormalities: Array.isArray(result.abnormalities) ? result.abnormalities : [],
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      read_at: null,
      status: result.status,
      type: 'ecg_abnormal',
      ecg_data: {
        timestamp: ecgData?.timestamp ?? eventTimestamp,
        heart_rate: ecgData?.heart_rate ?? null,
        pr_interval: ecgData?.pr_interval ?? null,
        qrs_interval: ecgData?.qrs_interval ?? null,
        qt_interval: ecgData?.qt_interval ?? null,
        rr_interval: ecgData?.rr_interval ?? null,
        qrs_amplitude: ecgData?.qrs_amplitude ?? null,
        t_wave_amplitude: ecgData?.t_wave_amplitude ?? null,
      },
    };

    const docRef = db.doc(`ecg_status/${userId}/${deviceId}/${tsStr}`);
    await docRef.set(payload);
    console.log(`✅ Saved ECG status (minimal) for user ${userId}, device ${deviceId} at ${tsStr}`);
  } catch (error) {
    console.error('❌ Error saving status to Firestore:', error.message || error);
  }
}

// ---------- RTDB maintenance ----------
function deleteECGData(timestamp, deviceId) {
  const deleteUrl = getDeleteUrl(deviceId, timestamp);
  fetch(deleteUrl, { method: 'DELETE' })
    .then((res) => {
      if (res.ok) {
        console.log(`🗑️ Deleted normal ECG @${timestamp} (${deviceId})`);
      } else {
        console.log(`⚠️ Failed to delete ECG @${timestamp} (${deviceId})`);
      }
    })
    .catch((err) => console.error('Error deleting ECG data:', err));
}

// ---------- Fetch + analyze per device ----------
// ...existing code...
function fetchECGDataForDevice(info) {
  const { deviceId, userId, ageYears, gender } = info;
  const url = getDatabaseUrl(deviceId);

  fetch(url)
    .then((res) => res.json())
    .then(async (data) => {
      if (!data) return;

      for (const timestamp in data) {
        const d = data[timestamp] || {};

        // เติมข้อมูลสำคัญให้ครบเพื่อ downstream logging
        if (!d.device_id) d.device_id = deviceId;
        if (!d.user_id) d.user_id = userId;

        const result = checkAbnormalValues(d, ageYears, gender);

        if (!result.normal) {
          await saveStatusToFirestore(timestamp, d, result);
        }
        // // ลบออกจาก RTDB ทุกกรณี
        // deleteECGData(timestamp, deviceId);
        // ลบออกจาก RTDB หลังผ่านไป 20 วินาที
        setTimeout(() => {
          deleteECGData(timestamp, deviceId);
        }, 20000); // 20,000 ms = 20 วินาที
      }
    })
    .catch((err) => console.error(`Error fetching ECG data for ${deviceId}:`, err));
}
// ...existing code...

// ---------- Main loop ----------
async function mainLoop() {
  const infos = await getAllDeviceInfos();
  if (infos.length === 0) {
    console.log('No devices found in Firestore');
    return;
  }
  infos.forEach((info) => fetchECGDataForDevice(info));
}
console.log('=== RUNNING ECG BACKEND SERVICE ===');
console.log('ECG Analysis Service Started (Node.js backend, age/sex-aware, minimal payload)');
mainLoop();
setInterval(mainLoop, 1000);
