import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeOff, LockKeyhole, LogOut, MoonStar, ShieldCheck, SunMedium, Trash2, Upload, UserCircle } from "lucide-react";
import { User, UserSession, UserSettingsUpdate } from "../../types";

type ThemeMode = "light" | "dark";

const getStoredTheme = (): ThemeMode | null => {
  const storedTheme = localStorage.getItem("dtms-theme");
  return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
};

const getActiveTheme = (): ThemeMode => {
  if (typeof document === "undefined") {
    return getStoredTheme() || "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

const defaultSettings: UserSettingsUpdate = {
  name: "",
  email: "",
  phone: "",
  profile_photo_url: "",
  bio: "",
  theme: getActiveTheme(),
  notifications: {
    email: true,
    in_app: true,
    system_alerts: true,
    user_activity_alerts: true
  },
  two_factor_enabled: false,
  privacy: {
    profile_visible: true,
    show_email: false,
    show_phone: false
  },
  current_password: ""
};

export default function UserSettings() {
  const navigate = useNavigate();
  const initialTheme = getActiveTheme();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [settingsForm, setSettingsForm] = useState<UserSettingsUpdate>(defaultSettings);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [accountActionStatus, setAccountActionStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [previewTheme, setPreviewTheme] = useState<ThemeMode>(initialTheme);

  const applyTheme = (theme: ThemeMode) => {
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("dtms-theme", theme);
    window.dispatchEvent(new CustomEvent("dtms-theme-change", { detail: theme }));
  };

  const selectTheme = (theme: ThemeMode) => {
    setPreviewTheme(theme);
    setSettingsForm((current) => ({ ...current, theme }));
    applyTheme(theme);
  };

  const syncFromUser = (user: User) => {
    const nextTheme = getStoredTheme() || (user.theme === "dark" ? "dark" : "light");
    setUserInfo(user);
    setPreviewTheme(nextTheme);
    setSettingsForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      profile_photo_url: user.profile_photo_url || "",
      bio: user.bio || "",
      theme: nextTheme,
      notifications: {
        email: user.notifications?.email ?? true,
        in_app: user.notifications?.in_app ?? true,
        system_alerts: user.notifications?.system_alerts ?? true,
        user_activity_alerts: user.notifications?.user_activity_alerts ?? true
      },
      two_factor_enabled: user.two_factor_enabled ?? false,
      privacy: {
        profile_visible: user.privacy?.profile_visible ?? true,
        show_email: user.privacy?.show_email ?? false,
        show_phone: user.privacy?.show_phone ?? false
      },
      current_password: ""
    });
    applyTheme(nextTheme);
  };

  useEffect(() => {
    const loadSettings = async () => {
      const res = await fetch("/api/settings/me", { credentials: "include" });
      const data = await res.json();
      if (data?.user) {
        syncFromUser(data.user);
      }
    };
    void loadSettings();
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemeMode>).detail;
      if (nextTheme !== "light" && nextTheme !== "dark") return;
      setPreviewTheme(nextTheme);
      setSettingsForm((current) => ({ ...current, theme: nextTheme }));
    };

    window.addEventListener("dtms-theme-change", handleThemeChange as EventListener);
    return () => window.removeEventListener("dtms-theme-change", handleThemeChange as EventListener);
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    };
    void fetchSessions();
  }, []);

  const securityLabel = useMemo(() => {
    if (settingsForm.two_factor_enabled) return "Protected";
    return "Standard";
  }, [settingsForm.two_factor_enabled]);

  const shellClass = previewTheme === "dark" ? "text-slate-100" : "text-slate-900";
  const subtleText = previewTheme === "dark" ? "text-slate-300" : "text-slate-500";
  const emptyText = previewTheme === "dark" ? "text-slate-400" : "text-slate-400";
  const uploadPanelClass = previewTheme === "dark"
    ? "border-white/10 bg-white/6"
    : "border-white/10 bg-white/72";
  const uploadTitleClass = previewTheme === "dark" ? "text-slate-100" : "text-slate-900";
  const uploadButtonClass = previewTheme === "dark"
    ? "border-white/15 bg-white/10 text-slate-100 hover:border-cyan-300 hover:bg-white/15 hover:text-white"
    : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-slate-900";
  const saveBarClass = previewTheme === "dark"
    ? "border-white/10 bg-white/8"
    : "border-white/10 bg-white/82";
  const actionTextClass = previewTheme === "dark" ? "text-slate-300" : "text-slate-500";

  const handleSaveSettings = async () => {
    setSettingsStatus(null);
    setAccountActionStatus(null);
    const res = await fetch("/api/settings/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settingsForm)
    });
    const data = await res.json();
    if (res.ok) {
      setSettingsStatus(data?.user?.email_verified === false ? "Settings saved. Please verify your updated email address." : "Settings saved.");
      if (data?.user) {
        syncFromUser(data.user);
      }
    } else {
      setSettingsStatus(data?.error || "Failed to save settings.");
    }
  };

  const handleProfilePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    setSettingsStatus(null);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData?.files?.[0]?.file_url;
      if (!uploadRes.ok || !fileUrl) {
        setSettingsStatus(uploadData?.error || "Profile photo upload failed.");
        return;
      }
      setSettingsForm((current) => ({ ...current, profile_photo_url: fileUrl }));
      setSettingsStatus("Profile photo uploaded. Save changes to apply it.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setAccountActionStatus(null);
    const res = await fetch("/api/settings/logout-all", {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAccountActionStatus(data?.error || "Unable to log out all devices.");
      return;
    }
    setAccountActionStatus("Logged out from all devices.");
    navigate("/login");
    window.location.reload();
  };

  const handleDeactivateAccount = async () => {
    setAccountActionStatus(null);
    if (!window.confirm("Deactivate your account? You will be signed out immediately.")) {
      return;
    }
    const res = await fetch("/api/settings/deactivate", {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAccountActionStatus(data?.error || "Unable to deactivate your account.");
      return;
    }
    navigate("/login");
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    setAccountActionStatus(null);
    if (!deletePassword) {
      setAccountActionStatus("Enter your current password to delete your account.");
      return;
    }
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) {
      return;
    }
    const res = await fetch("/api/settings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: deletePassword })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAccountActionStatus(data?.error || "Unable to delete your account.");
      return;
    }
    navigate("/login");
    window.location.reload();
  };

  return (
    <div className={`space-y-8 ${shellClass}`}>
      <div className={`relative overflow-hidden rounded-[2rem] border shadow-[0_24px_80px_rgba(14,165,233,0.16)] ${previewTheme === "dark" ? "border-sky-200/20 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#06b6d4_100%)]" : "border-sky-200/60 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#06b6d4_100%)]"}`}>
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_white,_transparent_38%)]" />
        <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-stone-50">
          <div className="flex items-center gap-4">
            {settingsForm.profile_photo_url ? (
              <img
                src={settingsForm.profile_photo_url}
                alt={settingsForm.name || "User profile"}
                className="w-16 h-16 rounded-2xl object-cover border border-white/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <UserCircle className="w-8 h-8" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/80">Workspace</p>
              <h1 className="text-2xl font-semibold">{settingsForm.name || userInfo?.name || "User"}</h1>
              <p className="text-sm text-slate-100/80">{settingsForm.email || userInfo?.email || "user@company.com"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-[0.2em]">
                  {userInfo?.role || "user"}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-[0.2em]">
                  {userInfo?.email_verified === false ? "Email verification pending" : "Email verified"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <HeroStat label="Sessions" value={sessions.length} />
            <HeroStat label="Security" value={securityLabel} />
            <HeroStat label="Theme" value={previewTheme === "dark" ? "Dark" : "Light"} hiddenOnMobile />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card eyebrow="Basic Information" title="Identity & contact" theme={previewTheme}>
            <div className="space-y-6">
              <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${uploadPanelClass}`}>
                <div className="flex items-center gap-4">
                  {settingsForm.profile_photo_url ? (
                    <img
                      src={settingsForm.profile_photo_url}
                      alt={settingsForm.name || "User profile"}
                      className={`w-14 h-14 rounded-2xl object-cover border ${previewTheme === "dark" ? "border-stone-600" : "border-stone-200"}`}
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center text-lg font-semibold ${previewTheme === "dark" ? "bg-cyan-500/20 border border-cyan-300/20" : "bg-pink-500"}`}>
                      {(settingsForm.name || userInfo?.name || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${uploadTitleClass}`}>Profile picture</p>
                    <p className={`text-xs ${subtleText}`}>Upload or change the image shown on your account.</p>
                  </div>
                </div>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${uploadButtonClass}`}>
                  <Upload className="w-4 h-4" />
                  {isUploadingPhoto ? "Uploading..." : "Upload picture"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleProfilePhotoUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" value={settingsForm.name} onChange={(value) => setSettingsForm({ ...settingsForm, name: value })} theme={previewTheme} />
                <Field label="Email" type="email" value={settingsForm.email} onChange={(value) => setSettingsForm({ ...settingsForm, email: value })} theme={previewTheme} />
                <Field label="Phone Number" type="tel" value={settingsForm.phone || ""} onChange={(value) => setSettingsForm({ ...settingsForm, phone: value })} theme={previewTheme} />
                <Field label="Picture URL" value={settingsForm.profile_photo_url || ""} onChange={(value) => setSettingsForm({ ...settingsForm, profile_photo_url: value })} theme={previewTheme} />
              </div>

              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider ${previewTheme === "dark" ? "text-stone-400" : "text-stone-500"}`}>Bio / Short Description</label>
                <textarea
                  rows={4}
                  value={settingsForm.bio || ""}
                  onChange={(event) => setSettingsForm({ ...settingsForm, bio: event.target.value })}
                  className={`mt-1 w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${previewTheme === "dark" ? "bg-stone-800 border border-stone-700 text-stone-100 focus:ring-stone-600 focus:border-stone-500" : "bg-white border border-stone-200 text-stone-900 focus:ring-stone-900/10 focus:border-stone-300"}`}
                  placeholder="Tell people a little about yourself."
                />
              </div>

            </div>
          </Card>

          <Card eyebrow="Account Preferences" title="Notifications & theme" theme={previewTheme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleCard
                title="Email notifications"
                description="Receive updates by email."
                checked={settingsForm.notifications.email}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, email: checked } })}
                theme={previewTheme}
              />
              <ToggleCard
                title="In-app alerts"
                description="Receive notifications inside the app."
                checked={settingsForm.notifications.in_app}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, in_app: checked } })}
                theme={previewTheme}
              />
              <ToggleCard
                title="System alerts"
                description="Important account and platform notices."
                checked={settingsForm.notifications.system_alerts ?? true}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, system_alerts: checked } })}
                theme={previewTheme}
              />
              <ToggleCard
                title="User activity alerts"
                description="Changes related to your tasks and activity."
                checked={settingsForm.notifications.user_activity_alerts ?? true}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, user_activity_alerts: checked } })}
                theme={previewTheme}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ThemeButton
                active={previewTheme === "light"}
                title="Light Mode"
                icon={<SunMedium className="w-4 h-4" />}
                onClick={() => selectTheme("light")}
                theme={previewTheme}
              />
              <ThemeButton
                active={previewTheme === "dark"}
                title="Dark Mode"
                icon={<MoonStar className="w-4 h-4" />}
                onClick={() => selectTheme("dark")}
                theme={previewTheme}
              />
            </div>
          </Card>

          <Card eyebrow="Privacy Settings" title="Profile visibility" theme={previewTheme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleCard
                title="Visible profile"
                description="Control whether your profile is visible where supported."
                checked={settingsForm.privacy?.profile_visible ?? true}
                onChange={(checked) => setSettingsForm({ ...settingsForm, privacy: { ...settingsForm.privacy, profile_visible: checked } })}
                theme={previewTheme}
              />
              <ToggleCard
                title="Show email"
                description="Allow your email to appear in profile details."
                checked={settingsForm.privacy?.show_email ?? false}
                onChange={(checked) => setSettingsForm({ ...settingsForm, privacy: { ...settingsForm.privacy, show_email: checked } })}
                theme={previewTheme}
              />
              <ToggleCard
                title="Show phone"
                description="Allow your phone number to appear in profile details."
                checked={settingsForm.privacy?.show_phone ?? false}
                onChange={(checked) => setSettingsForm({ ...settingsForm, privacy: { ...settingsForm.privacy, show_phone: checked } })}
                theme={previewTheme}
              />
            </div>
          </Card>

          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border px-6 py-4 shadow-sm ${saveBarClass}`}>
            <p className={`text-xs ${subtleText}`}>{settingsStatus || "Save when you are ready."}</p>
            <button
              type="button"
              onClick={handleSaveSettings}
                  className={`sm:w-auto w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-white ${previewTheme === "dark" ? "bg-cyan-500 hover:bg-cyan-400" : "bg-pink-500 hover:bg-pink-600"}`}
            >
              Save Settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Card eyebrow="Security Settings" title="Protect your account" theme={previewTheme}>
            <div className="space-y-4">
              <ToggleCard
                title="Two-factor authentication"
                description="Add a second step when signing in."
                checked={settingsForm.two_factor_enabled}
                onChange={(checked) => setSettingsForm({ ...settingsForm, two_factor_enabled: checked })}
                theme={previewTheme}
              />
              <div className={`rounded-xl border px-4 py-4 space-y-3 ${uploadPanelClass}`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${previewTheme === "dark" ? "text-stone-300" : "text-stone-600"}`} />
                  <p className={`text-sm font-semibold ${uploadTitleClass}`}>Change password</p>
                </div>
                <p className={`text-xs ${subtleText}`}>Keep your account protected by updating it regularly.</p>
                <button
                  type="button"
                  onClick={() => navigate("/profile/change-password")}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${previewTheme === "dark" ? "bg-cyan-500 hover:bg-cyan-400" : "bg-pink-500 hover:bg-pink-600"}`}
                >
                  Go to Change Password
                </button>
              </div>
            </div>
          </Card>

          <Card eyebrow="Sessions" title="Signed-in devices" theme={previewTheme}>
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className={`rounded-xl border px-4 py-3 text-xs ${previewTheme === "dark" ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-600"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-semibold ${previewTheme === "dark" ? "text-stone-100" : "text-stone-700"}`}>{session.status === "active" ? "Active" : "Offline"}</span>
                    <span>{session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "-"}</span>
                  </div>
                  <p className={`mt-1 text-[11px] ${previewTheme === "dark" ? "text-stone-400" : "text-stone-500"}`}>{session.ip_address || "IP unavailable"} · {session.user_agent || "Browser unavailable"}</p>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className={`text-xs ${emptyText}`}>No sessions available.</p>
              )}
            </div>
          </Card>

          <Card eyebrow="Account Actions" title="Session & account controls" theme={previewTheme}>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleLogoutAllDevices}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${previewTheme === "dark" ? "border-stone-600 bg-stone-900 text-stone-100 hover:border-stone-400" : "border-stone-300 bg-white text-stone-700 hover:border-stone-900 hover:text-stone-900"}`}
              >
                <LogOut className="w-4 h-4" />
                Logout From All Devices
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                <EyeOff className="w-4 h-4" />
                Deactivate Account
              </button>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-800">
                  <Trash2 className="w-4 h-4" />
                  <p className="text-sm font-semibold">Delete account</p>
                </div>
                <p className="text-xs text-red-700">Confirm with your password to permanently remove your account.</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                  placeholder="Current password"
                />
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <LockKeyhole className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
              <p className={`text-xs ${actionTextClass}`}>{accountActionStatus || "Logging out all devices signs you out immediately. Deactivation is reversible; deletion is not."}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  eyebrow,
  title,
  children,
  theme
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  theme: ThemeMode;
}) {
  return (
    <div className={`rounded-[1.5rem] border shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl ${theme === "dark" ? "border-white/10 bg-white/8" : "border-white/10 bg-white/82"}`}>
      <div className={`px-6 py-5 border-b ${theme === "dark" ? "border-white/10" : "border-slate-100"}`}>
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{eyebrow}</p>
        <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-stone-100" : "text-stone-900"}`}>{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  theme
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  theme: ThemeMode;
}) {
  return (
    <div>
      <label className={`text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-stone-400" : "text-stone-500"}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-4 ${theme === "dark" ? "bg-slate-900/90 border border-white/10 text-stone-100 focus:ring-cyan-500/15 focus:border-cyan-300/40" : "bg-white border border-sky-100 text-stone-900 focus:ring-sky-100 focus:border-sky-300"}`}
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  theme
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  theme: ThemeMode;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${theme === "dark" ? "border-white/10 bg-slate-900/80" : "border-slate-200 bg-slate-50/80"}`}>
      <div>
        <p className={`text-sm font-semibold ${theme === "dark" ? "text-stone-100" : "text-stone-800"}`}>{title}</p>
        <p className={`text-xs ${theme === "dark" ? "text-stone-400" : "text-stone-500"}`}>{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </div>
  );
}

function ThemeButton({
  active,
  title,
  icon,
  onClick,
  theme
}: {
  active: boolean;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  theme: ThemeMode;
}) {
  const inactiveClass = theme === "dark"
    ? "border-white/10 bg-slate-900/80 text-stone-100 hover:border-cyan-300/40"
    : "border-slate-200 bg-white text-stone-800 hover:border-sky-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left ${active ? "border-transparent bg-[linear-gradient(135deg,#0ea5e9,#8b5cf6)] text-stone-50 shadow-sm" : inactiveClass}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className={`mt-2 text-xs ${active ? "text-stone-200" : theme === "dark" ? "text-stone-400" : "text-stone-500"}`}>Use this appearance preference for your account.</p>
    </button>
  );
}

function HeroStat({
  label,
  value,
  hiddenOnMobile = false
}: {
  label: string;
  value: string | number;
  hiddenOnMobile?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-white/10 px-4 py-3 ${hiddenOnMobile ? "hidden sm:block" : ""}`}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
