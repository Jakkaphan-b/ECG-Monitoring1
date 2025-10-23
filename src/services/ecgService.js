import { ref, onValue, off, get } from 'firebase/database';
import { rtdb } from '../firebase';

export class ECGService {
  constructor() {
    this.listeners = new Map();
    this.ecgData = [];
    this.maxDataPoints = 2500; // 10 seconds at 250Hz
  }

  // เริ่มต้นการฟัง ECG data
  startListening(deviceId, callback) {
    const chunksRef = ref(rtdb, `ecg_stream/${deviceId}/chunks`);
    
    const unsubscribe = onValue(chunksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.processECGData(data);
        callback(this.ecgData);
      }
    });

    this.listeners.set(deviceId, unsubscribe);
    return unsubscribe;
  }

  // หยุดการฟัง
  stopListening(deviceId) {
    const unsubscribe = this.listeners.get(deviceId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(deviceId);
    }
  }

  // ประมวลผลข้อมูล ECG
  processECGData(data) {
    if (data && data.values && Array.isArray(data.values)) {
      // แปลงค่า ADC เป็น voltage (0-4095 -> 0-3.3V)
      const voltageData = data.values.map((value, index) => ({
        x: Date.now() + (index * (1000 / (data.sampleRate || 250))),
        y: this.adcToVoltage(value)
      }));

      // เพิ่มข้อมูลใหม่
      this.ecgData = [...this.ecgData, ...voltageData];

      // จำกัดขนาดข้อมูล
      if (this.ecgData.length > this.maxDataPoints) {
        this.ecgData = this.ecgData.slice(-this.maxDataPoints);
      }
    }
  }

  // แปลง ADC เป็น voltage
  adcToVoltage(adcValue) {
    return (adcValue / 4095) * 3.3;
  }

  // ดึงข้อมูลสถานะอุปกรณ์
  async getDeviceStatus(deviceId) {
    try {
      const statusRef = ref(rtdb, `ecg_stream/${deviceId}/status`);
      const snapshot = await get(statusRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Error getting device status:', error);
      return null;
    }
  }

  // ฟัง real-time status
  listenToDeviceStatus(deviceId, callback) {
    const statusRef = ref(rtdb, `ecg_stream/${deviceId}/status`);
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.exists() ? snapshot.val() : null;
      callback(status);
    });

    return unsubscribe;
  }

  // วิเคราะห์ heart rate
  analyzeHeartRate(data, windowSize = 1250) { // 5 seconds at 250Hz
    if (!data || data.length < windowSize) return null;

    const recentData = data.slice(-windowSize);
    const peaks = this.findPeaks(recentData);
    
    if (peaks.length < 2) return null;

    // คำนวณ RR intervals
    const rrIntervals = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i].x - peaks[i-1].x;
      rrIntervals.push(interval);
    }

    if (rrIntervals.length === 0) return null;

    // คำนวณ BPM
    const avgRRInterval = rrIntervals.reduce((sum, interval) => sum + interval, 0) / rrIntervals.length;
    const bpm = Math.round(60000 / avgRRInterval); // ms to minutes

    return {
      bpm,
      rrIntervals,
      peaks: peaks.length,
      confidence: this.calculateConfidence(rrIntervals)
    };
  }

  // หา peaks ใน ECG signal
  findPeaks(data, threshold = 0.5, minDistance = 50) {
    const peaks = [];
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
      const current = data[i].y;
      let isPeak = true;

      // ตรวจสอบว่าเป็น local maximum
      for (let j = i - minDistance; j <= i + minDistance; j++) {
        if (j !== i && data[j].y >= current) {
          isPeak = false;
          break;
        }
      }

      // ตรวจสอบ threshold
      if (isPeak && current > threshold) {
        peaks.push(data[i]);
      }
    }

    return peaks;
  }

  // คำนวณความมั่นใจของการวัด
  calculateConfidence(rrIntervals) {
    if (rrIntervals.length < 2) return 0;

    const mean = rrIntervals.reduce((sum, val) => sum + val, 0) / rrIntervals.length;
    const variance = rrIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rrIntervals.length;
    const stdDev = Math.sqrt(variance);
    
    // ยิ่ง standard deviation น้อย ยิ่งมั่นใจมาก
    const coefficient = stdDev / mean;
    return Math.max(0, Math.min(100, 100 - (coefficient * 200)));
  }

  // ล้างข้อมูล
  clearData() {
    this.ecgData = [];
  }

  // สร้าง dummy data สำหรับทดสอบ
  generateDummyECGData() {
    const sampleRate = 250; // Hz
    const duration = 10; // seconds
    const samples = sampleRate * duration;
    const data = [];
    
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      
      // สร้างคลื่น ECG แบบจำลอง
      let ecgValue = 0;
      
      // P wave
      if (t % 1 >= 0.1 && t % 1 <= 0.2) {
        ecgValue += 0.1 * Math.sin(Math.PI * (t % 1 - 0.1) / 0.1);
      }
      
      // QRS complex
      if (t % 1 >= 0.3 && t % 1 <= 0.4) {
        const qrsPhase = (t % 1 - 0.3) / 0.1;
        if (qrsPhase < 0.3) {
          ecgValue -= 0.2 * Math.sin(Math.PI * qrsPhase / 0.3); // Q wave
        } else if (qrsPhase < 0.7) {
          ecgValue += 1.0 * Math.sin(Math.PI * (qrsPhase - 0.3) / 0.4); // R wave
        } else {
          ecgValue -= 0.3 * Math.sin(Math.PI * (qrsPhase - 0.7) / 0.3); // S wave
        }
      }
      
      // T wave
      if (t % 1 >= 0.5 && t % 1 <= 0.7) {
        ecgValue += 0.3 * Math.sin(Math.PI * (t % 1 - 0.5) / 0.2);
      }
      
      // แปลงเป็น ADC value และเพิ่ม noise
      const noise = (Math.random() - 0.5) * 0.05;
      const voltage = 1.65 + ecgValue + noise; // center around 1.65V
      const adcValue = Math.round((voltage / 3.3) * 4095);
      
      data.push({
        x: Date.now() + (i * (1000 / sampleRate)),
        y: voltage
      });
    }
    
    this.ecgData = data;
    return data;
  }
}

export const ecgService = new ECGService();