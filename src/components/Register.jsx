import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "M",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
    date_of_birth: "",
    risk_level: "medium",
    role: "patient", // Default role
    emergency_contact: "",
    medical_conditions: "",
    weight: "",
    height: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน");
      return;
    }
    
    if (form.password.length < 6) {
      alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = userCred.user.uid;

      const { password, confirmPassword, ...userData } = form; // Remove passwords before storing

      await setDoc(doc(db, "users", userId), {
        ...userData,
        user_id: userId,
        created_at: new Date().toISOString(),
        profile_complete: false,
        notifications_enabled: true,
        line_notify_token: null
      });

      alert("✅ สมัครสมาชิกสำเร็จ");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ECG Monitor</h1>
          <h2 className="text-xl font-semibold text-green-600">สมัครสมาชิก</h2>
          <p className="text-gray-600 text-sm mt-2">ลงทะเบียนเข้าใช้ระบบติดตามคลื่นไฟฟ้าหัวใจ</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Personal Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                <input 
                  type="text" 
                  name="first_name" 
                  placeholder="ชื่อ" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.first_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  name="last_name" 
                  placeholder="นามสกุล" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.last_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                <select 
                  name="gender" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.gender} 
                  onChange={handleChange}
                >
                  <option value="M">ชาย</option>
                  <option value="F">หญิง</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                <input 
                  type="date" 
                  name="date_of_birth" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.date_of_birth} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">ข้อมูลบัญชี</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input 
                type="email" 
                name="email" 
                placeholder="your@email.com" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                value={form.email} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.password} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  placeholder="ยืนยันรหัสผ่าน" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.confirmPassword} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">บทบาท</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลือกบทบาทของคุณ</label>
              <select 
                name="role" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                value={form.role} 
                onChange={handleChange}
              >
                <option value="patient">ผู้ป่วย (Patient)</option>
                <option value="caregiver">ผู้ดูแล (Caregiver)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {form.role === "patient" && "ผู้ใช้งานหลักที่จะติดตามสุขภาพหัวใจของตนเอง"}
                {form.role === "caregiver" && "ผู้ดูแลที่สามารถติดตามผู้ป่วยหลายคนและรับการแจ้งเตือน"}
                {form.role === "admin" && "ผู้ดูแลระบบที่มีสิทธิ์เข้าถึงการตั้งค่าทั้งหมด"}
              </p>
            </div>
          </div>

          {/* Contact & Medical Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">ข้อมูลติดต่อและสุขภาพ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input 
                  type="tel" 
                  name="phone_number" 
                  placeholder="0XX-XXX-XXXX" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.phone_number} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์ฉุกเฉิน</label>
                <input 
                  type="tel" 
                  name="emergency_contact" 
                  placeholder="เบอร์ติดต่อฉุกเฉิน" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.emergency_contact} 
                  onChange={handleChange} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (กก.)</label>
                <input 
                  type="number" 
                  name="weight" 
                  placeholder="65" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.weight} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ส่วนสูง (ซม.)</label>
                <input 
                  type="number" 
                  name="height" 
                  placeholder="170" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.height} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความเสี่ยง</label>
                <select 
                  name="risk_level" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                  value={form.risk_level} 
                  onChange={handleChange}
                >
                  <option value="low">ต่ำ (Low)</option>
                  <option value="medium">ปานกลาง (Medium)</option>
                  <option value="high">สูง (High)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">โรคประจำตัว</label>
              <textarea 
                name="medical_conditions" 
                placeholder="ระบุโรคประจำตัวหรือประวัติการแพทย์ (ถ้ามี)" 
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200" 
                value={form.medical_conditions} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition duration-200 font-medium"
          >
            {isLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <span className="text-gray-600 text-sm">มีบัญชีแล้ว? </span>
          <Link to="/" className="text-green-600 hover:text-green-800 font-medium text-sm">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
