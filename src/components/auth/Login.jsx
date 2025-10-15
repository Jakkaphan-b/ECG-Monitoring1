// src/components/auth/Login.jsx
import React, { useState } from "react";
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || "patient";
        switch (role) {
          case "admin":
            navigate("/admin");
            break;
          case "caregiver":
            navigate("/caregiver");
            break;
          case "patient":
          default:
            navigate("/dashboard");
            break;
        }
      } else {
        navigate("/dashboard");
      }
      
      alert("✅ Logged in");
    } catch (err) {
      alert("❌ Login error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter email");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      alert("✅ Reset email sent");
      setShowForgotPassword(false);
    } catch (err) {
      alert("❌ Error sending reset: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ECG Monitor</h1>
          <h2 className="text-xl font-semibold text-blue-600">Login</h2>
          <p className="text-gray-600 text-sm mt-2">Sign in to continue</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
              placeholder="your@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
              placeholder="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        
        <div className="space-y-3">
          <button
            onClick={() => setShowForgotPassword(!showForgotPassword)}
            className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Forgot password?
          </button>
          {showForgotPassword && (
            <button
              onClick={handleForgotPassword}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm"
            >
              Send reset email
            </button>
          )}
          <div className="text-center">
            <span className="text-gray-600 text-sm">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium text-sm">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
