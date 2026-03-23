import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

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
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700" />
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
        <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-4 text-stone-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-200">Security</p>
              <h1 className="text-2xl font-semibold">Change Password</h1>
              <p className="text-sm text-stone-200">Keep your account protected with regular updates.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-200">
            <ShieldCheck className="w-4 h-4" />
            Strong passwords help prevent unauthorized access.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-stone-100">
            <h2 className="text-lg font-semibold text-stone-900">Update Credentials</h2>
            <p className="text-xs text-stone-500">Use a unique password you don’t use elsewhere.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Current password</label>
              <input
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">New password</label>
              <input
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Confirm new password</label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {status ? (
                <p className="text-xs text-stone-500">{status}</p>
              ) : (
                <p className="text-xs text-stone-400">Minimum 8 characters recommended.</p>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="sm:w-auto w-full bg-stone-900 text-stone-50 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Tips</p>
            <ul className="mt-3 space-y-3 text-sm text-stone-700">
              <li>Use a mix of letters, numbers, and symbols.</li>
              <li>Avoid reusing old passwords.</li>
              <li>Consider enabling two-factor authentication.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Need Help?</p>
            <p className="mt-2 text-sm text-stone-600">If you suspect unusual activity, update your password immediately and contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
