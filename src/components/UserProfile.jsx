import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'M',
    weight: '',
    height: '',
    medical_conditions: '',
    emergency_contact: '',
    risk_level: 'medium',
    role: 'patient',
    line_notify_token: null,
    notifications_enabled: true
  });
  const [careTeam, setCareTeam] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [consentData, setConsentData] = useState({
    data_sharing: false,
    research_participation: false,
    marketing_communications: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
    loadCareTeam();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          ...data,
          email: user.email // Get email from auth
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCareTeam = async () => {
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
      console.error('Error loading care team:', error);
    }
  };

  const updateProfile = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const { email, ...profileData } = userProfile;

      await updateDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updated_at: new Date().toISOString(),
        profile_complete: true
      });

      alert('✅ อัปเดตโปรไฟล์สำเร็จ');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์');
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      alert('✅ เปลี่ยนรหัสผ่านสำเร็จ');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setupLineNotify = () => {
    // Simulate LINE Notify setup
    const token = prompt('กรุณากรอก LINE Notify Token:');
    if (token) {
      setUserProfile(prev => ({
        ...prev,
        line_notify_token: token
      }));
      alert('✅ ตั้งค่า LINE Notify สำเร็จ');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = () => {
    const weight = parseFloat(userProfile.weight);
    const height = parseFloat(userProfile.height) / 100; // Convert cm to m
    if (weight && height) {
      return (weight / (height * height)).toFixed(1);
    }
    return 0;
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
              <h1 className="inline text-2xl font-bold text-gray-900">โปรไฟล์ผู้ใช้</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {userProfile.first_name.charAt(0)}{userProfile.last_name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {userProfile.first_name} {userProfile.last_name}
              </h2>
              <p className="text-gray-600">{userProfile.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>อายุ: {calculateAge(userProfile.date_of_birth)} ปี</span>
                {userProfile.weight && userProfile.height && (
                  <span>BMI: {calculateBMI()}</span>
                )}
                <span className="capitalize">{userProfile.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'profile', name: 'ข้อมูลส่วนตัว', icon: '👤' },
                { id: 'medical', name: 'ข้อมูลทางการแพทย์', icon: '🏥' },
                { id: 'security', name: 'ความปลอดภัย', icon: '🔒' },
                { id: 'notifications', name: 'การแจ้งเตือน', icon: '🔔' },
                { id: 'care-team', name: 'ทีมผู้ดูแล', icon: '👥' },
                { id: 'privacy', name: 'ความเป็นส่วนตัว', icon: '🔐' }
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
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">ข้อมูลส่วนตัว</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    name="first_name"
                    value={userProfile.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    name="last_name"
                    value={userProfile.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={userProfile.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={userProfile.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                  <select
                    name="gender"
                    value={userProfile.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="M">ชาย</option>
                    <option value="F">หญิง</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์ฉุกเฉิน</label>
                <input
                  type="tel"
                  name="emergency_contact"
                  value={userProfile.emergency_contact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="เบอร์ติดต่อฉุกเฉิน"
                />
              </div>
              <button
                onClick={updateProfile}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">ข้อมูลทางการแพทย์</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (กก.)</label>
                  <input
                    type="number"
                    name="weight"
                    value={userProfile.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="65"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
                  <input
                    type="number"
                    name="height"
                    value={userProfile.height}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความเสี่ยง</label>
                  <select
                    name="risk_level"
                    value={userProfile.risk_level}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">ต่ำ (Low)</option>
                    <option value="medium">ปานกลาง (Medium)</option>
                    <option value="high">สูง (High)</option>
                  </select>
                </div>
              </div>
              {userProfile.weight && userProfile.height && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ดัชนีมวลกาย (BMI): <strong>{calculateBMI()}</strong>
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">โรคประจำตัว</label>
                <textarea
                  name="medical_conditions"
                  value={userProfile.medical_conditions}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ระบุโรคประจำตัว ยาที่กำลังรับประทาน หรือข้อมูลทางการแพทย์อื่นๆ"
                />
              </div>
              <button
                onClick={updateProfile}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">ความปลอดภัย</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={changePassword}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {isLoading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">การตั้งค่าการแจ้งเตือน</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">LINE Notify</h4>
                    <p className="text-sm text-gray-600">รับการแจ้งเตือนผ่าน LINE</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${userProfile.line_notify_token ? 'text-green-600' : 'text-gray-600'}`}>
                      {userProfile.line_notify_token ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                    </span>
                    <button
                      onClick={setupLineNotify}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      {userProfile.line_notify_token ? 'แก้ไข' : 'ตั้งค่า'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">การแจ้งเตือนทั้งหมด</h4>
                    <p className="text-sm text-gray-600">เปิด/ปิดการแจ้งเตือนทั้งหมด</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="notifications_enabled"
                      checked={userProfile.notifications_enabled}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={updateProfile}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            </div>
          )}

          {activeTab === 'care-team' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">ทีมผู้ดูแล</h3>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  เพิ่มผู้ดูแล
                </button>
              </div>
              {careTeam.length > 0 ? (
                <div className="space-y-4">
                  {careTeam.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{member.name}</h4>
                            <p className="text-sm text-gray-600">{member.role}</p>
                            <p className="text-sm text-gray-500">{member.phone}</p>
                          </div>
                        </div>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">👥</div>
                  <p>ยังไม่มีทีมผู้ดูแล</p>
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    เพิ่มผู้ดูแลคนแรก
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">ความเป็นส่วนตัวและการยินยอม</h3>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={consentData.data_sharing}
                      onChange={(e) => setConsentData(prev => ({
                        ...prev,
                        data_sharing: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">การแบ่งปันข้อมูลกับทีมแพทย์</h4>
                      <p className="text-sm text-gray-600">อนุญาตให้แบ่งปันข้อมูล ECG และสุขภาพกับแพทย์และผู้ดูแลที่ได้รับอนุญาต</p>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={consentData.research_participation}
                      onChange={(e) => setConsentData(prev => ({
                        ...prev,
                        research_participation: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">การมีส่วนร่วมในการวิจัย</h4>
                      <p className="text-sm text-gray-600">ยินยอมให้ใช้ข้อมูลที่ไม่ระบุตัวตนเพื่อการวิจัยและพัฒนาระบบ</p>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={consentData.marketing_communications}
                      onChange={(e) => setConsentData(prev => ({
                        ...prev,
                        marketing_communications: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">การรับข้อมูลการตลาด</h4>
                      <p className="text-sm text-gray-600">รับข้อมูลเกี่ยวกับผลิตภัณฑ์และบริการใหม่ที่เกี่ยวข้อง</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                  <div>
                    <h4 className="font-medium text-yellow-800">ข้อมูลสำคัญ</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      คุณสามารถเปลี่ยนแปลงการยินยอมได้ตลอดเวลา การเปลี่ยนแปลงจะมีผลตั้งแต่วันที่บันทึก
                    </p>
                  </div>
                </div>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium">
                บันทึกการตั้งค่า
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
