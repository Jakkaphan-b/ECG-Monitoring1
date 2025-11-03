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

  // ฟังก์ชันสร้างข้อความแจ้งเตือนตามข้อมูล ECG
  const generateAlertMessage = (data) => {
    const { abnormalities, ecg_data, alert_level } = data;

    if (!abnormalities || abnormalities.length === 0) {
      return `ECG ผิดปกติ - Heart Rate: ${ecg_data?.heart_rate} BPM`;
    }

    const messages = [];

    if (abnormalities.includes('bradycardia')) {
      messages.push(`อัตราการเต้นหัวใจช้า (${ecg_data?.heart_rate} BPM)`);
    }
    if (abnormalities.includes('tachycardia')) {
      messages.push(`อัตราการเต้นหัวใจเร็ว (${ecg_data?.heart_rate} BPM)`);
    }
    if (abnormalities.includes('high_qrs_amplitude')) {
      messages.push('QRS Amplitude สูงผิดปกติ');
    }
    if (abnormalities.includes('t_wave_inversion')) {
      messages.push('T-wave กลับด้าน');
    }
    if (abnormalities.includes('pr_interval_prolonged')) {
      messages.push('PR Interval ยาวผิดปกติ');
    }
    if (abnormalities.includes('qt_interval_prolonged')) {
      messages.push('QT Interval ยาวผิดปกติ');
    }

    return messages.join(', ');
  };

  useEffect(() => {
    fetchAlerts();
    fetchCareTeam();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  // ฟังก์ชันดึง deviceId ที่ user เป็นเจ้าของ
  const getUserDeviceIds = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(collection(db, "devices"), where("user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      // เปลี่ยนจาก doc.id เป็น doc.data().device_id
      return snapshot.docs.map(doc => doc.data().device_id);
    } catch (error) {
      console.error("Error fetching user devices:", error);
      return [];
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // ดึง deviceId ที่ user เป็นเจ้าของ
      const deviceIds = await getUserDeviceIds();
      let allAlerts = [];

      for (const deviceId of deviceIds) {
        // Query ที่ path ใหม่: ecg_status/{uid}/{device_id}
        const eventsCol = collection(db, 'ecg_status', user.uid, deviceId);
        const eventsQuery = query(eventsCol, orderBy('created_at', 'desc'));
        const eventsSnapshot = await getDocs(eventsQuery);

        const alertsData = eventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: 'ecg_abnormal', // เนื่องจากข้อมูลใน ecg_status เป็นผิดปกติทั้งหมด
            message: generateAlertMessage(data),
            timestamp: data.created_at?.toDate() || new Date(),
            severity: data.alert_level || 'medium',
            read: data.read === true, // ใช้ค่าจาก Firestore
            device_id: data.device_id || deviceId,
            status: data.read === true ? 'read' : 'unread' // อิงจาก read จริง
          };
        });

        allAlerts = allAlerts.concat(alertsData);
      }

      // รวมและ sort ตามเวลา
      allAlerts.sort((a, b) => b.timestamp - a.timestamp);
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error fetching ECG alerts:', error);
      alert('เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน ECG');
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
      if (filters.type === 'ecg') {
        filtered = filtered.filter(alert => alert.type?.includes('ecg'));
      } else if (filters.type === 'high_severity') {
        filtered = filtered.filter(alert => alert.severity === 'high');
      } else if (filters.type === 'medium_severity') {
        filtered = filtered.filter(alert => alert.severity === 'medium');
      } else {
        filtered = filtered.filter(alert => alert.type === filters.type);
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(alert =>
        filters.status === 'read' ? alert.read : !alert.read
      );
    }

    setFilteredAlerts(filtered);
  };

  const markAsRead = async (alertId, deviceId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // อัปเดตใน ecg_status/{uid}/{deviceId}/{alertId}
      await updateDoc(doc(db, 'ecg_status', user.uid, deviceId, alertId), {
        read: true,
        read_at: new Date()
      });

      setAlerts(alerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true, status: 'read' } : alert
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${member.notifications_enabled
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ฉุกเฉิน</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.filter(alert => alert.severity === 'high').length}
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
                  {alerts.filter(alert => alert.severity === 'medium').length}
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
                  {alerts.filter(alert => alert.severity === 'low').length}
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
                <option value="ecg">ECG ผิดปกติ</option>
                <option value="high_severity">ฉุกเฉิน</option>
                <option value="medium_severity">คำเตือน</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">ทั้งหมด</option>
                <option value="read">อ่านแล้ว</option>
                <option value="unread">ยังไม่อ่าน</option>
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
                  className={`p-4 rounded-lg border-l-4 ${alert.severity === 'high'
                      ? 'border-red-500 bg-red-50'
                      : alert.severity === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    } ${alert.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${alert.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : alert.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                          {alert.severity === 'high' ? 'ฉุกเฉิน' :
                            alert.severity === 'medium' ? 'คำเตือน' : 'ปกติ'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {alert.device_id}
                        </span>
                        {!alert.read && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ใหม่
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">การแจ้งเตือน ECG</h3>
                      <p className="text-gray-600 text-sm">{alert.message}</p>
                      {alert.ecg_data?.heart_rate && (
                        <div className="mt-2 text-sm text-gray-500">
                          <p>💓 อัตราการเต้นหัวใจ: {alert.ecg_data.heart_rate} BPM</p>
                          {alert.abnormalities && alert.abnormalities.length > 0 && (
                            <p>⚠️ อาการ: {alert.abnormalities.join(', ')}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {alert.timestamp.toLocaleString('th-TH')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert.id, alert.device_id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ทำเครื่องหมายอ่านแล้ว
                        </button>
                      )}
                      {(alert.severity === 'high' || alert.severity === 'medium') && careTeam.length > 0 && (
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
