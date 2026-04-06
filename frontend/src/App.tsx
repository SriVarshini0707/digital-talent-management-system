import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import UserDashboard from './components/Dashboard/UserDashboard';
import ChangePassword from './components/Profile/ChangePassword';
import UserSettings from './components/Profile/UserSettings';
import DirectMessages from './components/Chat/DirectMessages';
import { LogOut, LayoutDashboard, User as UserIcon, MoonStar, SunMedium, MessageSquare } from 'lucide-react';
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
  const getStoredTheme = (): "light" | "dark" | null => {
    const storedTheme = localStorage.getItem("dtms-theme");
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => getStoredTheme() || "light"
  );

  const applyTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    localStorage.setItem("dtms-theme", nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new CustomEvent("dtms-theme-change", { detail: nextTheme }));
  };

  const persistTheme = async (nextTheme: "light" | "dark") => {
    if (!user) return;
    try {
      await fetch('/api/settings/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: nextTheme })
      });
    } catch {
      // Keep the local preference even if syncing fails.
    }
  };

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          const nextTheme = getStoredTheme() || (data.user.theme === "dark" ? "dark" : "light");
          applyTheme(nextTheme);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<"light" | "dark">).detail;
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
        localStorage.setItem("dtms-theme", nextTheme);
        document.documentElement.style.colorScheme = nextTheme;
        document.documentElement.dataset.theme = nextTheme;
      }
    };
    window.addEventListener("dtms-theme-change", handleThemeChange as EventListener);
    return () => window.removeEventListener("dtms-theme-change", handleThemeChange as EventListener);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    const nextTheme = getStoredTheme() || (userData.theme === "dark" ? "dark" : "light");
    applyTheme(nextTheme);
  };
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const handleThemeToggle = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setUser((current) => (current ? { ...current, theme: nextTheme } : current));
    await persistTheme(nextTheme);
  };

  if (loading) return <div className={`flex items-center justify-center h-screen font-mono ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-orange-50 text-slate-900"}`}>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Router>
        <div className={`min-h-screen selection:bg-pink-600 selection:text-white ${theme === "dark" ? "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#081225_42%,#0f172a_100%)] text-slate-100" : "bg-[linear-gradient(180deg,#fff7ed_0%,#fffaf5_42%,#f8fbff_100%)] text-slate-900"}`}>
          {user && (
            <nav className={`backdrop-blur-xl sticky top-0 z-50 border-b ${theme === "dark" ? "border-sky-500/20 bg-slate-950/70" : "border-pink-200/60 bg-white/70"}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center gap-8">
                    <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                      <LayoutDashboard className={`w-6 h-6 ${theme === "dark" ? "text-cyan-300" : "text-pink-500"}`} />
                      DTMS
                    </Link>
                    <div className={`hidden md:flex items-center gap-4 text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                      <Link to="/" className={`${theme === "dark" ? "hover:text-cyan-300" : "hover:text-pink-600"} transition-colors`}>Dashboard</Link>
                      <Link to="/chat" className={`${theme === "dark" ? "hover:text-cyan-300" : "hover:text-pink-600"} transition-colors`}>Chat</Link>
                      {user.role === UserRole.ADMIN && (
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-widest ${theme === "dark" ? "bg-cyan-400/15 text-cyan-200 border border-cyan-400/20" : "bg-pink-50 text-pink-700 border border-pink-200"}`}>Admin</span>
                      )}
                      {user.role !== UserRole.ADMIN && (
                        <Link to="/profile" className={`${theme === "dark" ? "hover:text-cyan-300" : "hover:text-pink-600"} transition-colors`}>Profile</Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleThemeToggle}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${theme === "dark" ? "border-cyan-400/25 bg-slate-900/90 text-cyan-300 hover:-translate-y-0.5 hover:border-cyan-300/60 hover:text-white" : "border-sky-200 bg-white/90 text-sky-600 shadow-sm shadow-sky-100/70 hover:-translate-y-0.5 hover:border-sky-400 hover:text-sky-700"}`}
                      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                      {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                    </button>
                    <Link
                      to="/chat"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${theme === "dark" ? "bg-slate-900/90 border-cyan-400/20 hover:border-cyan-300/50 hover:text-white" : "bg-white/90 border-pink-200 hover:border-pink-400 hover:text-slate-900 shadow-sm shadow-pink-100/70"}`}
                      aria-label="Open chat"
                    >
                      <MessageSquare className={`w-4 h-4 ${theme === "dark" ? "text-cyan-300" : "text-pink-500"}`} />
                      <span className="text-xs font-medium">Chat</span>
                    </Link>
                    <Link
                      to={user.role === UserRole.ADMIN ? "/?section=profile" : "/profile"}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${theme === "dark" ? "bg-slate-900/90 border-cyan-400/20 hover:border-cyan-300/50 hover:text-white" : "bg-white/90 border-pink-200 hover:border-pink-400 hover:text-slate-900 shadow-sm shadow-pink-100/70"}`}
                      aria-label="Open profile"
                    >
                      <UserIcon className={`w-4 h-4 ${theme === "dark" ? "text-cyan-300" : "text-pink-500"}`} />
                      <span className="text-xs font-medium">{user.name}</span>
                    </Link>
                    <button 
                      onClick={logout}
                      aria-label="Sign out"
                      className={`p-2 rounded-full transition-all ${theme === "dark" ? "text-slate-300 hover:text-rose-300 hover:bg-rose-400/10" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"}`}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className={`md:hidden flex flex-wrap items-center gap-2 pb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                  <Link
                    to="/"
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "border-cyan-400/20 bg-slate-900/80 hover:border-cyan-300/50 hover:text-white" : "border-pink-200 bg-white/90 hover:border-pink-400 hover:text-slate-900"}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/chat"
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "border-cyan-400/20 bg-slate-900/80 hover:border-cyan-300/50 hover:text-white" : "border-pink-200 bg-white/90 hover:border-pink-400 hover:text-slate-900"}`}
                  >
                    Chat
                  </Link>
                  {user.role !== UserRole.ADMIN && (
                    <Link
                      to="/profile"
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "border-cyan-400/20 bg-slate-900/80 hover:border-cyan-300/50 hover:text-white" : "border-pink-200 bg-white/90 hover:border-pink-400 hover:text-slate-900"}`}
                    >
                      Profile
                    </Link>
                  )}
                  {user.role === UserRole.ADMIN && (
                    <Link
                      to="/?section=profile"
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "border-cyan-400/20 bg-slate-900/80 hover:border-cyan-300/50 hover:text-white" : "border-pink-200 bg-white/90 hover:border-pink-400 hover:text-slate-900"}`}
                    >
                      Admin Profile
                    </Link>
                  )}
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
                  path="/profile"
                  element={
                    user ? (
                      user.role === UserRole.ADMIN ? <Navigate to="/" /> : <UserSettings />
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />
                <Route 
                  path="/profile/change-password"
                  element={user ? <ChangePassword /> : <Navigate to="/login" />}
                />
                <Route
                  path="/chat"
                  element={user ? <DirectMessages /> : <Navigate to="/login" />}
                />
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
