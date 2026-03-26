import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../App';
import { ArrowRight, LogIn, Mail, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.user);
        navigate('/');
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
      className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-pink-200/70 bg-[linear-gradient(140deg,#fb7185_0%,#f59e0b_45%,#38bdf8_100%)] p-8 text-white shadow-[0_30px_80px_rgba(244,114,182,0.22)]">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_left,_white,_transparent_38%)]" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]">
              <Sparkles className="h-3.5 w-3.5" />
              Talent Operations
            </div>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Professional talent management for modern teams.
              </h1>
              <p className="max-w-lg text-sm text-white/85 sm:text-base">
                Track work, monitor progress, and keep creative operations aligned from a single workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Task Reviews', value: 'Fast' },
              { label: 'Team Visibility', value: 'Live' },
              { label: 'Security', value: 'Protected' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">{item.label}</p>
                <p className="mt-2 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-pink-200/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ec4899,#f97316)] text-white shadow-lg shadow-pink-200">
            <LogIn className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your dashboard and continue your work.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Enter your password"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ec4899,#f97316)] px-4 py-3 font-semibold text-white shadow-lg shadow-pink-200 transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-pink-600 hover:text-pink-700">
              Create an account
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
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pink-400">{icon}</div>
        <input
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-pink-100 bg-gradient-to-b from-white to-orange-50/30 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
