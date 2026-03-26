import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setStatus("Please complete all password fields.");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setStatus("New password and confirm password must match.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Password updated.");
        setForm({ current_password: "", new_password: "", confirm_password: "" });
      } else {
        setStatus(data?.error || "Failed to update password.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-sky-100/80 transition-colors hover:border-sky-300 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <div className="relative overflow-hidden rounded-[2rem] border border-sky-200/70 shadow-[0_30px_80px_rgba(14,165,233,0.18)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0ea5e9_0%,#8b5cf6_48%,#ec4899_100%)]" />
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_top_left,_white,_transparent_40%)]" />
        <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-5 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <KeyRound className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Security</p>
              <h1 className="text-3xl font-semibold">Change Password</h1>
              <p className="text-sm text-white/80">Refresh your credentials with a stronger, safer password.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/85">
            <Sparkles className="w-4 h-4" />
            Strong passwords reduce unauthorized access risk.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6">
        <div className="rounded-[1.75rem] border border-pink-200/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Update Credentials</h2>
            <p className="text-xs text-slate-500">Choose a unique password you do not use anywhere else.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <PasswordField
              label="Current password"
              value={form.current_password}
              onChange={(value) => setForm({ ...form, current_password: value })}
            />
            <PasswordField
              label="New password"
              value={form.new_password}
              onChange={(value) => setForm({ ...form, new_password: value })}
            />
            <PasswordField
              label="Confirm new password"
              value={form.confirm_password}
              onChange={(value) => setForm({ ...form, confirm_password: value })}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-xs ${status ? "text-slate-600" : "text-slate-400"}`}>
                {status || "Minimum 8 characters recommended."}
              </p>
              <button
                type="submit"
                disabled={isSaving}
                className="sm:w-auto w-full rounded-xl bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-100 transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-sky-200/70 bg-[linear-gradient(180deg,#eff6ff_0%,#fdf4ff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Tips</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li>Use a mix of letters, numbers, and symbols.</li>
              <li>Avoid reusing old passwords.</li>
              <li>Consider enabling two-factor authentication.</li>
            </ul>
          </div>
          <div className="rounded-[1.5rem] border border-amber-200/70 bg-[linear-gradient(180deg,#fff7ed_0%,#fffaf5_100%)] p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <ShieldCheck className="w-4 h-4" />
              <p className="text-xs uppercase tracking-[0.3em]">Need Help?</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              If you suspect unusual activity, update your password immediately and contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-pink-100 bg-gradient-to-b from-white to-pink-50/30 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
      />
    </div>
  );
}
