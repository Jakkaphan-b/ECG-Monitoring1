import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const CareTeam = () => {
  const [careTeam, setCareTeam] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'family',
    notifications_enabled: true,
  });
  const navigate = useNavigate();

  // ดึงทีมผู้ดูแลของผู้ใช้
  const fetchCareTeam = useCallback(async (currentUser = null) => {
    setLoading(true);
    try {
      const authUser = currentUser || auth.currentUser;
      if (!authUser) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Fetching care team for user:', authUser.uid);
      const careTeamQuery = query(
        collection(db, 'care_team'),
        where('patient_id', '==', authUser.uid)
      );

      const careTeamSnapshot = await getDocs(careTeamQuery);
      const careTeamData = careTeamSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log('Care team data loaded:', careTeamData);
      setCareTeam(careTeamData);
    } catch (error) {
      console.error('Error fetching care team:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลทีมผู้ดูแล: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ตรวจ auth แล้วโหลดข้อมูล
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchCareTeam(currentUser);
      } else {
        setLoading(false);
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchCareTeam]);

  // เพิ่มสมาชิก
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      alert('กรุณากรอกชื่อและอีเมลให้ครบถ้วน');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    if (!user) {
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    setLoading(true);
    try {
      console.log('Adding care team member:', formData);

      const docRef = await addDoc(collection(db, 'care_team'), {
        patient_id: user.uid,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        notifications_enabled: formData.notifications_enabled,
        created_at: serverTimestamp(),
        created_by: user.uid,
      });

      console.log('Care team member added with ID:', docRef.id);
      alert('✅ เพิ่มสมาชิกทีมผู้ดูแลเรียบร้อยแล้ว');

      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'family',
        notifications_enabled: true,
      });
      setShowAddForm(false);
      fetchCareTeam(user);
    } catch (error) {
      console.error('Error adding care team member:', error);
      alert('❌ เกิดข้อผิดพลาดในการเพิ่มสมาชิก: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // สลับสถานะการแจ้งเตือน
  const toggleNotifications = async (memberId, currentStatus) => {
    try {
      console.log(
        'Toggling notifications for member:',
        memberId,
        'from',
        currentStatus,
        'to',
        !currentStatus
      );

      await updateDoc(doc(db, 'care_team', memberId), {
        notifications_enabled: !currentStatus,
        updated_at: serverTimestamp(),
      });

      setCareTeam((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, notifications_enabled: !currentStatus } : m
        )
      );

      alert(currentStatus ? '🔕 ปิดการแจ้งเตือนแล้ว' : '🔔 เปิดการแจ้งเตือนแล้ว');
    } catch (error) {
      console.error('Error toggling notifications:', error);
      alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // ลบสมาชิก
  const removeMember = async (memberId, memberName) => {
    if (!confirm(`คุณต้องการลบ "${memberName}" ออกจากทีมผู้ดูแลหรือไม่?`)) {
      return;
    }
    try {
      console.log('Removing care team member:', memberId);

      await deleteDoc(doc(db, 'care_team', memberId));
      setCareTeam((prev) => prev.filter((m) => m.id !== memberId));

      alert('✅ ลบสมาชิกเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('❌ เกิดข้อผิดพลาดในการลบสมาชิก: ' + error.message);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'family':
        return 'ครอบครัว';
      case 'doctor':
        return 'แพทย์';
      case 'nurse':
        return 'พยาบาล';
      case 'caregiver':
        return 'ผู้ดูแล';
      default:
        return 'อื่นๆ';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'family':
        return 'bg-blue-100 text-blue-800';
      case 'doctor':
        return 'bg-green-100 text-green-800';
      case 'nurse':
        return 'bg-purple-100 text-purple-800';
      case 'caregiver':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Screen */}
      {loading && !user && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {user && (
        <>
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-blue-600 hover:text-blue-800 mr-4 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    กลับ
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      จัดการทีมผู้ดูแล
                    </h1>
                    <p className="text-gray-600 mt-1">เพิ่มและจัดการสมาชิกที่จะรับการแจ้งเตือนเมื่อมีภาวะฉุกเฉิน</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right mr-4">
                    <p className="text-sm text-gray-500">สมาชิกทั้งหมด</p>
                    <p className="text-2xl font-bold text-blue-600">{careTeam.length}</p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium shadow-sm flex items-center"
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    เพิ่มสมาชิก
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">สมาชิกทั้งหมด</p>
                    <p className="text-3xl font-bold text-gray-900">{careTeam.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l5.657-5.657A2 2 0 0112 .586h5.414A2 2 0 0119 2v5.414a2 2 0 01-.586 1.414L13.657 14M4.828 7L9 11.172M4.828 7L2 4.172M9 11.172L13.657 14M9 11.172L11.172 9" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">เปิดการแจ้งเตือน</p>
                    <p className="text-3xl font-bold text-green-600">
                      {careTeam.filter(m => m.notifications_enabled).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">บุคลากรทางการแพทย์</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {careTeam.filter(m => m.role === 'doctor' || m.role === 'nurse').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start">
                <div className="text-blue-600 text-3xl mr-4">💡</div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">
                    เกี่ยวกับทีมผู้ดูแล
                  </h3>
                  <div className="text-blue-800 text-sm leading-relaxed space-y-2">
                    <p>• เพิ่มสมาชิกในครอบครัว แพทย์ พยาบาล หรือผู้ดูแลที่ต้องการรับการแจ้งเตือนเมื่อมีภาวะผิดปกติ</p>
                    <p>• ระบบจะส่งการแจ้งเตือนไปยังอีเมลของสมาชิกที่เปิดใช้งานการแจ้งเตือนทันที</p>
                    <p>• สามารถจัดการสถานะการแจ้งเตือนและลบสมาชิกได้ตามต้องการ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Member Form Modal */}
            {showAddForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      เพิ่มสมาชิกใหม่
                    </h2>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อ-นามสกุล *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ระบุชื่อ-นามสกุล"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        อีเมล *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="example@email.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมายเลขโทรศัพท์
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0x-xxxx-xxxx"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        บทบาท
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="family">ครอบครัว</option>
                        <option value="doctor">แพทย์</option>
                        <option value="nurse">พยาบาล</option>
                        <option value="caregiver">ผู้ดูแล</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={formData.notifications_enabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notifications_enabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">
                        เปิดใช้งานการแจ้งเตือน
                      </label>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? 'กำลังเพิ่ม...' : 'เพิ่มสมาชิก'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Care Team List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    สมาชิกทีมผู้ดูแล
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {careTeam.length} คน
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
                </div>
              ) : careTeam.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {careTeam.map((member, index) => (
                    <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-bold text-xl">
                                {(member.name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                              member.notifications_enabled ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-xl font-semibold text-gray-900">
                                {member.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                                  member.role
                                )}`}
                              >
                                {getRoleLabel(member.role)}
                              </span>
                            </div>
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center text-gray-600">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">{member.email}</span>
                              </div>
                              {member.phone && (
                                <div className="flex items-center text-gray-600">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-sm">{member.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center mt-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                    member.notifications_enabled
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {member.notifications_enabled
                                    ? '🔔 รับการแจ้งเตือน'
                                    : '🔕 ไม่รับการแจ้งเตือน'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() =>
                              toggleNotifications(
                                member.id,
                                member.notifications_enabled
                              )
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              member.notifications_enabled
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {member.notifications_enabled
                              ? 'ปิดการแจ้งเตือน'
                              : 'เปิดการแจ้งเตือน'}
                          </button>
                          <button
                            onClick={() => removeMember(member.id, member.name)}
                            className="px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    ยังไม่มีสมาชิกในทีมผู้ดูแล
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    เริ่มต้นสร้างทีมผู้ดูแลโดยเพิ่มสมาชิกครอบครัวหรือบุคลากรทางการแพทย์เพื่อรับการแจ้งเตือนเมื่อมีภาวะฉุกเฉิน
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-medium shadow-sm flex items-center mx-auto"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    เพิ่มสมาชิกแรก
                  </button>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">วิธีการใช้งาน</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">เพิ่มสมาชิกใหม่</h4>
                      <p className="text-gray-600 text-sm">คลิก "เพิ่มสมาชิก" เพื่อเพิ่มคนในครอบครัวหรือผู้ดูแลเข้าสู่ระบบ</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">กรอกข้อมูลที่ถูกต้อง</h4>
                      <p className="text-gray-600 text-sm">กรอกข้อมูลให้ครบถ้วน โดยเฉพาะอีเมลที่ใช้งานได้จริงสำหรับรับการแจ้งเตือน</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">เลือกบทบาทที่เหมาะสม</h4>
                      <p className="text-gray-600 text-sm">ระบุบทบาทของสมาชิกเพื่อให้ระบบจัดลำดับความสำคัญของการแจ้งเตือนได้อย่างเหมาะสม</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">จัดการการแจ้งเตือน</h4>
                      <p className="text-gray-600 text-sm">สามารถเปิด/ปิดการแจ้งเตือนสำหรับแต่ละสมาชิกได้ตามความต้องการ</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-800">
                      <strong>หมายเหตุ:</strong> การแจ้งเตือนจะถูกส่งไปยังอีเมลของสมาชิกทันทีเมื่อระบบตรวจพบภาวะผิดปกติทางการแพทย์ กรุณาตรวจสอบให้แน่ใจว่าอีเมลที่ระบุนั้นถูกต้องและใช้งานได้
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default CareTeam;
