import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, getDocs, orderBy, where, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AdminConsole = () => {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeDevices: 0,
    dataIngestionRate: 0,
    errorRate: 0,
    storageUsed: 0
  });
  const [globalSettings, setGlobalSettings] = useState({
    mqttBroker: 'ecg-monitor.mqtt.com',
    firebasePaths: {
      ecgData: 'ecg_data',
      users: 'users',
      devices: 'devices'
    },
    thresholds: {
      bradycardia: 60,
      tachycardia: 100,
      maxHeartRate: 200
    },
    quotas: {
      storagePerUser: 1000, // MB
      dataRetentionDays: 90
    }
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchSystemData();
  }, []);

  const checkAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        navigate('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      // Fetch users
      const usersQuery = query(collection(db, 'users'), orderBy('created_at', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      // Fetch devices
      const devicesQuery = query(collection(db, 'devices'));
      const devicesSnapshot = await getDocs(devicesQuery);
      const devicesData = devicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDevices(devicesData);

      // Calculate system stats
      const activeDevicesCount = devicesData.filter(device => 
        device.last_seen && (new Date() - new Date(device.last_seen)) < 5 * 60 * 1000
      ).length;

      setSystemStats({
        totalUsers: usersData.length,
        activeDevices: activeDevicesCount,
        dataIngestionRate: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 2,
        storageUsed: Math.floor(Math.random() * 500) + 100
      });

    } catch (error) {
      console.error('Error fetching system data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลระบบ');
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
              <h1 className="inline text-2xl font-bold text-gray-900">Admin Console</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">ผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
            <p className="text-2xl font-bold text-blue-600">{systemStats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">อุปกรณ์ที่ใช้งาน</p>
            <p className="text-2xl font-bold text-green-600">{systemStats.activeDevices}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">อัตราการรับข้อมูล</p>
            <p className="text-2xl font-bold text-yellow-600">{systemStats.dataIngestionRate}/วิ</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">อัตราข้อผิดพลาด</p>
            <p className="text-2xl font-bold text-red-600">{systemStats.errorRate.toFixed(2)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">พื้นที่ใช้</p>
            <p className="text-2xl font-bold text-purple-600">{systemStats.storageUsed} GB</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">จัดการผู้ใช้</h2>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-600">Admin Console - จัดการผู้ใช้และระบบ</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
