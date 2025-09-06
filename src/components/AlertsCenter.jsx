import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AlertsCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    user: 'all'
  });
  const [loading, setLoading] = useState(false);
  const [careTeam, setCareTeam] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    lineNotify: true,
    email: false,
    sms: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
    fetchCareTeam();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const alertsQuery = query(
        collection(db, 'alerts'),
        where('user_id', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const alertsSnapshot = await getDocs(alertsQuery);
      const alertsData = alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));

      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      alert('เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน');
    } finally {
      setLoading(false);
    }
  };

  const fetchCareTeam = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const careTeamQuery = query(
        collection(db, 'care_team'),
        where('patient_id', '==', user.uid)
      );

      const careTeamSnapshot = await getDocs(careTeamQuery);
      const careTeamData = careTeamSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCareTeam(careTeamData);
    } catch (error) {
      console.error('Error fetching care team:', error);
    }
  };

  const applyFilters = () => {
    let filtered = alerts;

    if (filters.type !== 'all') {
      filtered = filtered.filter(alert => alert.type === filters.type);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(alert => 
        filters.status === 'read' ? alert.read : !alert.read
      );
    }

    setFilteredAlerts(filtered);
  };

  const markAsRead = async (alertId) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        read: true,
        read_at: new Date()
      });

      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter(alert => !alert.read);
      const promises = unreadAlerts.map(alert =>
        updateDoc(doc(db, 'alerts', alert.id), {
          read: true,
          read_at: new Date()
        })
      );

      await Promise.all(promises);
      
      setAlerts(alerts.map(alert => ({ ...alert, read: true })));
      alert('✅ ทำเครื่องหมายอ่านทั้งหมดแล้ว');
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('❌ เกิดข้อผิดพลาด');
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'emergency': return 'bg-red-100 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-100 border-blue-200 text-blue-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'emergency': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'device_offline': return '📱';
      case 'heart_rate': return '💓';
      default: return '🔔';
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
              <h1 className="inline text-2xl font-bold text-gray-900">ศูนย์การแจ้งเตือน</h1>
            </div>
            <button
              onClick={markAllAsRead}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              อ่านทั้งหมด
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ตัวกรอง</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="emergency">ฉุกเฉิน</option>
                <option value="warning">คำเตือน</option>
                <option value="info">ข้อมูล</option>
                <option value="device_offline">อุปกรณ์ออฟไลน์</option>
                <option value="heart_rate">อัตราการเต้นหัวใจ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="unread">ยังไม่อ่าน</option>
                <option value="read">อ่านแล้ว</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                แสดง {filteredAlerts.length} จาก {alerts.length} รายการ
              </div>
            </div>
          </div>
        </div>

        {/* Alert Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">การแจ้งเตือนทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">ยังไม่อ่าน</p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter(alert => !alert.read).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">ฉุกเฉิน</p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter(alert => alert.type === 'emergency').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">วันนี้</p>
            <p className="text-2xl font-bold text-blue-600">
              {alerts.filter(alert => 
                new Date(alert.timestamp).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">รายการแจ้งเตือน</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลด...</p>
              </div>
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-6 border-l-4 ${getAlertColor(alert.type)} ${
                    !alert.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                          {!alert.read && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              ใหม่
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {alert.timestamp.toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          ทำเครื่องหมายว่าอ่านแล้ว
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">🔕</div>
                <p className="text-gray-600">ไม่มีการแจ้งเตือน</p>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">การตั้งค่าการแจ้งเตือน</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">LINE Notify</h3>
                <p className="text-sm text-gray-500">รับการแจ้งเตือนผ่าน LINE</p>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                ตั้งค่า
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">อีเมล</h3>
                <p className="text-sm text-gray-500">รับการแจ้งเตือนผ่านอีเมล</p>
              </div>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                เปิดใช้งาน
              </button>
            </div>
          </div>
        </div>

        {/* Care Team */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">ทีมผู้ดูแล</h2>
            <button
              onClick={() => navigate('/care-team')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              จัดการทีม
            </button>
          </div>
          {careTeam.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careTeam.map((member) => (
                <div key={member.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.role}</p>
                      <p className="text-xs text-gray-400">{member.phone}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      member.notifications_enabled ? 'bg-green-400' : 'bg-gray-400'
                    }`}></span>
                    <span className="text-gray-600">
                      {member.notifications_enabled ? 'รับการแจ้งเตือน' : 'ไม่รับการแจ้งเตือน'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-600 mb-4">ยังไม่มีทีมผู้ดูแล</p>
              <button
                onClick={() => navigate('/care-team')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                เพิ่มผู้ดูแล
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AlertsCenter;
