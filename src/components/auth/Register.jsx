import React, { useState } from "react";
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({ first_name: "", last_name: "", gender: "M", email: "", password: "", confirmPassword: "", phone_number: "", date_of_birth: "", risk_level: "medium", role: "patient", emergency_contact: "", medical_conditions: "", weight: "", height: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { alert('Passwords do not match'); return; }
    if (form.password.length < 6) { alert('Password must be >= 6 chars'); return; }
    setIsLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = userCred.user.uid;
      const { password, confirmPassword, ...userData } = form;
      await setDoc(doc(db, "users", userId), { ...userData, user_id: userId, created_at: new Date().toISOString(), profile_complete: false, notifications_enabled: true, line_notify_token: null });
      alert('Registered'); navigate('/');
    } catch (err) { console.error(err); alert('Register error: ' + err.message); } finally { setIsLoading(false); }
  };

  return (
    <div>Register (moved)</div>
  );
}

export default Register;
