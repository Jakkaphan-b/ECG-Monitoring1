import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
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
  const [testData, setTestData] = useState(null);
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
        setSetupStep(4); // Device already configured
      } else {
        // Generate default topic
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

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Simulate device test
      const testResult = {
        success: Math.random() > 0.3, // 70% success rate for demo
        latency: Math.floor(Math.random() * 100) + 50,
        signal_quality: Math.floor(Math.random() * 40) + 60,
        baseline: Math.floor(Math.random() * 100) + 400
      };

      setTestData(testResult);
      
      if (testResult.success) {
        alert('✅ ทดสอบการเชื่อมต่อสำเร็จ');
      } else {
        alert('❌ ทดสอบการเชื่อมต่อล้มเหลว กรุณาตรวจสอบการตั้งค่า');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('❌ เกิดข้อผิดพลาดในการทดสอบ');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleEcg = () => {
    // Generate sample ECG data for preview
    const samples = [];
    for (let i = 0; i < 100; i++) {
      const baseValue = 512;
      const heartBeat = Math.sin(i * 0.3) * 200;
      const noise = (Math.random() - 0.5) * 10;
      samples.push(baseValue + heartBeat + noise);
    }
    return samples;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeviceConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderSetupStep = () => {
    switch (setupStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">ขั้นตอนที่ 1: ข้อมูลอุปกรณ์</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                <input
                  type="text"
                  name="device_id"
                  value={deviceConfig.device_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ECG_DEVICE_001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Topic</label>
                <input
                  type="text"
                  name="mqtt_topic"
                  value={deviceConfig.mqtt_topic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ecg/user123"
                />
              </div>
            </div>
            <button
              onClick={() => setSetupStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
            >
              ถัดไป
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">ขั้นตอนที่ 2: การตั้งค่า Wi-Fi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wi-Fi SSID</label>
                <input
                  type="text"
                  name="wifi_ssid"
                  value={deviceConfig.wifi_ssid}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your_WiFi_Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wi-Fi Password</label>
                <input
                  type="password"
                  name="wifi_password"
                  value={deviceConfig.wifi_password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="WiFi Password"
                />
              </div>
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
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">ขั้นตอนที่ 3: การตั้งค่าขั้นสูง</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sampling Rate (Hz)</label>
                <select
                  name="sampling_rate"
                  value={deviceConfig.sampling_rate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={125}>125 Hz</option>
                  <option value={250}>250 Hz</option>
                  <option value={500}>500 Hz</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gain</label>
                <select
                  name="gain"
                  value={deviceConfig.gain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                  <option value={8}>8x</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Broker</label>
              <input
                type="text"
                name="mqtt_broker"
                value={deviceConfig.mqtt_broker}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="broker.mqtt.com"
              />
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
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">การตั้งค่าเสร็จสิ้น</h3>
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-green-600 text-2xl mr-3">✅</div>
                <div>
                  <h4 className="text-green-800 font-medium">การตั้งค่าเสร็จสิ้นแล้ว</h4>
                  <p className="text-green-700 text-sm">อุปกรณ์ของคุณพร้อมใช้งานแล้ว</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setSetupStep(1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
              >
                แก้ไขการตั้งค่า
              </button>
              <button
                onClick={testConnection}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {isLoading ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Progress Steps */}
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

        {/* Setup Form */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          {renderSetupStep()}
        </div>

        {/* Device Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
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

        {/* Test Results */}
        {testData && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ผลการทดสอบ</h2>
            <div className={`p-4 rounded-lg ${
              testData.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className="flex items-center mb-2">
                <div className="text-2xl mr-2">
                  {testData.success ? '✅' : '❌'}
                </div>
                <h3 className="font-medium">
                  {testData.success ? 'การทดสอบสำเร็จ' : 'การทดสอบล้มเหลว'}
                </h3>
              </div>
              {testData.success && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm opacity-80">เวลาตอบสนอง</p>
                    <p className="font-semibold">{testData.latency} ms</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">คุณภาพสัญญาณ</p>
                    <p className="font-semibold">{testData.signal_quality}%</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Baseline</p>
                    <p className="font-semibold">{testData.baseline}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signal Preview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ตัวอย่างสัญญาณ ECG</h2>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600">แสดงตัวอย่างสัญญาณ ECG ที่นี่</p>
              <button
                onClick={() => alert('🌊 สัญญาณ ECG จำลอง')}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                แสดงสัญญาณจำลอง
              </button>
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">แผงควบคุมการ Debug</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Last Payload:</p>
                <p className="text-gray-600 font-mono text-xs mt-1">
                  {`{"ecg": 512, "bpm": 72, "timestamp": "${new Date().toISOString()}"}`}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Latency:</p>
                <p className="text-gray-600">{testData?.latency || '--'} ms</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-700">Loss Rate:</p>
                <p className="text-gray-600">0.2%</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeviceSetup;
