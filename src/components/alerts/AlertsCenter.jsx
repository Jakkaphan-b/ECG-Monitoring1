import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AlertsCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [careTeam, setCareTeam] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    user: 'all'
  });
  const [loading, setLoading] = useState(false);
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

  const notifyCareTeam = async (alert) => {
    try {
      // สร้างการแจ้งเตือนสำหรับทีมผู้ดูแลที่เปิดการแจ้งเตือน
      const notificationsPromises = careTeam
        .filter(member => member.notifications_enabled)
        .map(member => 
          addDoc(collection(db, 'care_team_notifications'), {
            care_team_member_id: member.id,
            patient_id: auth.currentUser.uid,
            alert_id: alert.id,
            type: alert.type,
            title: `แจ้งเตือนผู้ป่วย: ${alert.title}`,
            message: `ผู้ป่วยมีสถานะ ${alert.message}`,
            timestamp: new Date(),
            read: false,
            sent_via: {
              email: true,
              sms: !!member.phone
            }
          })
        );

      await Promise.all(notificationsPromises);
      console.log('Care team notified successfully');
    } catch (error) {
      console.error('Error notifying care team:', error);
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
              <h1 className="inline text-2xl font-bold text-gray-900">ศูนย์การแจ้งเตือน</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ส่วนทีมผู้ดูแล */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">ทีมผู้ดูแล</h2>
            <button
              onClick={() => navigate('/care-team')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              จัดการทีม
            </button>
          </div>
          
          {careTeam.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careTeam.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.notifications_enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.notifications_enabled ? 'แจ้งเตือนเปิด' : 'แจ้งเตือนปิด'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>📧 {member.email}</p>
                    {member.phone && <p>📱 {member.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-600 mb-4">ยังไม่มีทีมผู้ดูแล</p>
              <button
                onClick={() => navigate('/care-team')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                เพิ่มสมาชิกทีม
              </button>
            </div>
          )}
        </div>

        {/* สถิติการแจ้งเตือน */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ฉุกเฉิน</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.filter(alert => alert.type === 'emergency').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">คำเตือน</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.filter(alert => alert.type === 'warning').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ข้อมูล</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.filter(alert => alert.type === 'info').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">อ่านแล้ว</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.filter(alert => alert.read).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ตัวกรอง</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">ทั้งหมด</option>
                <option value="emergency">ฉุกเฉิน</option>
                <option value="warning">คำเตือน</option>
                <option value="info">ข้อมูล</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">รายการแจ้งเตือน</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลด...</p>
            </div>
          ) : filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'emergency'
                      ? 'border-red-500 bg-red-50'
                      : alert.type === 'warning'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                  } ${alert.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          alert.type === 'emergency'
                            ? 'bg-red-100 text-red-800'
                            : alert.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.type === 'emergency' ? 'ฉุกเฉิน' : 
                           alert.type === 'warning' ? 'คำเตือน' : 'ข้อมูล'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {alert.timestamp.toLocaleString('th-TH')}
                        </span>
                        {!alert.read && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ใหม่
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{alert.title}</h3>
                      <p className="text-gray-600 text-sm">{alert.message}</p>
                      {alert.heart_rate && (
                        <p className="text-sm text-gray-500 mt-2">
                          อัตราการเต้นหัวใจ: {alert.heart_rate} bpm
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ทำเครื่องหมายอ่านแล้ว
                        </button>
                      )}
                      {(alert.type === 'emergency' || alert.type === 'warning') && careTeam.length > 0 && (
                        <button
                          onClick={() => notifyCareTeam(alert)}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                        >
                          แจ้งทีมดูแล
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔔</div>
              <p className="text-gray-600">ไม่มีการแจ้งเตือน</p>
              <p className="text-sm text-gray-500 mt-2">การแจ้งเตือนจะปรากฏที่นี่เมื่อระบบตรวจพบความผิดปกติ</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AlertsCenter;
