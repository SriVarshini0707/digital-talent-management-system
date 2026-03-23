import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ShieldCheck, UserCircle } from "lucide-react";
import { User, UserSession, UserSettingsUpdate } from "../../types";

export default function UserSettings() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [settingsForm, setSettingsForm] = useState<UserSettingsUpdate>({
    name: "",
    email: "",
    notifications: { email: true, in_app: true },
    two_factor_enabled: false
  });
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data?.user) setUserInfo(data.user);
    };
    fetchMe();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await fetch("/api/settings/me", { credentials: "include" });
      const data = await res.json();
      if (data?.user) {
        setSettingsForm({
          name: data.user.name || "",
          email: data.user.email || "",
          notifications: {
            email: data.user.notifications?.email ?? true,
            in_app: data.user.notifications?.in_app ?? true
          },
          two_factor_enabled: data.user.two_factor_enabled ?? false
        });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    };
    fetchSessions();
  }, []);

  const handleSaveSettings = async () => {
    setSettingsStatus(null);
    const res = await fetch("/api/settings/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settingsForm)
    });
    const data = await res.json();
    if (res.ok) {
      setSettingsStatus("Settings saved.");
      if (data?.user) setUserInfo(data.user);
    } else {
      setSettingsStatus(data?.error || "Failed to save settings.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700" />
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
        <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-stone-50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-200">Profile</p>
              <h1 className="text-2xl font-semibold">{userInfo?.name || "User"}</h1>
              <p className="text-sm text-stone-200">{userInfo?.email || "user@company.com"}</p>
              <span className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-[0.2em]">
                <Settings className="w-3.5 h-3.5" />
                {userInfo?.role || "user"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">Sessions</p>
              <p className="text-2xl font-semibold">{sessions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">Security</p>
              <p className="text-sm font-semibold">Standard</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">Status</p>
              <p className="text-sm font-semibold">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Account</p>
              <h2 className="text-lg font-semibold text-stone-900">Profile Details</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Personal</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Name</label>
                <input
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Email</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Email notifications</p>
                  <p className="text-xs text-stone-500">Updates about your tasks.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.notifications.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, email: e.target.checked } })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">In-app notifications</p>
                  <p className="text-xs text-stone-500">Real-time updates inside the app.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.notifications.in_app}
                  onChange={(e) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, in_app: e.target.checked } })}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {settingsStatus ? (
                <p className="text-xs text-stone-500">{settingsStatus}</p>
              ) : (
                <p className="text-xs text-stone-400">Changes apply immediately for your account.</p>
              )}
              <button
                type="button"
                onClick={handleSaveSettings}
                className="sm:w-auto w-full bg-stone-900 text-stone-50 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
            <div className="px-6 py-5 border-b border-stone-100">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Security</p>
              <h3 className="text-lg font-semibold text-stone-900">Security Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Two-factor authentication</p>
                  <p className="text-xs text-stone-500">Add an extra layer of security.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.two_factor_enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, two_factor_enabled: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-stone-600" />
                  <p className="text-sm font-semibold text-stone-800">Change password</p>
                </div>
                <p className="text-xs text-stone-500">Keep your account protected by updating it regularly.</p>
                <button
                  type="button"
                  onClick={() => navigate("/profile/change-password")}
                  className="w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800"
                >
                  Go to Change Password
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm">
            <div className="px-6 py-5 border-b border-stone-100">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Sessions</p>
              <h3 className="text-lg font-semibold text-stone-900">Active Sessions</h3>
            </div>
            <div className="p-6 space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                  <span className="font-semibold text-stone-700">{session.status === "active" ? "Active" : "Offline"}</span>
                  <span>{session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "â€”"}</span>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-stone-400">No sessions available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
