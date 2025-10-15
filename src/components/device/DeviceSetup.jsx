import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DeviceSetup = () => {
  const [deviceConfig, setDeviceConfig] = useState({
    device_id: '',
    wifi_ssid: '',
    wifi_password: '',
    mqtt_broker: 'ecg-monitor.mqtt.com',
    mqtt_topic: '',
    sampling_rate: 250,
    gain: 1
  });
  const [deviceStatus, setDeviceStatus] = useState({
    connected: false,
    last_seen: null,
    battery: null,
    rssi: null,
    firmware_version: null
  });
  const [setupStep, setSetupStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDeviceConfig();
    setupDeviceListener();
  }, []);

  const loadDeviceConfig = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const deviceDoc = await getDoc(doc(db, 'devices', user.uid));
      if (deviceDoc.exists()) {
        setDeviceConfig(deviceDoc.data());
        setSetupStep(4);
      } else {
        setDeviceConfig(prev => ({
          ...prev,
          mqtt_topic: `ecg/${user.uid}`,
          device_id: `ECG_${user.uid.slice(-8)}`
        }));
      }
    } catch (error) {
      console.error('Error loading device config:', error);
    }
  };

  const setupDeviceListener = () => {
    const user = auth.currentUser;
    if (!user) return;

    const deviceStatusRef = doc(db, 'device_status', user.uid);
    const unsubscribe = onSnapshot(deviceStatusRef, (doc) => {
      if (doc.exists()) {
        setDeviceStatus(doc.data());
      }
    });

    return () => unsubscribe();
  };

  const saveDeviceConfig = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(doc(db, 'devices', user.uid), {
        ...deviceConfig,
        user_id: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      alert('✅ บันทึกการตั้งค่าอุปกรณ์สำเร็จ');
      setSetupStep(4);
    } catch (error) {
      console.error('Error saving device config:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← กลับ
              </button>
              <h1 className="inline text-2xl font-bold text-gray-900">ตั้งค่าอุปกรณ์</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step <= setupStep 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step < setupStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>ข้อมูลอุปกรณ์</span>
            <span>Wi-Fi</span>
            <span>ขั้นสูง</span>
            <span>เสร็จสิ้น</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ขั้นตอนที่ {setupStep}</h3>
          
          {setupStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                <input
                  type="text"
                  value={deviceConfig.device_id}
                  onChange={(e) => setDeviceConfig(prev => ({ ...prev, device_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="ECG_DEVICE_001"
                />
              </div>
              <button
                onClick={() => setSetupStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
              >
                ถัดไป
              </button>
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wi-Fi SSID</label>
                <input
                  type="text"
                  value={deviceConfig.wifi_ssid}
                  onChange={(e) => setDeviceConfig(prev => ({ ...prev, wifi_ssid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Your_WiFi_Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wi-Fi Password</label>
                <input
                  type="password"
                  value={deviceConfig.wifi_password}
                  onChange={(e) => setDeviceConfig(prev => ({ ...prev, wifi_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="WiFi Password"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSetupStep(1)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => setSetupStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampling Rate (Hz)</label>
                <select
                  value={deviceConfig.sampling_rate}
                  onChange={(e) => setDeviceConfig(prev => ({ ...prev, sampling_rate: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={125}>125 Hz</option>
                  <option value={250}>250 Hz</option>
                  <option value={500}>500 Hz</option>
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSetupStep(2)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={saveDeviceConfig}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-md font-medium"
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </button>
              </div>
            </div>
          )}

          {setupStep === 4 && (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-green-600 text-2xl mr-3">✅</div>
                  <div>
                    <h4 className="text-green-800 font-medium">การตั้งค่าเสร็จสิ้นแล้ว</h4>
                    <p className="text-green-700 text-sm">อุปกรณ์ของคุณพร้อมใช้งานแล้ว</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSetupStep(1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
              >
                แก้ไขการตั้งค่า
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">สถานะอุปกรณ์</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">สถานะ</p>
              <div className="flex items-center mt-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  deviceStatus.connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">
                  {deviceStatus.connected ? 'เชื่อมต่อ' : 'ไม่เชื่อมต่อ'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">สัญญาณ Wi-Fi</p>
              <p className="text-lg font-semibold">
                {deviceStatus.rssi ? `${deviceStatus.rssi} dBm` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">แบตเตอรี่</p>
              <p className="text-lg font-semibold">
                {deviceStatus.battery ? `${deviceStatus.battery}%` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">เวอร์ชัน Firmware</p>
              <p className="text-lg font-semibold">
                {deviceStatus.firmware_version || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeviceSetup;
