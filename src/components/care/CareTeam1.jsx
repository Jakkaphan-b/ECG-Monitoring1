import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
    notifications_enabled: true
  });
  const navigate = useNavigate();

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
  }, [navigate]);

  const fetchCareTeam = async (currentUser = null) => {
    setLoading(true);
    try {
      const authUser = currentUser || auth.currentUser;
      if (!authUser) {
        setLoading(false);
        return;
      }

      const careTeamQuery = query(
        collection(db, 'care_team'),
        where('patient_id', '==', authUser.uid)
      );

      const careTeamSnapshot = await getDocs(careTeamQuery);
      const careTeamData = careTeamSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCareTeam(careTeamData);
    } catch (error) {
      console.error('Error fetching care team:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลทีมผู้ดูแล: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('กรุณากรอกชื่อและอีเมลให้ครบถ้วน');
      return;
    }

    if (!user) {
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'care_team'), {
        patient_id: user.uid,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        notifications_enabled: formData.notifications_enabled,
        created_at: new Date(),
        created_by: user.uid
      });

      alert('✅ เพิ่มสมาชิกทีมผู้ดูแลเรียบร้อยแล้ว');
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'family',
        notifications_enabled: true
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← กลับ
              </button>
              <h1 className="inline text-2xl font-bold text-gray-900">จัดการทีมผู้ดูแล</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              disabled={loading}
            >
              + เพิ่มสมาชิก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            สมาชิกทีมผู้ดูแล ({careTeam.length} คน)
          </h2>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลด...</p>
            </div>
          ) : careTeam.length > 0 ? (
            <div className="space-y-4">
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
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-600">ยังไม่มีสมาชิกในทีมผู้ดูแล</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                เพิ่มสมาชิกแรก
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CareTeam;
