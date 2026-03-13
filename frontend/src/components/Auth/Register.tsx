import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User as UserIcon, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../../types';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/login');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto mt-12"
    >
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-stone-50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
          <p className="text-stone-500 text-sm mt-1">Join the Digital Talent Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole(UserRole.USER)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  role === UserRole.USER 
                    ? 'bg-stone-900 text-stone-50 border-stone-900' 
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Talent
              </button>
              <button
                type="button"
                onClick={() => setRole(UserRole.ADMIN)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  role === UserRole.ADMIN 
                    ? 'bg-stone-900 text-stone-50 border-stone-900' 
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
          <p className="text-sm text-stone-500">
            Already have an account?{' '}
            <Link to="/login" className="text-stone-900 font-semibold hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
