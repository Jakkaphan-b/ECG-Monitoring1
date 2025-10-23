import React, { useState, useEffect } from 'react';
import { auth, db, rtdb } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, onValue, off, set, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const DeviceSetup = () => {
  const [deviceId, setDeviceId] = useState('');
  const [wifiConfig, setWifiConfig] = useState({
    ssid: '',
    password: ''
  });
  const [deviceStatus, setDeviceStatus] = useState({
    connected: false,
    last_seen: null,
    battery: null,
    rssi: null,
    firmware_version: null,
    wifi_status: 'disconnected'
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const scanForDevices = async () => {
    setIsLoading(true);
    try {
      const devicesRef = ref(rtdb, 'ecg_stream');
      const snapshot = await get(devicesRef);
      
      if (snapshot.exists()) {
        const devices = [];
        snapshot.forEach((child) => {
          const deviceId = child.key;
          const status = child.val().status;
          if (status && status.connected) {
            devices.push({
              id: deviceId,
              status: status,
              lastSeen: status.last_seen
            });
          }
        });
        setAvailableDevices(devices);
      }
    } catch (error) {
      console.error('Error scanning devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedConfig = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'devices', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.device_id) {
          setDeviceId(data.device_id);
          setCurrentStep(2);
          checkDeviceConnection(data.device_id);
        }
        if (data.wifi_config) {
          setWifiConfig(data.wifi_config);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const checkDeviceConnection = (deviceId) => {
    if (!deviceId) return;

    const deviceStatusRef = ref(rtdb, `ecg_stream/${deviceId}/status`);
    
    const unsubscribe = onValue(deviceStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDeviceStatus({
          connected: data.connected || false,
          last_seen: data.last_seen,
          battery: data.battery,
          rssi: data.rssi,
          firmware_version: data.firmware_version,
          wifi_status: data.wifi_status || 'unknown'
        });

        // ถ้าเชื่อมต่อสำเร็จแล้ว ไป step 3
        if (data.connected && data.wifi_status === 'connected') {
          setCurrentStep(3);
        }
      } else {
        setDeviceStatus(prev => ({ 
          ...prev, 
          connected: false,
          wifi_status: 'disconnected'
        }));
      }
    });

    return () => off(deviceStatusRef, 'value', unsubscribe);
  };

  const saveDeviceId = async () => {
    if (!deviceId.trim()) {
      alert('กรุณาใส่ Device ID');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    
    try {
      const docRef = doc(db, 'devices', user.uid);
      await setDoc(docRef, { device_id: deviceId }, { merge: true });
      
      setCurrentStep(2);
      alert('บันทึก Device ID เรียบร้อย');
    } catch (error) {
      console.error('Error saving device ID:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  const sendWifiConfig = async () => {
    if (!wifiConfig.ssid.trim()) {
      alert('กรุณาใส่ชื่อ WiFi');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    
    try {
      // บันทึกใน Firestore
      const docRef = doc(db, 'devices', user.uid);
      await setDoc(docRef, { 
        device_id: deviceId,
        wifi_config: wifiConfig 
      }, { merge: true });

      // ส่งคำสั่งไปยัง ESP32 ผ่าน Realtime Database
      const wifiConfigRef = ref(rtdb, `ecg_stream/${deviceId}/wifi_config`);
      await set(wifiConfigRef, {
        ssid: wifiConfig.ssid,
        password: wifiConfig.password,
        timestamp: Date.now(),
        status: 'pending'
      });

      // เริ่มตรวจสอบการเชื่อมต่อ
      checkDeviceConnection(deviceId);
      
      alert('ส่งการตั้งค่า WiFi ไปยังอุปกรณ์แล้ว กำลังรอการเชื่อมต่อ...');
    } catch (error) {
      console.error('Error sending WiFi config:', error);
      alert('เกิดข้อผิดพลาดในการส่งการตั้งค่า');
    } finally {
      setIsLoading(false);
    }
  };

  const getWifiStatusIcon = () => {
    switch (deviceStatus.wifi_status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'failed': return '🔴';
      default: return '⚪';
    }
  };

  const getWifiStatusText = () => {
    switch (deviceStatus.wifi_status) {
      case 'connected': return 'เชื่อมต่อ WiFi สำเร็จ';
      case 'connecting': return 'กำลังเชื่อมต่อ WiFi...';
      case 'failed': return 'เชื่อมต่อ WiFi ไม่สำเร็จ';
      default: return 'ยังไม่ได้เชื่อมต่อ WiFi';
    }
  };

  const renderInstructions = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
        📋 วิธีการเชื่อมต่ออุปกรณ์
        <button 
          onClick={() => setShowInstructions(!showInstructions)}
          className="ml-auto text-blue-600"
        >
          {showInstructions ? '🔼' : '🔽'}
        </button>
      </h3>
      
      {showInstructions && (
        <div className="space-y-4 text-blue-700">
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
            <div>
              <p className="font-medium">เปิดอุปกรณ์ ECG Monitor</p>
              <p className="text-sm">เสียบสาย USB หรือใช้แบตเตอรี่</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
            <div>
              <p className="font-medium">เชื่อมต่อ WiFi ชั่วคราว</p>
              <p className="text-sm">หา WiFi ชื่อ "ECG_Device" แล้วเชื่อมต่อ</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
            <div>
              <p className="font-medium">ดู Device ID</p>
              <p className="text-sm">เปิดเบราว์เซอร์ไป 192.168.4.1 เพื่อดู Device ID</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">4</span>
            <div>
              <p className="font-medium">กลับมาหน้านี้</p>
              <p className="text-sm">ใส่ Device ID และตั้งค่า WiFi หลัก</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔗 ตั้งค่าอุปกรณ์ ECG Monitor
          </h1>

          {renderInstructions()}

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              {/* Step 1 */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className="text-sm ml-2 mr-4">Device ID</div>
              
              {/* Separator */}
              <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              
              {/* Step 2 */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ml-4 ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className="text-sm ml-2 mr-4">WiFi Setup</div>
              
              {/* Separator */}
              <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              
              {/* Step 3 */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ml-4 ${
                currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <div className="text-sm ml-2">Connected</div>
            </div>
          </div>

          {/* Step 1: Device ID */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  📱 ขั้นตอนที่ 1: ระบุ Device ID
                </h3>
                <p className="text-blue-700">
                  ใส่ Device ID ที่แสดงบนหน้าจออุปกรณ์ของคุณ
                </p>
              </div>

              {/* Auto-detect section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">🔍 อุปกรณ์ที่พบ</h4>
                  <button
                    onClick={scanForDevices}
                    disabled={isLoading}
                    className="px-4 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                  >
                    สแกนหาอุปกรณ์
                  </button>
                </div>
                
                {availableDevices.length > 0 ? (
                  <div className="space-y-2">
                    {availableDevices.map((device) => (
                      <div 
                        key={device.id}
                        onClick={() => setDeviceId(device.id)}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                      >
                        <div>
                          <span className="font-medium">{device.id}</span>
                          <span className="ml-2 text-green-600">🟢 ออนไลน์</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          Signal: {device.status.rssi} dBm
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    ไม่พบอุปกรณ์ที่เชื่อมต่ออยู่
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                  placeholder="ECG_001"
                />
                <p className="text-sm text-gray-500 mt-2">
                  💡 ตัวอย่าง: ECG_001, ECG_002, ECG_ABC123
                </p>
              </div>

              <button
                onClick={saveDeviceId}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'กำลังบันทึก...' : 'ถัดไป: ตั้งค่า WiFi'}
              </button>
            </div>
          )}

          {/* Step 2: WiFi Setup */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  � ขั้นตอนที่ 2: ตั้งค่า WiFi
                </h3>
                <p className="text-orange-700">
                  ใส่ข้อมูล WiFi เพื่อให้อุปกรณ์เชื่อมต่ออินเทอร์เน็ต
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ WiFi (SSID)
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={wifiConfig.ssid}
                  onChange={(e) => setWifiConfig(prev => ({ ...prev, ssid: e.target.value }))}
                  placeholder="ชื่อ WiFi ของคุณ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน WiFi
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={wifiConfig.password}
                  onChange={(e) => setWifiConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="รหัสผ่าน WiFi"
                />
              </div>

              {/* WiFi Status */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getWifiStatusIcon()}</span>
                    <span className="font-medium">{getWifiStatusText()}</span>
                  </div>
                  {deviceStatus.rssi && (
                    <span className="text-sm text-gray-600">
                      {deviceStatus.rssi} dBm
                    </span>
                  )}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={sendWifiConfig}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'กำลังส่งการตั้งค่า...' : 'เชื่อมต่อ WiFi'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connected */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✅ เชื่อมต่อสำเร็จ!
                </h3>
                <p className="text-green-700">
                  อุปกรณ์เชื่อมต่อกับระบบเรียบร้อยแล้ว
                </p>
              </div>

              {/* Device Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium">เชื่อมต่อแล้ว</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-blue-600">
                    {deviceStatus.rssi || '--'}
                  </div>
                  <div className="text-sm text-gray-600">Signal (dBm)</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-purple-600">
                    {deviceStatus.battery || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Battery</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-orange-600">
                    {deviceStatus.firmware_version || '--'}
                  </div>
                  <div className="text-sm text-gray-600">Firmware</div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  แก้ไขการตั้งค่า
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ไปดูข้อมูล ECG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceSetup;