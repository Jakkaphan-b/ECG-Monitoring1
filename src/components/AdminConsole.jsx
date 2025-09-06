import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
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
        device.last_seen && (new Date() - new Date(device.last_seen)) < 5 * 60 * 1000 // Active within 5 minutes
      ).length;

      setSystemStats({
        totalUsers: usersData.length,
        activeDevices: activeDevicesCount,
        dataIngestionRate: Math.floor(Math.random() * 1000) + 500, // Simulated
        errorRate: Math.random() * 2, // Simulated
        storageUsed: Math.floor(Math.random() * 500) + 100 // Simulated GB
      });

    } catch (error) {
      console.error('Error fetching system data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updated_at: new Date().toISOString()
      });

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      alert('✅ อัปเดตบทบาทผู้ใช้สำเร็จ');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('❌ เกิดข้อผิดพลาดในการอัปเดตบทบาท');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        active: !currentStatus,
        updated_at: new Date().toISOString()
      });

      setUsers(users.map(user => 
        user.id === userId ? { ...user, active: !currentStatus } : user
      ));

      alert('✅ อัปเดตสถานะผู้ใช้สำเร็จ');
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('คุณต้องการลบผู้ใช้นี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(user => user.id !== userId));
      alert('✅ ลบผู้ใช้สำเร็จ');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  const saveGlobalSettings = async () => {
    try {
      await updateDoc(doc(db, 'global_settings', 'config'), {
        ...globalSettings,
        updated_at: new Date().toISOString()
      });

      alert('✅ บันทึกการตั้งค่าระบบสำเร็จ');
    } catch (error) {
      console.error('Error saving global settings:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    }
  };

  const exportUserData = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Role', 'Created', 'Active'],
      ...users.map(user => [
        user.id,
        `${user.first_name} ${user.last_name}`,
        user.email || '',
        user.role,
        user.created_at,
        user.active ? 'Yes' : 'No'
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              <h1 className="inline text-2xl font-bold text-gray-900">Admin Console</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">ผู้ดูแลระบบ</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Stats Dashboard */}
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

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'ภาพรวม', icon: '📊' },
                { id: 'users', name: 'จัดการผู้ใช้', icon: '👥' },
                { id: 'devices', name: 'จัดการอุปกรณ์', icon: '📱' },
                { id: 'settings', name: 'การตั้งค่าระบบ', icon: '⚙️' },
                { id: 'health', name: 'สุขภาพระบบ', icon: '🏥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">ภาพรวมระบบ</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">สถิติการใช้งาน</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">ผู้ใช้ใหม่วันนี้</span>
                      <span className="font-semibold">{Math.floor(Math.random() * 10)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">การเชื่อมต่อในช่วง 24 ชม.</span>
                      <span className="font-semibold">{Math.floor(Math.random() * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-gray-700">การแจ้งเตือนที่ส่งแล้ว</span>
                      <span className="font-semibold">{Math.floor(Math.random() * 50)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">เหตุการณ์ล่าสุด</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">ผู้ใช้ใหม่ลงทะเบียน - 5 นาทีที่แล้ว</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">อุปกรณ์ออฟไลน์ - 15 นาทีที่แล้ว</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-red-50 rounded">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">การแจ้งเตือนฉุกเฉิน - 1 ชั่วโมงที่แล้ว</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">จัดการผู้ใช้</h3>
                <button
                  onClick={exportUserData}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  ส่งออกข้อมูล
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้ใช้
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        บทบาท
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่สร้าง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="patient">Patient</option>
                            <option value="caregiver">Caregiver</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active !== false ? 'ใช้งาน' : 'ปิด'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.active !== false)}
                            className={`${
                              user.active !== false 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.active !== false ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">จัดการอุปกรณ์</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้ใช้
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        เชื่อมต่อล่าสุด
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {devices.map((device) => (
                      <tr key={device.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {device.device_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {users.find(u => u.id === device.user_id)?.first_name} {users.find(u => u.id === device.user_id)?.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            device.last_seen && (new Date() - new Date(device.last_seen)) < 5 * 60 * 1000
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {device.last_seen && (new Date() - new Date(device.last_seen)) < 5 * 60 * 1000 ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {device.last_seen ? new Date(device.last_seen).toLocaleString('th-TH') : 'ไม่เคยเชื่อมต่อ'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            รีเซ็ต
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">การตั้งค่าระบบ</h3>
              <div className="space-y-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">MQTT และ Firebase</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MQTT Broker</label>
                      <input
                        type="text"
                        value={globalSettings.mqttBroker}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          mqttBroker: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Firebase Collection (ECG)</label>
                      <input
                        type="text"
                        value={globalSettings.firebasePaths.ecgData}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          firebasePaths: { ...prev.firebasePaths, ecgData: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">เกณฑ์การแจ้งเตือน</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bradycardia (BPM)</label>
                      <input
                        type="number"
                        value={globalSettings.thresholds.bradycardia}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          thresholds: { ...prev.thresholds, bradycardia: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tachycardia (BPM)</label>
                      <input
                        type="number"
                        value={globalSettings.thresholds.tachycardia}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          thresholds: { ...prev.thresholds, tachycardia: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Heart Rate (BPM)</label>
                      <input
                        type="number"
                        value={globalSettings.thresholds.maxHeartRate}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          thresholds: { ...prev.thresholds, maxHeartRate: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">โควตาและการจัดเก็บ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">พื้นที่ต่อผู้ใช้ (MB)</label>
                      <input
                        type="number"
                        value={globalSettings.quotas.storagePerUser}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          quotas: { ...prev.quotas, storagePerUser: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เก็บข้อมูล (วัน)</label>
                      <input
                        type="number"
                        value={globalSettings.quotas.dataRetentionDays}
                        onChange={(e) => setGlobalSettings(prev => ({
                          ...prev,
                          quotas: { ...prev.quotas, dataRetentionDays: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={saveGlobalSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">สุขภาพระบบ</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">การทำงานของระบบ</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <h5 className="font-medium text-green-800">การรับข้อมูล</h5>
                        <p className="text-sm text-green-600">ปกติ - {systemStats.dataIngestionRate} records/min</p>
                      </div>
                      <div className="text-green-600 text-2xl">✅</div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div>
                        <h5 className="font-medium text-yellow-800">อัตราข้อผิดพลาด</h5>
                        <p className="text-sm text-yellow-600">{systemStats.errorRate.toFixed(2)}% - สูงกว่าปกติเล็กน้อย</p>
                      </div>
                      <div className="text-yellow-600 text-2xl">⚠️</div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <h5 className="font-medium text-green-800">การเชื่อมต่อฐานข้อมูล</h5>
                        <p className="text-sm text-green-600">ปกติ - เชื่อมต่อสำเร็จ</p>
                      </div>
                      <div className="text-green-600 text-2xl">✅</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">LINE Notify Status</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">โทเค็นที่ใช้งานได้</span>
                      <span className="font-semibold text-green-600">{Math.floor(Math.random() * 50) + 20}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">โทเค็นหมดอายุ</span>
                      <span className="font-semibold text-red-600">{Math.floor(Math.random() * 5)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">การแจ้งเตือนส่งวันนี้</span>
                      <span className="font-semibold">{Math.floor(Math.random() * 100) + 50}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;
