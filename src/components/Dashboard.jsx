import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [ecgData, setEcgData] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({
    online: false,
    rssi: null,
    battery: null,
    lastUpdate: null
  });
  const [heartRate, setHeartRate] = useState({
    current: 0,
    status: 'Normal'
  });
  const [lineNotifyStatus, setLineNotifyStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setLineNotifyStatus(!!userDoc.data().line_notify_token);
        }
        
        // Set up real-time ECG data listener
        const ecgQuery = query(
          collection(db, 'ecg_data'),
          where('user_id', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const unsubscribeEcg = onSnapshot(ecgQuery, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEcgData(data);
          
          // Update heart rate and status from latest data
          if (data.length > 0) {
            const latest = data[0];
            setHeartRate({
              current: latest.heart_rate || 0,
              status: getHeartRateStatus(latest.heart_rate)
            });
            
            setDeviceStatus({
              online: (new Date() - new Date(latest.timestamp)) < 30000, // Online if data within 30 seconds
              rssi: latest.rssi,
              battery: latest.battery,
              lastUpdate: latest.timestamp
            });
          }
        });
        
        return () => unsubscribeEcg();
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const getHeartRateStatus = (bpm) => {
    if (!bpm) return 'No Data';
    if (bpm < 60) return 'Bradycardia';
    if (bpm > 100) return 'Tachycardia';
    if (bpm > 150) return 'Suspected AF';
    return 'Normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Normal': return 'text-green-600 bg-green-100';
      case 'Bradycardia': return 'text-yellow-600 bg-yellow-100';
      case 'Tachycardia': return 'text-orange-600 bg-orange-100';
      case 'Suspected AF': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const testNotification = async () => {
    // Simulate notification test
    alert('🔔 ทดสอบการแจ้งเตือนสำเร็จ! (จำลอง)');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ECG Monitor Dashboard</h1>
              <p className="text-sm text-gray-600">
                สวัสดี, {userData.first_name} {userData.last_name} ({userData.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                โปรไฟล์
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>/*}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Device Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${deviceStatus.online ? 'bg-green-500' : 'bg-red-500'} mr-3`}></div>
              <div>
                <p className="text-sm font-medium text-gray-600">สถานะอุปกรณ์</p>
                <p className="text-lg font-semibold text-gray-900">
                  {deviceStatus.online ? 'Online' : 'Offline'}
                </p>
                {deviceStatus.rssi && (
                  <p className="text-xs text-gray-500">RSSI: {deviceStatus.rssi} dBm</p>
                )}
                {deviceStatus.battery && (
                  <p className="text-xs text-gray-500">แบต: {deviceStatus.battery}%</p>
                )}
              </div>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">อัตราการเต้นหัวใจ</p>
              <p className="text-2xl font-bold text-gray-900">{heartRate.current} BPM</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(heartRate.status)}`}>
                {heartRate.status}
              </span>
            </div>
          </div>

          {/* LINE Notify Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">LINE Notify</p>
              <p className="text-lg font-semibold text-gray-900">
                {lineNotifyStatus ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
              </p>
              <button
                onClick={testNotification}
                className="mt-2 text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
              >
                ทดสอบแจ้งเตือน
              </button>
            </div>
          </div>

          {/* Last Update */}
          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">ข้อมูลล่าสุด</p>
              <p className="text-lg font-semibold text-gray-900">
                {deviceStatus.lastUpdate ? 
                  new Date(deviceStatus.lastUpdate).toLocaleTimeString('th-TH') : 
                  'ไม่มีข้อมูล'
                }
              </p>
            </div>
          </div>
        </div>

        {/* ECG Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">กราฟ ECG แบบเรียลไทม์</h2>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <p className="text-gray-600">กราฟ ECG จะแสดงที่นี่</p>
              <p className="text-sm text-gray-500 mt-2">
                {ecgData.length > 0 ? `มีข้อมูล ${ecgData.length} จุด` : 'ยังไม่มีข้อมูล ECG'}
              </p>
            </div>
          </div>
        </div>

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
            onClick={() => navigate('/device-setup')}
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow text-left"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="text-lg font-semibold">ตั้งค่าอุปกรณ์</h3>
            <p className="text-sm opacity-90">จับคู่และตั้งค่า ESP32 + AD8232</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
