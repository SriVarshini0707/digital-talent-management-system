import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import UserDashboard from './components/Dashboard/UserDashboard';
import { LogOut, LayoutDashboard, CheckSquare, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData: User) => setUser(userData);
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-stone-50 text-stone-900 font-mono">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Router>
        <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-stone-900 selection:text-stone-50">
          {user && (
            <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center gap-8">
                    <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                      <LayoutDashboard className="w-6 h-6" />
                      DTMS
                    </Link>
                    <div className="hidden md:flex items-center gap-4 text-sm font-medium text-stone-500">
                      <Link to="/" className="hover:text-stone-900 transition-colors">Dashboard</Link>
                      {user.role === UserRole.ADMIN && (
                        <span className="bg-stone-900 text-stone-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">Admin</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                      <UserIcon className="w-4 h-4 text-stone-500" />
                      <span className="text-xs font-medium">{user.name}</span>
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </nav>
          )}

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
                <Route 
                  path="/" 
                  element={
                    user ? (
                      user.role === UserRole.ADMIN ? <AdminDashboard /> : <UserDashboard />
                    ) : (
                      <Navigate to="/login" />
                    )
                  } 
                />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
