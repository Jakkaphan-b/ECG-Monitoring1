import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Navigation = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      
      // Redirect if not authenticated and trying to access protected route
      const protectedRoutes = ['/dashboard', '/history', '/alerts', '/device-setup', '/profile', '/admin', '/caregiver'];
      const currentPath = window.location.pathname;
      
      if (!currentUser && protectedRoutes.includes(currentPath)) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Don't show navbar on login/register pages
  const hideNavbarRoutes = ['/', '/register'];
  if (hideNavbarRoutes.includes(window.location.pathname)) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-blue-600">ECG Monitor</h1>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {user && (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    📊 Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/history')}
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    📈 ประวัติ
                  </button>
                  <button
                    onClick={() => navigate('/alerts')}
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    🔔 การแจ้งเตือน
                  </button>
                  <button
                    onClick={() => navigate('/device-setup')}
                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    ⚙️ อุปกรณ์
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  👤 โปรไฟล์
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  สมัครสมาชิก
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
