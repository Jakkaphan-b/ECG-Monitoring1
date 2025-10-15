import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbars = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      const protectedRoutes = ['/dashboard', '/history', '/alerts', '/device-setup', '/profile', '/admin', '/caregiver'];
      const currentPath = location.pathname;
      if (!currentUser && protectedRoutes.includes(currentPath)) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) return null;

  const hideNavbarRoutes = ['/', '/register'];
  if (hideNavbarRoutes.includes(location.pathname)) return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button onClick={() => navigate('/dashboard')} className="text-xl font-bold text-blue-600 hover:text-blue-700">
                ECG Monitor
              </button>
            </div>
            {user && (
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <button 
                    onClick={() => navigate('/dashboard')} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => navigate('/history')} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/history' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    History
                  </button>
                  <button 
                    onClick={() => navigate('/alerts')} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    Alerts
                  </button>
                  <button 
                    onClick={() => navigate('/device-setup')} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/device-setup' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    Device
                  </button>
                  <button 
                    onClick={() => navigate('/care-team')} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/care-team' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    Care Team
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            )}
            {user ? (
              <>
                <span className="hidden md:block text-sm text-gray-600">{user.email}</span>
                <button onClick={() => navigate('/profile')} className="hidden md:block text-gray-500 hover:text-gray-700">Profile</button>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">Login</button>
                <button onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Register</button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t">
            <button
              onClick={() => {
                navigate('/dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                navigate('/history');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/history' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              History
            </button>
            <button
              onClick={() => {
                navigate('/alerts');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/alerts' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Alerts
            </button>
            <button
              onClick={() => {
                navigate('/device-setup');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/device-setup' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Device Setup
            </button>
            <button
              onClick={() => {
                navigate('/care-team');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/care-team' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Care Team
            </button>
            <button
              onClick={() => {
                navigate('/profile');
                setIsMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              Profile
            </button>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-3 text-sm text-gray-600">{user.email}</div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbars;
