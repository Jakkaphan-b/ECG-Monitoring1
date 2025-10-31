import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ecgService } from '../../services/ecgService';
import ECGChart from '../charts/ECGChart';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [ecgData, setEcgData] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [deviceId, setDeviceId] = useState('ECG_000'); // ใช้ default device ID
  const [heartRate, setHeartRate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDeviceConfig();

    return () => {
      if (deviceId) {
        ecgService.stopListening(deviceId);
      }
    };
  }, []);

  useEffect(() => {
    if (deviceId) {
      startECGMonitoring();
    }
  }, [deviceId]);

  useEffect(() => {
    // ดึง heart_rate จาก ecgData record ล่าสุด
    if (ecgData.length > 0) {
      const lastRecord = ecgData[ecgData.length - 1];
      setHeartRate(lastRecord?.heart_rate || null);
    }
  }, [ecgData]);

  const loadDeviceConfig = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const docRef = doc(db, 'devices', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.device_id) {
          setDeviceId(data.device_id);
        } else {
          navigate('/device-setup');
        }
      } else {
        navigate('/device-setup');
      }
    } catch (error) {
      console.error('Error loading device config:', error);
      navigate('/device-setup');
    } finally {
      setIsLoading(false);
    }
  };

  const startECGMonitoring = () => {
    // ฟัง ECG data
    ecgService.startListening(deviceId, (data) => {
      setEcgData(data);
    });

    // ฟัง device status
    ecgService.listenToDeviceStatus(deviceId, (status) => {
      setDeviceStatus(status);
    });
  };

  const getConnectionStatus = () => {
    if (!deviceStatus) return { icon: '🔴', text: 'ไม่ทราบสถานะ', color: 'text-gray-500' };

    const now = Date.now();
    const lastSeen = deviceStatus.last_seen || 0;
    const timeout = 10000; // 10 วินาที (ปรับได้ตามต้องการ)

    if (now - lastSeen > timeout) {
      return { icon: '🔴', text: 'ยังไม่เชื่อมต่อ', color: 'text-red-600' };
    }

    if (deviceStatus.connected) {
      return { icon: '🟢', text: 'เชื่อมต่อแล้ว', color: 'text-green-600' };
    }

    return { icon: '🔴', text: 'ยังไม่เชื่อมต่อ', color: 'text-red-600' };
  };

  const getHeartRateStatus = () => {
    // ใช้ heart_rate จาก ecgData เท่านั้น
    const currentBpm = heartRate;

    if (!currentBpm) return { icon: '💔', text: 'ไม่พบสัญญาณ', color: 'text-gray-500' };
    if (currentBpm < 60) return { icon: '💙', text: 'ต่ำกว่าปกติ', color: 'text-blue-600' };
    if (currentBpm > 100) return { icon: '❤️', text: 'สูงกว่าปกติ', color: 'text-red-600' };
    return { icon: '💚', text: 'ปกติ', color: 'text-green-600' };
  };

  // สร้าง demo data สำหรับทดสอบ
  const generateDemoData = () => {
    const demoData = ecgService.generateDummyECGData();
    setEcgData(demoData);

    // จำลอง device status
    setDeviceStatus({
      connected: true,
      rssi: -45,
      battery: '85%',
      firmware_version: '1.0.0',
      last_seen: Date.now()
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();
  const hrStatus = getHeartRateStatus();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 ECG Dashboard
              </h1>
              <p className="text-gray-600">Device: {deviceId || 'Not configured'}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={generateDemoData}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                🧪 Demo Data
              </button>
              <button
                onClick={() => navigate('/device-setup')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ⚙️ ตั้งค่าอุปกรณ์
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">{connectionStatus.icon}</span>
              <div>
                <p className="text-sm text-gray-600">สถานะการเชื่อมต่อ</p>
                <p className={`font-semibold ${connectionStatus.color}`}>
                  {connectionStatus.text}
                </p>
              </div>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">{hrStatus.icon}</span>
              <div>
                <p className="text-sm text-gray-600">อัตราการเต้นหัวใจ</p>
                <p className={`text-2xl font-bold ${hrStatus.color}`}>
                  {heartRate || '--'}
                  {heartRate && <span className="text-sm ml-1">BPM</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Signal Quality */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">📶</span>
              <div>
                <p className="text-sm text-gray-600">คุณภาพสัญญาณ</p>
                <p className="text-2xl font-bold text-blue-600">
                  {deviceStatus?.rssi || '--'}
                  {deviceStatus?.rssi && <span className="text-sm ml-1">dBm</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Data Points */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">📈</span>
              <div>
                <p className="text-sm text-gray-600">ข้อมูลที่ได้รับ</p>
                <p className="text-2xl font-bold text-purple-600">
                  {ecgData.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ECG Chart */}
        <div className="mb-6">
          <ECGChart
            width={1000}
            height={400}
            showGrid={true}
          />
        </div>

        {/* Detailed Analysis */}
        {(heartRate) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📋 การวิเคราะห์ที่ละเอียด
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {typeof heartRate === 'object' ? heartRate.bpm : heartRate || '--'}
                </p>
                <p className="text-sm text-gray-600">BPM</p>
                {heartRate && (
                  <p className="text-xs text-green-600">จาก Realtime Database</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {heartRate?.peaks || '--'}
                </p>
                <p className="text-sm text-gray-600">R-peaks detected</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {deviceStatus?.connected ? '100' : '0'}%
                </p>
                <p className="text-sm text-gray-600">Connection Quality</p>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        {deviceStatus && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🔧 ข้อมูลอุปกรณ์
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Firmware</p>
                <p className="font-medium">{deviceStatus.firmware_version || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Battery</p>
                <p className="font-medium">{deviceStatus.battery || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Seen</p>
                <p className="font-medium">
                  {deviceStatus.last_seen
                    ? new Date(deviceStatus.last_seen * 1000).toLocaleString()
                    : 'N/A'
                  }
                </p>
              </div>
              {/* <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="font-medium">
                  {deviceStatus.last_seen ?
                    Math.round((Date.now() - deviceStatus.last_seen) / 1000) + 's ago' :
                    'N/A'
                  }
                </p>
              </div> */}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/history')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow text-left"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-lg font-semibold">ประวัติและแนวโน้ม</h3>
            <p className="text-sm opacity-90">ดูข้อมูลย้อนหลังและวิเคราะห์แนวโน้ม</p>
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-6 rounded-lg shadow text-left"
          >
            <div className="text-2xl mb-2">🔔</div>
            <h3 className="text-lg font-semibold">ศูนย์การแจ้งเตือน</h3>
            <p className="text-sm opacity-90">จัดการการแจ้งเตือนและการตั้งค่า</p>
          </button>

          <button
            onClick={() => navigate('/care')}
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow text-left"
          >
            <div className="text-2xl mb-2">👨‍⚕️</div>
            <h3 className="text-lg font-semibold">ทีมดูแลสุขภาพ</h3>
            <p className="text-sm opacity-90">เชื่อมต่อกับแพทย์และผู้ดูแล</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
