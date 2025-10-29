// Firebase configuration and imports
import { db } from '../../firebase.js';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// Firebase Realtime Database URL
const databaseUrl = 'https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/ECG_001/ecg_data.json';

// Function to fetch ECG data from Firebase
function fetchECGData() {
    fetch(databaseUrl)
    .then(response => response.json())
    .then(data => {
        // Get current time in milliseconds
        const currentTime = Date.now();

        // Iterate over all timestamps in the data
        for (let timestamp in data) {
            const ecgData = data[timestamp];

            // Check if the ECG data is normal (no abnormalities)
            const result = checkAbnormalValues(ecgData);

            // If it's normal, check if it exceeds the specified time and delete it
            if (result.normal) {
                const dataTime = new Date(ecgData.timestamp).getTime();
                
                // Set the time threshold (e.g., 1 hour = 3600000 milliseconds)
                const timeThreshold = 3600000; // 1 hour
                
                // Check if the data timestamp is older than the threshold and delete it
                if (currentTime - dataTime > timeThreshold) {
                    deleteECGData(timestamp); // Delete the normal ECG data
                }
            } else {
                // If abnormal, save the status to Firestore
                saveStatusToFirestore(timestamp, result, ecgData);
            }
        }
    })
    .catch(error => {
        console.error('Error fetching ECG data:', error);
    });
}

// Function to detect abnormal heart rate or ECG values
function checkAbnormalValues(ecgData) {
    let normal = true;
    let abnormalities = [];

    // Check if the heart rate is within a normal range (e.g., 60 to 100 bpm)
    if (ecgData.heart_rate < 60) {
        normal = false;
        abnormalities.push('bradycardia');
    } else if (ecgData.heart_rate > 100) {
        normal = false;
        abnormalities.push('tachycardia');
    }

    // Check other conditions for normal ECG data
    if (ecgData.qrs_amplitude > 1.5) {
        normal = false;
        abnormalities.push('high_qrs_amplitude');
    }

    if (isTWaveInverted(ecgData)) {
        normal = false;
        abnormalities.push('t_wave_inversion');
    }

    if (isPRIntervalProlonged(ecgData)) {
        normal = false;
        abnormalities.push('pr_interval_prolonged');
    }

    if (isQTIntervalProlonged(ecgData)) {
        normal = false;
        abnormalities.push('qt_interval_prolonged');
    }

    return { 
        normal: normal, 
        status: normal ? 'normal' : 'abnormal',
        abnormalities: abnormalities
    };
}

// Function to check if T-wave is inverted
function isTWaveInverted(ecgData) {
    // Simple threshold for T Wave inversion (can be adjusted based on actual ECG signal)
    return ecgData.t_wave_amplitude < 0;
}

// Function to check if PR interval is prolonged
function isPRIntervalProlonged(ecgData) {
    // Threshold for prolonged PR interval (in seconds, normal is between 0.12 - 0.20 seconds)
    return ecgData.pr_interval > 0.2;
}

// Function to check if QT interval is prolonged
function isQTIntervalProlonged(ecgData) {
    // Threshold for prolonged QT interval (normal is between 0.36 - 0.44 seconds)
    return ecgData.qt_interval > 0.44;
}

// Function to save the abnormal status to Firestore
async function saveStatusToFirestore(eventTimestamp, ecgData, abnormalities) {
  try {
    const deviceId = (ecgData?.device_id || 'ECG_000').trim();
    const tsStr = String(eventTimestamp);

    const payload = {
      device_id: deviceId,
      event_timestamp: ecgData?.timestamp ?? eventTimestamp,
      alert_level: determineAlertLevel(ecgData),
      abnormalities: Array.isArray(abnormalities) ? abnormalities : [],
      created_at: serverTimestamp(),
      ecg_data: ecgData || {},
    };

    // ecg_status/{deviceId}/events/{timestamp}
    const docRef = doc(db, 'ecg_status', deviceId, 'events', tsStr);
    await setDoc(docRef, payload);

    console.log(`✅ Saved ECG status for device ${deviceId} at ${tsStr}`);
  } catch (error) {
    console.error('❌ Error saving status to Firestore:', error.message || error);
  }
}

// Function to determine alert level based on ECG data
function determineAlertLevel(ecgData) {
    let alertLevel = 'low';
    
    // High alert conditions
    if (ecgData.heart_rate < 40 || ecgData.heart_rate > 150) {
        alertLevel = 'high';
    } else if (ecgData.heart_rate < 50 || ecgData.heart_rate > 120) {
        alertLevel = 'medium';
    }
    
    // Check for critical QRS or QT prolongation
    if (ecgData.qrs_interval > 0.12 || ecgData.qt_interval > 0.45) {
        alertLevel = 'high';
    }
    
    return alertLevel;
}

// Function to delete ECG data from Realtime Database
function deleteECGData(timestamp) {
    const deleteUrl = `https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com/ecg_stream/ECG_001/ecg_data/${timestamp}.json`;

    fetch(deleteUrl, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log(`Data for timestamp ${timestamp} deleted successfully`);
        } else {
            console.log(`Error deleting data for timestamp ${timestamp}`);
        }
    })
    .catch(error => {
        console.error('Error deleting ECG data:', error);
    });
}

// Export functions for use in other components
export { 
    fetchECGData, 
    checkAbnormalValues, 
    saveStatusToFirestore,
    deleteECGData 
};

// Auto-start ECG monitoring when module is imported
console.log('ECG Analysis Service Started');
fetchECGData();

// Check for new ECG data every minute
setInterval(fetchECGData, 60000);
