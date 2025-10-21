import React, { useState, useEffect } from 'react';
import { auth, db, rtdb } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

const DeviceSetup = () => {
  const [deviceId, setDeviceId] = useState('');
  const [deviceStatus, setDeviceStatus] = useState({
    connected: false,
    last_seen: null,
    battery: null,
    rssi: null,
    firmware_version: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedDeviceId();
  }, []);

  const loadSavedDeviceId = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'devices', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.device_id) {
          setDeviceId(data.device_id);
          checkDeviceConnection(data.device_id);
        }
      }
    } catch (error) {
      console.error('Error loading device ID:', error);
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
          firmware_version: data.firmware_version
        });
        setIsConnected(data.connected || false);
      } else {
        setDeviceStatus(prev => ({ ...prev, connected: false }));
        setIsConnected(false);
      }
    });

    return () => off(deviceStatusRef, 'value', unsubscribe);
  };

  const connectDevice = async () => {
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
      
      checkDeviceConnection(deviceId);
      
      alert('บันทึก Device ID เรียบร้อย กำลังตรวจสอบการเชื่อมต่อ...');
    } catch (error) {
      console.error('Error saving device ID:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔗 เชื่อมต่ออุปกรณ์ ECG Monitor
          </h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device ID
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                placeholder="ECG_001"
                disabled={isConnected}
              />
              <button
                onClick={connectDevice}
                disabled={isLoading || isConnected}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'กำลังเชื่อมต่อ...' : isConnected ? 'เชื่อมต่อแล้ว' : 'เชื่อมต่อ'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 ใส่ Device ID ที่แสดงบนหน้าจออุปกรณ์ เช่น ECG_001, ECG_002
            </p>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะการเชื่อมต่อ</h3>
            
            <div className="flex items-center justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${
                isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {isConnected ? '✅' : '❌'}
              </div>
            </div>

            <div className="text-center mb-6">
              <h4 className={`text-xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'เชื่อมต่อสำเร็จ' : 'ไม่ได้เชื่อมต่อ'}
              </h4>
              <p className="text-gray-600 mt-1">
                {isConnected ? 'อุปกรณ์ออนไลน์และพร้อมส่งข้อมูล' : 'ตรวจสอบว่าอุปกรณ์เปิดและเชื่อมต่อ WiFi'}
              </p>
            </div>

            {deviceId && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-blue-600">
                    {deviceStatus.rssi || '--'}
                  </div>
                  <div className="text-sm text-gray-600">Signal (dBm)</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-purple-600">
                    {deviceStatus.battery || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Battery</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-orange-600">
                    {deviceStatus.firmware_version || '--'}
                  </div>
                  <div className="text-sm text-gray-600">Firmware</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-gray-600">
                    {deviceId}
                  </div>
                  <div className="text-sm text-gray-600">Device ID</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📋 คำแนะนำ</h4>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>ตรวจสอบว่าอุปกรณ์ ECG เปิดอยู่</li>
              <li>ตรวจสอบการเชื่อมต่อ WiFi ของอุปกรณ์</li>
              <li>ใส่ Device ID ที่แสดงบนหน้าจออุปกรณ์</li>
              <li>กดปุ่ม "เชื่อมต่อ" และรอสักครู่</li>
            </ol>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              กลับไป Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              disabled={!isConnected}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnected ? 'ดูข้อมูล ECG' : 'รอการเชื่อมต่อ...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSetup;