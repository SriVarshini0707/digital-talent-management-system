import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Shield, Sparkles, User as UserIcon, UserPlus } from 'lucide-react';
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
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch"
    >
      <section className="rounded-[2rem] border border-sky-200/70 bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(14,165,233,0.18)]">
        <div className="flex h-full flex-col justify-between gap-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Create Workspace Access
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">Step into a cleaner, faster workflow.</h1>
            <p className="text-sm text-slate-300">
              Create your account to manage tasks, review submissions, and stay aligned with your team in one polished workspace.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Structured task assignment and tracking',
              'Professional admin and user account controls',
              'Real-time visibility into progress and activity',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-sky-200/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#8b5cf6)] text-white shadow-lg shadow-sky-200">
            <UserPlus className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create account</h2>
          <p className="mt-2 text-sm text-slate-500">Join the Digital Talent Management System with the role that fits your work.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Full Name"
            icon={<UserIcon className="h-4 w-4" />}
            type="text"
            value={name}
            onChange={setName}
            placeholder="John Doe"
          />

          <Field
            label="Email Address"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@company.com"
          />

          <Field
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Create a strong password"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                active={role === UserRole.USER}
                icon={<UserIcon className="h-4 w-4" />}
                title="Talent"
                accent="pink"
                onClick={() => setRole(UserRole.USER)}
              />
              <RoleCard
                active={role === UserRole.ADMIN}
                icon={<Shield className="h-4 w-4" />}
                title="Admin"
                accent="sky"
                onClick={() => setRole(UserRole.ADMIN)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0ea5e9,#8b5cf6)] px-4 py-3 font-semibold text-white shadow-lg shadow-sky-200 transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </motion.div>
  );
}

function Field({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky-400">{icon}</div>
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-sky-100 bg-gradient-to-b from-white to-sky-50/40 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function RoleCard({
  active,
  icon,
  title,
  accent,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  accent: 'pink' | 'sky';
  onClick: () => void;
}) {
  const activeClass = accent === 'pink'
    ? 'border-pink-400 bg-pink-500 text-white shadow-lg shadow-pink-100'
    : 'border-sky-400 bg-sky-500 text-white shadow-lg shadow-sky-100';
  const inactiveClass = 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${active ? activeClass : inactiveClass}`}
    >
      {icon}
      {title}
    </button>
  );
}
