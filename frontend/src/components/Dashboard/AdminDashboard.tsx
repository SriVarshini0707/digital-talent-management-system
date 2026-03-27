import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, CheckCircle, Clock, Send, BarChart3, Trash2, Edit2, Users, FileText, Eye, XCircle, ExternalLink, LayoutDashboard, ListChecks, Activity as ActivityIcon, Users2, Settings, UserCircle, ShieldCheck, LogOut, Power, Upload } from "lucide-react";
import { motion } from "motion/react";
import { Task, Analytics, User, TaskStatus, Submission, TaskPriority, TaskComment, UserSession, ActivityLog, UserSettingsUpdate } from "../../types";

export default function AdminDashboard() {
  const getStoredTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("dtms-theme") === "dark" ? "dark" : "light";
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [settingsForm, setSettingsForm] = useState<UserSettingsUpdate>({
    name: "",
    email: "",
    phone: "",
    profile_photo_url: "",
    notifications: { email: true, in_app: true, system_alerts: true, user_activity_alerts: true },
    two_factor_enabled: false
  });
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [accountActionStatus, setAccountActionStatus] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeSection, setActiveSection] = useState<"overview" | "tasks" | "sessions" | "logs" | "profile">("overview");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCategories, setEditingCategories] = useState("");
  const [viewingSubmissions, setViewingSubmissions] = useState<{ task: Task, submissions: Submission[] } | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: TaskPriority.MEDIUM,
    categories: ""
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);
  const navigate = useNavigate();
  const location = useLocation();

  const toDateInputValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const parseCategories = (value: string) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^#/, ""));
  };

  const formatCategories = (categories?: string[]) => {
    if (!categories || categories.length === 0) return "";
    return categories.map((category) => `#${category}`).join(", ");
  };

  const getDaysRemainingLabel = (dueDate?: string | null) => {
    if (!dueDate) return "No due date";
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return "No due date";
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffMs = startOfDue.getTime() - startOfToday.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
    if (diffDays === 0) return "Due today";
    const overdue = Math.abs(diffDays);
    return `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}`;
  };

  const getPriorityBadge = (priority?: TaskPriority) => {
    const value = priority || TaskPriority.MEDIUM;
    const styles = {
      [TaskPriority.LOW]: "bg-sky-50 text-sky-700 border-sky-100",
      [TaskPriority.MEDIUM]: "bg-amber-50 text-amber-700 border-amber-100",
      [TaskPriority.HIGH]: "bg-orange-50 text-orange-700 border-orange-100",
      [TaskPriority.URGENT]: "bg-red-50 text-red-700 border-red-100"
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[value]}`}>
        {value}
      </span>
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data?.user) setAdminUser(data.user);
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
          phone: data.user.phone || "",
          profile_photo_url: data.user.profile_photo_url || "",
          notifications: {
            email: data.user.notifications?.email ?? true,
            in_app: data.user.notifications?.in_app ?? true,
            system_alerts: data.user.notifications?.system_alerts ?? true,
            user_activity_alerts: data.user.notifications?.user_activity_alerts ?? true
          },
          two_factor_enabled: data.user.two_factor_enabled ?? false
        });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!viewingSubmissions?.task) return;
    fetchComments(viewingSubmissions.task.id);
  }, [viewingSubmissions?.task?.id]);

  useEffect(() => {
    if (!editingTask) return;
    setEditingCategories(formatCategories(editingTask.categories));
  }, [editingTask?.id]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section === "overview" || section === "tasks" || section === "sessions" || section === "logs" || section === "profile") {
      setActiveSection(section);
    }
  }, [location.search]);

  const updateSection = (section: typeof activeSection) => {
    setActiveSection(section);
    const params = new URLSearchParams(location.search);
    params.set("section", section);
    navigate({ search: params.toString() }, { replace: true });
  };
  const fetchData = async () => {
    const [tasksRes, usersRes, analyticsRes, sessionsRes, logsRes] = await Promise.all([
      fetch("/api/tasks", { credentials: "include" }),
      fetch("/api/users", { credentials: "include" }),
      fetch("/api/analytics", { credentials: "include" }),
      fetch("/api/sessions", { credentials: "include" }),
      fetch("/api/activity-logs", { credentials: "include" })
    ]);
    const tasksData = await tasksRes.json();
    const usersData = await usersRes.json();
    const analyticsData = await analyticsRes.json();
    const sessionsData = await sessionsRes.json();
    const logsData = await logsRes.json();

    setTasks(Array.isArray(tasksData) ? tasksData : []);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setAnalytics(analyticsData && !analyticsData.error ? analyticsData : null);
    setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    setActivityLogs(Array.isArray(logsData) ? logsData : []);
  };

  const fetchSessionsAndLogs = async () => {
    const [sessionsRes, logsRes] = await Promise.all([
      fetch("/api/sessions", { credentials: "include" }),
      fetch("/api/activity-logs", { credentials: "include" })
    ]);
    const sessionsData = await sessionsRes.json();
    const logsData = await logsRes.json();
    setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    setActivityLogs(Array.isArray(logsData) ? logsData : []);
  };

  const fetchComments = async (taskId: string) => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { credentials: "include" });
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!viewingSubmissions?.task || !commentText.trim()) return;
    const res = await fetch(`/api/tasks/${viewingSubmissions.task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        content: commentText.trim(),
        parent_id: replyTo?.id || null
      })
    });
    if (res.ok) {
      setCommentText("");
      setReplyTo(null);
      fetchComments(viewingSubmissions.task.id);
    }
  };

  const closeReviewModal = () => {
    setViewingSubmissions(null);
    setComments([]);
    setCommentText("");
    setReplyTo(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...newTask,
        due_date: newTask.due_date || null,
        categories: parseCategories(newTask.categories)
      })
    });
    if (res.ok) {
      setIsAddingTask(false);
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        due_date: "",
        priority: TaskPriority.MEDIUM,
        categories: ""
      });
      fetchData();
    }
  };

  const handleUpdateTask = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(task)
    });
    if (res.ok) {
      setEditingTask(null);
      fetchData();
    }
  };

  const handleViewSubmissions = async (task: Task) => {
    const res = await fetch(`/api/submissions/${task.id}`, { credentials: "include" });
    const submissions = await res.json();
    setViewingSubmissions({ task, submissions });
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await fetch(`/api/tasks/${id}`, { method: "DELETE", credentials: "include" });
      fetchData();
    }
  };

  const handleApproveTask = async (task: Task) => {
    await handleUpdateTask({ ...task, status: TaskStatus.COMPLETED });
    closeReviewModal();
  };

  const handleRejectTask = async (task: Task, feedback: string) => {
    await handleUpdateTask({ ...task, status: TaskStatus.REJECTED, admin_feedback: feedback });
    closeReviewModal();
  };

  const commentDepth = useMemo(() => {
    const map = new Map(comments.map(c => [c.id, c]));
    return (comment: TaskComment) => {
      let depth = 0;
      let current = comment;
      while (current.parent_id && map.get(current.parent_id) && depth < 3) {
        depth += 1;
        current = map.get(current.parent_id)!;
      }
      return depth;
    };
  }, [comments]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      task.categories?.forEach((category) => set.add(category));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (selectedCategory === "all") return tasks;
    return tasks.filter((task) => task.categories?.includes(selectedCategory));
  }, [tasks, selectedCategory]);

  const computedAnalytics = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const pending = filteredTasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const submitted = filteredTasks.filter((t) => t.status === TaskStatus.SUBMITTED).length;
    const rejected = filteredTasks.filter((t) => t.status === TaskStatus.REJECTED).length;
    return {
      total,
      completed,
      pending,
      submitted,
      rejected,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [filteredTasks]);

  const effectiveAnalytics = selectedCategory === "all" && analytics ? analytics : computedAnalytics;
  const adminActivityLogs = useMemo(() => {
    if (!adminUser?.id) return [];
    return activityLogs.filter((log) => log.user_id === adminUser.id);
  }, [activityLogs, adminUser?.id]);

  const adminSessions = useMemo(() => {
    if (!adminUser?.id) return [];
    return sessions.filter((session) => session.user_id === adminUser.id);
  }, [sessions, adminUser?.id]);

  useEffect(() => {
    fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "Viewed dashboard" })
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessionsAndLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<"light" | "dark">).detail;
      if (nextTheme === "dark" || nextTheme === "light") {
        setTheme(nextTheme);
      }
    };
    window.addEventListener("dtms-theme-change", handleThemeChange as EventListener);
    return () => window.removeEventListener("dtms-theme-change", handleThemeChange as EventListener);
  }, []);

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
      setSettingsStatus("Settings saved.");
      if (data?.user) {
        setAdminUser(data.user);
        setSettingsForm({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          profile_photo_url: data.user.profile_photo_url || "",
          notifications: {
            email: data.user.notifications?.email ?? true,
            in_app: data.user.notifications?.in_app ?? true,
            system_alerts: data.user.notifications?.system_alerts ?? true,
            user_activity_alerts: data.user.notifications?.user_activity_alerts ?? true
          },
          two_factor_enabled: data.user.two_factor_enabled ?? false
        });
      }
    } else {
      setSettingsStatus(data?.error || "Failed to save settings.");
    }
  };

  const handleProfilePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    setSettingsStatus(null);
    setAccountActionStatus(null);
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

      setSettingsForm((current) => ({
        ...current,
        profile_photo_url: fileUrl
      }));
      setSettingsStatus("Profile photo uploaded. Save changes to apply it.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAdminLogout = async () => {
    setAccountActionStatus(null);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    navigate("/login");
    window.location.reload();
  };

  const handleDeactivateAccount = async () => {
    setSettingsStatus(null);
    if (!window.confirm("Deactivate your admin account? You will be signed out immediately and will need another admin to restore access.")) {
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

    setAccountActionStatus("Account deactivated. Redirecting to login.");
    navigate("/login");
    window.location.reload();
  };

  const isDark = theme === "dark";
  const sectionShellClass = isDark
    ? "rounded-[1.5rem] border border-cyan-400/15 bg-slate-900/65 p-3 shadow-[0_18px_50px_rgba(8,15,30,0.4)] backdrop-blur-xl sm:p-4 flex flex-wrap gap-2"
    : "rounded-[1.5rem] border border-pink-200/60 bg-white/85 p-3 shadow-[0_18px_50px_rgba(236,72,153,0.08)] backdrop-blur-xl sm:p-4 flex flex-wrap gap-2";
  const filterLabelClass = isDark
    ? "text-xs font-semibold uppercase tracking-wider text-cyan-300"
    : "text-xs font-semibold uppercase tracking-wider text-pink-500";
  const selectClass = isDark
    ? "px-3 py-2 bg-slate-950/80 border border-cyan-400/20 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-300"
    : "px-3 py-2 bg-white border border-pink-100 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-pink-100 focus:border-pink-300";
  const tableShellClass = isDark
    ? "rounded-[1.5rem] border border-white/10 overflow-hidden bg-slate-900/70 shadow-[0_18px_50px_rgba(8,15,30,0.34)] backdrop-blur-xl"
    : "rounded-[1.5rem] border border-sky-200/60 overflow-hidden bg-white/90 shadow-[0_18px_50px_rgba(14,165,233,0.08)]";
  const activityTableShellClass = isDark
    ? "rounded-[1.5rem] border border-white/10 overflow-hidden bg-slate-900/70 shadow-[0_18px_50px_rgba(8,15,30,0.34)] backdrop-blur-xl"
    : "rounded-[1.5rem] border border-pink-200/60 overflow-hidden bg-white/90 shadow-[0_18px_50px_rgba(236,72,153,0.08)]";
  const tableHeaderClass = isDark
    ? "px-6 py-4 border-b border-white/10 flex justify-between items-center"
    : "px-6 py-4 border-b border-stone-100 flex justify-between items-center";
  const tableTitleClass = isDark ? "font-bold text-slate-100" : "font-bold";
  const tableCountClass = isDark ? "text-xs font-medium text-slate-500 uppercase tracking-wider" : "text-xs font-medium text-slate-400 uppercase tracking-wider";
  const tableTheadClass = isDark
    ? "bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400"
    : "bg-sky-50/80 text-xs uppercase tracking-wider text-slate-500";
  const activityTheadClass = isDark
    ? "bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400"
    : "bg-pink-50/80 text-xs uppercase tracking-wider text-slate-500";
  const tableRowClass = isDark ? "hover:bg-white/[0.03]" : "hover:bg-sky-50/50";
  const activityRowClass = isDark ? "hover:bg-white/[0.03]" : "hover:bg-pink-50/50";
  const primaryTextClass = isDark ? "text-slate-100" : "text-stone-700";
  const secondaryTextClass = isDark ? "text-slate-400" : "text-stone-400";
  const bodyTextClass = isDark ? "text-slate-300" : "text-stone-600";
  const sectionCardClass = isDark
    ? "bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-[0_18px_50px_rgba(8,15,30,0.34)] backdrop-blur-xl"
    : "bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm";
  const taskCardClass = isDark
    ? "p-6 border border-white/10 rounded-xl bg-slate-950/55 shadow-[0_10px_30px_rgba(8,15,30,0.18)] hover:shadow-[0_18px_42px_rgba(8,15,30,0.3)] hover:bg-slate-900/70 transition-all group"
    : "p-6 border border-stone-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-stone-50/50 transition-all group";
  const modalLabelClass = isDark
    ? "text-xs font-semibold uppercase tracking-wider text-slate-400"
    : "text-xs font-semibold uppercase tracking-wider text-stone-500";
  const modalInputClass = isDark
    ? "w-full px-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/15 focus:border-cyan-300 transition-all text-sm text-slate-100"
    : "w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm";
  const modalPanelClass = isDark
    ? "p-4 bg-white/[0.04] rounded-xl border border-white/10 space-y-3"
    : "p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3";

  return (
    <>
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-pink-200/60 bg-[linear-gradient(135deg,#111827_0%,#7c3aed_42%,#ec4899_100%)] px-6 py-7 text-white shadow-[0_24px_80px_rgba(236,72,153,0.18)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_white,_transparent_38%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-pink-100/80">Control Center</p>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-white/80">Manage talent tasks, reviews, sessions, and operational visibility.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingTask(true)}
            className="rounded-xl bg-white/15 px-4 py-2.5 font-medium flex items-center gap-2 backdrop-blur-sm hover:bg-white/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      </div>

      <div className={sectionShellClass}>
        {[
          { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: "tasks", label: "Tasks", icon: <ListChecks className="w-4 h-4" /> },
          { id: "sessions", label: "User Sessions", icon: <Users2 className="w-4 h-4" /> },
          { id: "logs", label: "Activity Logs", icon: <ActivityIcon className="w-4 h-4" /> },
          { id: "profile", label: "Profile & Settings", icon: <UserCircle className="w-4 h-4" /> }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => updateSection(item.id as typeof activeSection)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
              activeSection === item.id
                ? "bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] text-white border-transparent shadow-sm"
                : isDark
                  ? "bg-slate-950/80 text-slate-300 border-white/10 hover:border-cyan-300/40 hover:text-white"
                  : "bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

        {activeSection === "overview" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className={filterLabelClass}>Department Filter</div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={selectClass}
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>#{category}</option>
                ))}
              </select>
            </div>

            {effectiveAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsCard 
                  label="Total Tasks" 
                  value={effectiveAnalytics.total} 
                  icon={<FileText className="w-5 h-5" />} 
                  color="bg-stone-100"
                  dark={isDark}
                />
                <AnalyticsCard 
                  label="Completed" 
                  value={effectiveAnalytics.completed} 
                  icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} 
                  color="bg-emerald-50"
                  dark={isDark}
                />
                <AnalyticsCard 
                  label="Pending" 
                  value={effectiveAnalytics.pending} 
                  icon={<Clock className="w-5 h-5 text-amber-600" />} 
                  color="bg-amber-50"
                  dark={isDark}
                />
                <AnalyticsCard 
                  label="Rejected" 
                  value={(effectiveAnalytics as any).rejected || 0} 
                  icon={<XCircle className="w-5 h-5 text-red-600" />} 
                  color="bg-red-50"
                  dark={isDark}
                />
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className={tableShellClass}>
                <div className={tableHeaderClass}>
                  <h2 className={tableTitleClass}>Recent Sessions</h2>
                  <span className={tableCountClass}>{sessions.length} Sessions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={tableTheadClass}>
                      <tr>
                        <th className="text-left px-6 py-3">User</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Login</th>
                      </tr>
                    </thead>
                    <tbody className="p-4 space-y-4">
                      {sessions.slice(0, 6).map((session) => (
                        <tr key={session.id} className={tableRowClass}>
                          <td className="px-6 py-3">
                            <div className={`font-semibold ${primaryTextClass}`}>{session.user_name}</div>
                            <div className={`text-xs ${secondaryTextClass}`}>{session.user_email}</div>
                          </td>
                          <td className="px-6 py-3">
                            <StatusPill status={session.status} dark={isDark} />
                          </td>
                          <td className={`px-6 py-3 ${bodyTextClass}`}>
                            {session.login_at ? new Date(session.login_at).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={3} className={`px-6 py-10 text-center italic ${secondaryTextClass}`}>
                            No session data yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={activityTableShellClass}>
                <div className={tableHeaderClass}>
                  <h2 className={tableTitleClass}>Recent Activity</h2>
                  <span className={tableCountClass}>{activityLogs.length} Logs</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={activityTheadClass}>
                      <tr>
                        <th className="text-left px-6 py-3">User</th>
                        <th className="text-left px-6 py-3">Action</th>
                        <th className="text-left px-6 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="p-4 space-y-4">
                      {activityLogs.slice(0, 6).map((log) => (
                        <tr key={log.id} className={activityRowClass}>
                          <td className="px-6 py-3">
                            <div className={`font-semibold ${primaryTextClass}`}>{log.user_name}</div>
                            <div className={`text-xs ${secondaryTextClass}`}>{log.user_email}</div>
                          </td>
                          <td className={`px-6 py-3 ${primaryTextClass}`}>{log.action}</td>
                          <td className={`px-6 py-3 ${bodyTextClass}`}>
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))}
                      {activityLogs.length === 0 && (
                        <tr>
                          <td colSpan={3} className={`px-6 py-10 text-center italic ${secondaryTextClass}`}>
                            No activity logs yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === "sessions" && (
          <div className={sectionCardClass}>
            <div className={tableHeaderClass}>
              <h2 className={tableTitleClass}>User Sessions</h2>
              <span className={tableCountClass}>{sessions.length} Sessions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400" : "bg-stone-50 text-xs uppercase tracking-wider text-stone-500"}>
                  <tr>
                    <th className="text-left px-6 py-3">User</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Login Time</th>
                    <th className="text-left px-6 py-3">Last Activity</th>
                    <th className="text-left px-6 py-3">Logout Time</th>
                  </tr>
                </thead>
                <tbody className="p-4 space-y-4">
                  {sessions.map((session) => (
                    <tr key={session.id} className={isDark ? "hover:bg-white/[0.03]" : "hover:bg-stone-50/60"}>
                      <td className="px-6 py-3">
                        <div className={`font-semibold ${primaryTextClass}`}>{session.user_name}</div>
                        <div className={`text-xs ${secondaryTextClass}`}>{session.user_email}</div>
                      </td>
                      <td className="px-6 py-3">
                        <StatusPill status={session.status} dark={isDark} />
                      </td>
                      <td className={`px-6 py-3 ${bodyTextClass}`}>
                        {session.login_at ? new Date(session.login_at).toLocaleString() : "-"}
                      </td>
                      <td className={`px-6 py-3 ${bodyTextClass}`}>
                        {session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "-"}
                      </td>
                      <td className={`px-6 py-3 ${bodyTextClass}`}>
                        {session.logout_at ? new Date(session.logout_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className={`px-6 py-10 text-center italic ${secondaryTextClass}`}>
                        No session data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === "logs" && (
          <div className={sectionCardClass}>
            <div className={tableHeaderClass}>
              <h2 className={tableTitleClass}>Activity Logs</h2>
              <span className={tableCountClass}>{activityLogs.length} Logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400" : "bg-stone-50 text-xs uppercase tracking-wider text-stone-500"}>
                  <tr>
                    <th className="text-left px-6 py-3">User</th>
                    <th className="text-left px-6 py-3">Action</th>
                    <th className="text-left px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="p-4 space-y-4">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className={isDark ? "hover:bg-white/[0.03]" : "hover:bg-stone-50/60"}>
                      <td className="px-6 py-3">
                        <div className={`font-semibold ${primaryTextClass}`}>{log.user_name}</div>
                        <div className={`text-xs ${secondaryTextClass}`}>{log.user_email}</div>
                      </td>
                      <td className={`px-6 py-3 ${primaryTextClass}`}>{log.action}</td>
                      <td className={`px-6 py-3 ${bodyTextClass}`}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className={`px-6 py-10 text-center italic ${secondaryTextClass}`}>
                        No activity logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === "tasks" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className={filterLabelClass}>Department Filter</div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={isDark ? "px-3 py-2 bg-slate-950/80 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-300" : "px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900"}
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>#{category}</option>
                ))}
              </select>
            </div>

            <div className={sectionCardClass}>
              <div className={tableHeaderClass}>
                <h2 className={tableTitleClass}>Task Management</h2>
                <span className={tableCountClass}>{filteredTasks.length} Tasks</span>
              </div>
              <div className="p-4 space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className={taskCardClass}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-semibold text-lg ${isDark ? "text-slate-50" : ""}`}>{task.title}</h3>
                          <StatusBadge status={task.status} dark={isDark} />
                        </div>
                        <p className={`text-sm max-w-2xl ${isDark ? "text-slate-400" : "text-stone-500"}`}>{task.description}</p>
                        {task.categories && task.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.categories.map((category) => (
                              <span
                                key={`${task.id}-${category}`}
                                className={isDark ? "text-[10px] font-semibold uppercase tracking-wider bg-cyan-400/10 text-cyan-200 border border-cyan-400/20 px-2 py-1 rounded-full" : "text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200 px-2 py-1 rounded-full"}
                              >
                                #{category}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                          <div className={`flex items-center gap-1.5 text-xs ${secondaryTextClass}`}>
                            <Users className="w-3.5 h-3.5" />
                            Assigned to: <span className={`font-medium ${bodyTextClass}`}>{task.assigned_to_name || "Unassigned"}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${secondaryTextClass}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Created: <span className={`font-medium ${bodyTextClass}`}>{new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${secondaryTextClass}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Due: <span className={`font-medium ${bodyTextClass}`}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${secondaryTextClass}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Days Remaining: <span className={`font-medium ${bodyTextClass}`}>{getDaysRemainingLabel(task.due_date)}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${secondaryTextClass}`}>
                            <BarChart3 className="w-3.5 h-3.5" />
                            Priority: {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewSubmissions(task)}
                          className={isDark ? "p-2 text-cyan-300 hover:bg-cyan-400/10 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" : "p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"}
                        >
                          <Eye className="w-4 h-4" />
                          {task.status === TaskStatus.SUBMITTED ? "Review" : "Discuss"}
                        </button>
                        <button 
                          onClick={() => setEditingTask({ ...task, priority: task.priority || TaskPriority.MEDIUM })}
                          className={isDark ? "p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-all" : "p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className={isDark ? "p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-all" : "p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className={`p-12 text-center font-medium italic ${secondaryTextClass}`}>
                    No tasks match this category.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "profile" && (
          <AdminProfileSection
            adminUser={adminUser}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            settingsStatus={settingsStatus}
            accountActionStatus={accountActionStatus}
            isUploadingPhoto={isUploadingPhoto}
            adminSessions={adminSessions}
            adminActivityLogs={adminActivityLogs}
            onSaveSettings={handleSaveSettings}
            onUploadPhoto={handleProfilePhotoUpload}
            onChangePassword={() => navigate("/profile/change-password")}
            onLogout={handleAdminLogout}
            onDeactivate={handleDeactivateAccount}
            dark={isDark}
          />
        )}
      </div>
      {isAddingTask && (
        <Modal title="Create New Task" onClose={() => setIsAddingTask(false)} dark={isDark}>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Title</label>
              <input 
                required
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className={modalInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Description</label>
              <textarea 
                required
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className={`${modalInputClass} resize-none`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Assign To</label>
              <select 
                value={newTask.assigned_to}
                onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                className={modalInputClass}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Due Date</label>
              <input 
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                className={modalInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Priority</label>
              <select 
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                className={modalInputClass}
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Task Categories</label>
              <input 
                value={newTask.categories}
                onChange={e => setNewTask({ ...newTask, categories: e.target.value })}
                placeholder="#Video, #Design, #Copywriting"
                className={modalInputClass}
              />
            </div>
            <button type="submit" className={isDark ? "w-full bg-[linear-gradient(135deg,#06b6d4,#8b5cf6)] text-white py-2.5 rounded-lg font-medium hover:opacity-95 transition-all" : "w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all"}>
              Create Task
            </button>
          </form>
        </Modal>
      )}

      {editingTask && (
        <Modal title="Edit Task" onClose={() => setEditingTask(null)} dark={isDark}>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            handleUpdateTask({ ...editingTask, categories: parseCategories(editingCategories) }); 
          }} className="space-y-4">
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Title</label>
              <input 
                required
                value={editingTask.title}
                onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                className={modalInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Description</label>
              <textarea 
                required
                rows={3}
                value={editingTask.description}
                onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                className={`${modalInputClass} resize-none`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Assign To</label>
              <select 
                value={editingTask.assigned_to || ""}
                onChange={e => setEditingTask({ ...editingTask, assigned_to: e.target.value || null })}
                className={modalInputClass}
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Due Date</label>
              <input 
                type="date"
                value={toDateInputValue(editingTask.due_date)}
                onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value || null })}
                className={modalInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Priority</label>
              <select 
                value={editingTask.priority || TaskPriority.MEDIUM}
                onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                className={modalInputClass}
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Task Categories</label>
              <input 
                value={editingCategories}
                onChange={(e) => setEditingCategories(e.target.value)}
                placeholder="#Video, #Design, #Copywriting"
                className={modalInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Status</label>
              <select 
                value={editingTask.status}
                onChange={e => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                className={modalInputClass}
              >
                <option value={TaskStatus.PENDING}>Pending</option>
                <option value={TaskStatus.SUBMITTED}>Submitted</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
                <option value={TaskStatus.REJECTED}>Rejected</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={modalLabelClass}>Admin Feedback</label>
              <textarea 
                rows={2}
                value={editingTask.admin_feedback || ""}
                onChange={e => setEditingTask({ ...editingTask, admin_feedback: e.target.value })}
                className={`${modalInputClass} resize-none`}
                placeholder="Provide feedback for rejection or approval..."
              />
            </div>
            <button type="submit" className={isDark ? "w-full bg-[linear-gradient(135deg,#06b6d4,#8b5cf6)] text-white py-2.5 rounded-lg font-medium hover:opacity-95 transition-all" : "w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all"}>
              Save Changes
            </button>
          </form>
        </Modal>
      )}
      {viewingSubmissions && (
        <Modal title={`Review Submissions: ${viewingSubmissions.task.title}`} onClose={closeReviewModal} dark={isDark}>
          <div className="space-y-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {viewingSubmissions.submissions.map((sub) => (
                <div key={sub.id} className={modalPanelClass}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-stone-400"}`}>Submitted by {sub.user_name}</span>
                    <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-stone-400"}`}>{new Date(sub.submitted_at).toLocaleString()}</span>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-stone-700"}`}>{sub.content}</p>
                  {sub.document_url && (
                    <a 
                      href={sub.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={isDark ? "inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline" : "inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Attached Document
                    </a>
                  )}
                  {sub.attachments && sub.attachments.length > 0 && (
                    <div className="space-y-2">
                      {sub.attachments.map((file, index) => (
                        <a
                          key={`${file.file_url}-${index}`}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={isDark ? "block text-xs text-cyan-300 hover:underline" : "block text-xs text-blue-600 hover:underline"}
                        >
                          {file.original_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {viewingSubmissions.submissions.length === 0 && (
                <div className={`text-center py-8 italic ${isDark ? "text-slate-500" : "text-stone-400"}`}>No submissions found.</div>
              )}
            </div>

            <div className={`space-y-3 pt-4 border-t ${isDark ? "border-white/10" : "border-stone-100"}`}>
              <div className="flex items-center justify-between">
                <p className={modalLabelClass}>Discussion</p>
                {replyTo && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className={isDark ? "text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-200" : "text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-700"}
                  >
                    Cancel Reply
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {isLoadingComments && (
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-stone-400"}`}>Loading comments...</p>
                )}
                {!isLoadingComments && comments.length === 0 && (
                  <p className={`text-xs italic ${isDark ? "text-slate-500" : "text-stone-400"}`}>No comments yet.</p>
                )}
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{ marginLeft: commentDepth(comment) * 16 }}
                    className={isDark ? "border border-white/10 bg-white/[0.04] rounded-lg px-3 py-2" : "border border-stone-100 bg-stone-50 rounded-lg px-3 py-2"}
                  >
                    <div className={`flex items-center justify-between text-[10px] uppercase tracking-widest ${isDark ? "text-slate-500" : "text-stone-400"}`}>
                      <span>{comment.user_name} · {comment.user_role}</span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className={`text-xs mt-1 whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-stone-700"}`}>{comment.content}</p>
                    <button
                      type="button"
                      onClick={() => setReplyTo(comment)}
                      className={isDark ? "mt-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-300 hover:text-cyan-100" : "mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 hover:text-stone-800"}
                    >
                      Reply
                    </button>
                  </div>
                ))}
              </div>
              {replyTo && (
                <div className={`text-[10px] uppercase tracking-widest ${isDark ? "text-slate-500" : "text-stone-400"}`}>
                  Replying to {replyTo.user_name}
                </div>
              )}
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment or reply..."
                className={`${modalInputClass} resize-none`}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePostComment}
                  className={isDark ? "px-4 py-2 bg-[linear-gradient(135deg,#06b6d4,#8b5cf6)] text-white rounded-lg text-xs font-semibold uppercase tracking-widest hover:opacity-95" : "px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-stone-800"}
                >
                  Post Comment
                </button>
              </div>
            </div>
            
            <div className={`space-y-4 pt-4 border-t ${isDark ? "border-white/10" : "border-stone-100"}`}>
              <div className="space-y-1.5">
                <label className={modalLabelClass}>Admin Feedback</label>
                <textarea 
                  id="review-feedback"
                  rows={2}
                  className={`${modalInputClass} resize-none`}
                  placeholder="Reason for approval or rejection..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    const feedback = (document.getElementById("review-feedback") as HTMLTextAreaElement).value;
                    handleRejectTask(viewingSubmissions.task, feedback);
                  }}
                  className={isDark ? "py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-rose-400/20 text-rose-200 hover:bg-rose-400/10 transition-all flex items-center justify-center gap-2" : "py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"}
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button 
                  onClick={() => {
                    const feedback = (document.getElementById("review-feedback") as HTMLTextAreaElement).value;
                    handleApproveTask({ ...viewingSubmissions.task, admin_feedback: feedback });
                  }}
                  className={isDark ? "py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-[linear-gradient(135deg,#10b981,#06b6d4)] text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-sm" : "py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm"}
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AdminProfileSection({
  adminUser,
  settingsForm,
  setSettingsForm,
  settingsStatus,
  accountActionStatus,
  isUploadingPhoto,
  adminSessions,
  adminActivityLogs,
  onSaveSettings,
  onUploadPhoto,
  onChangePassword,
  onLogout,
  onDeactivate,
  dark
}: {
  adminUser: User | null;
  settingsForm: UserSettingsUpdate;
  setSettingsForm: React.Dispatch<React.SetStateAction<UserSettingsUpdate>>;
  settingsStatus: string | null;
  accountActionStatus: string | null;
  isUploadingPhoto: boolean;
  adminSessions: UserSession[];
  adminActivityLogs: ActivityLog[];
  onSaveSettings: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onChangePassword: () => void;
  onLogout: () => void;
  onDeactivate: () => void;
  dark: boolean;
}) {
  const permissions = [
    "Manage tasks and reviews",
    "Access session and activity logs",
    "Assign work across teams",
    "Maintain personal security controls"
  ];

  const securityLabel = settingsForm.two_factor_enabled ? "Hardened" : "2FA required";
  const cardShellClass = dark
    ? "rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.94)_100%)] shadow-[0_22px_65px_rgba(8,15,30,0.34)] backdrop-blur-xl"
    : "rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.92)_100%)] shadow-[0_22px_65px_rgba(15,23,42,0.12)] backdrop-blur-xl";
  const panelClass = dark
    ? "rounded-2xl border border-white/10 bg-slate-950/55 shadow-[0_10px_30px_rgba(8,15,30,0.22)]"
    : "rounded-2xl border border-slate-200/80 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.06)]";
  const softPanelClass = dark
    ? "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82)_0%,rgba(2,6,23,0.86)_100%)] shadow-[0_10px_24px_rgba(8,15,30,0.2)]"
    : "rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.88)_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.05)]";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-pink-200/60 bg-[linear-gradient(135deg,#111827_0%,#7c3aed_42%,#ec4899_100%)] shadow-[0_24px_80px_rgba(236,72,153,0.18)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_white,_transparent_38%)]" />
        <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-stone-50">
          <div className="flex items-center gap-4">
            {settingsForm.profile_photo_url ? (
              <img
                src={settingsForm.profile_photo_url}
                alt={settingsForm.name || "Admin profile"}
                className="w-16 h-16 rounded-2xl object-cover border border-white/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-stone-50 flex items-center justify-center text-2xl font-bold">
                {(adminUser?.name || "A").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-pink-100/80">Control Center</p>
              <h2 className="text-2xl font-semibold">{settingsForm.name || adminUser?.name || "Admin User"}</h2>
              <p className="text-sm text-stone-200">{settingsForm.email || adminUser?.email || "admin@company.com"}</p>
              <span className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-[0.2em]">
                <Settings className="w-3.5 h-3.5" />
                {adminUser?.role || "admin"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Recent Logins" value={adminSessions.length} />
            <StatCard label="Security" value={securityLabel} />
            <StatCard label="Permissions" value={permissions.length} hiddenOnMobile />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b flex items-center justify-between ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Basic Information</p>
                <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Identity & profile</h3>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>Admin</span>
            </div>
            <div className="p-6 space-y-6">
              <div className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${softPanelClass}`}>
                <div className="flex items-center gap-4">
                  {settingsForm.profile_photo_url ? (
                    <img
                      src={settingsForm.profile_photo_url}
                      alt={settingsForm.name || "Admin profile"}
                      className={`w-14 h-14 rounded-2xl object-cover border ${dark ? "border-white/10" : "border-slate-200"}`}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] text-stone-50 flex items-center justify-center text-lg font-semibold">
                      {(settingsForm.name || adminUser?.name || "A").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Profile photo</p>
                    <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Upload a square image to personalize your admin account.</p>
                  </div>
                </div>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 ${dark ? "border-white/10 bg-slate-950/65 text-slate-200 hover:border-cyan-300/40 hover:text-white hover:shadow-[0_12px_24px_rgba(6,182,212,0.14)]" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(14,165,233,0.14)]"}`}>
                  <Upload className="w-4 h-4" />
                  {isUploadingPhoto ? "Uploading..." : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onUploadPhoto(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField label="Name" value={settingsForm.name} onChange={(value) => setSettingsForm({ ...settingsForm, name: value })} dark={dark} />
                <ProfileField label="Email" type="email" value={settingsForm.email} onChange={(value) => setSettingsForm({ ...settingsForm, email: value })} dark={dark} />
                <ProfileField label="Phone" type="tel" value={settingsForm.phone || ""} onChange={(value) => setSettingsForm({ ...settingsForm, phone: value })} dark={dark} />
                <ProfileField label="Profile photo URL" value={settingsForm.profile_photo_url || ""} onChange={(value) => setSettingsForm({ ...settingsForm, profile_photo_url: value })} dark={dark} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{settingsStatus || "Changes apply immediately after you save them."}</p>
                <button
                  type="button"
                  onClick={onSaveSettings}
                  className="sm:w-auto w-full rounded-xl bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] px-6 py-2.5 text-sm font-semibold text-stone-50 shadow-[0_14px_30px_rgba(168,85,247,0.28)] transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  Save Basic Info
                </button>
              </div>
            </div>
          </div>

          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-pink-500">Preferences</p>
              <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Notification routing</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleCard
                title="Email delivery"
                description="Get admin notices by email."
                checked={settingsForm.notifications.email}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, email: checked } })}
                dark={dark}
              />
              <ToggleCard
                title="In-app delivery"
                description="Surface alerts inside the dashboard."
                checked={settingsForm.notifications.in_app}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, in_app: checked } })}
                dark={dark}
              />
              <ToggleCard
                title="System alerts"
                description="Notify me about platform and security events."
                checked={settingsForm.notifications.system_alerts ?? true}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, system_alerts: checked } })}
                dark={dark}
              />
              <ToggleCard
                title="User activity alerts"
                description="Track submissions, approvals, and user changes."
                checked={settingsForm.notifications.user_activity_alerts ?? true}
                onChange={(checked) => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, user_activity_alerts: checked } })}
                dark={dark}
              />
            </div>
          </div>

          <div className={`overflow-hidden ${cardShellClass}`}>
            <div className={`flex items-center justify-between border-b px-6 py-4 ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-violet-500">Security Logs</p>
                <h3 className={`font-bold ${dark ? "text-slate-100" : "text-slate-900"}`}>Login Activity</h3>
              </div>
              <span className={`text-xs font-medium uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>{adminActivityLogs.length} Logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={dark ? "bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400" : "bg-[linear-gradient(90deg,rgba(244,114,182,0.08),rgba(99,102,241,0.08))] text-xs uppercase tracking-wider text-slate-500"}>
                  <tr>
                    <th className="text-left px-6 py-3">Action</th>
                    <th className="text-left px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="p-4 space-y-4">
                  {adminActivityLogs.slice(0, 8).map((log) => (
                    <tr key={log.id} className={`transition-colors ${dark ? "hover:bg-white/[0.03]" : "hover:bg-violet-50/50"}`}>
                      <td className={`px-6 py-3 ${dark ? "text-slate-200" : "text-slate-700"}`}>{log.action}</td>
                      <td className={`px-6 py-3 ${dark ? "text-slate-400" : "text-slate-600"}`}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {adminActivityLogs.length === 0 && (
                    <tr>
                        <td colSpan={2} className={`px-6 py-10 text-center italic ${dark ? "text-slate-500" : "text-slate-400"}`}>
                        No activity logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Security</p>
              <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Admin safeguards</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className={`flex items-center justify-between px-4 py-3 ${softPanelClass}`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-violet-600" />
                  <div>
                    <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Two-factor authentication</p>
                    <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Recommended for every admin account and saved with your profile.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.two_factor_enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, two_factor_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </div>
              <div className={`${panelClass} px-4 py-4 space-y-3`}>
                <div>
                  <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>Change password</p>
                  <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Rotate your password regularly and after sensitive access changes.</p>
                </div>
                <button
                  type="button"
                  onClick={onChangePassword}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,#0ea5e9,#8b5cf6)] py-2.5 text-sm font-semibold text-stone-50 shadow-[0_14px_28px_rgba(59,130,246,0.22)] transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  Go to Change Password
                </button>
              </div>
            </div>
          </div>

          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-500">Recent Logins</p>
              <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Session visibility</h3>
            </div>
            <div className="p-6 space-y-3">
              {adminSessions.slice(0, 5).map((session) => (
                <div key={session.id} className={`${panelClass} px-4 py-3 text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>{session.status === "active" ? "Active session" : "Signed out"}</span>
                    <span>{session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "-"}</span>
                  </div>
                  <p className={`mt-1 text-[11px] ${dark ? "text-slate-500" : "text-slate-500"}`}>{session.ip_address || "IP unavailable"} · {session.user_agent || "Browser unavailable"}</p>
                </div>
              ))}
              {adminSessions.length === 0 && (
                <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>No session data available.</p>
              )}
            </div>
          </div>

          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-pink-500">Admin Controls</p>
              <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Role & permissions</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className={`${panelClass} px-4 py-4`}>
                <p className={`text-xs uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>Manage own role</p>
                <p className={`mt-2 text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>{adminUser?.role || "admin"}</p>
                <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Role changes should be confirmed by another admin or directory owner.</p>
              </div>
              <div className={`${panelClass} px-4 py-4`}>
                <p className={`text-xs uppercase tracking-widest ${dark ? "text-slate-500" : "text-slate-400"}`}>View permissions assigned</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {permissions.map((permission) => (
                    <span key={permission} className={dark ? "rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-200 shadow-[0_6px_14px_rgba(6,182,212,0.08)]" : "rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-[11px] font-medium text-sky-700 shadow-[0_6px_14px_rgba(14,165,233,0.08)]"}>
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={cardShellClass}>
            <div className={`px-6 py-5 border-b ${dark ? "border-white/10" : "border-slate-200/70"}`}>
              <p className="text-xs uppercase tracking-[0.3em] text-rose-500">Account Actions</p>
              <h3 className={`text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Session & account controls</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                type="button"
                onClick={onLogout}
                className={dark ? "w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/65 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-cyan-300/40 hover:text-white hover:shadow-[0_12px_24px_rgba(14,165,233,0.12)]" : "w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:text-slate-900 hover:shadow-[0_12px_24px_rgba(14,165,233,0.12)]"}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              <button
                type="button"
                onClick={onDeactivate}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.95)_0%,rgba(254,226,226,0.9)_100%)] px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(239,68,68,0.14)]"
              >
                <Power className="w-4 h-4" />
                Deactivate own account
              </button>
              <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>{accountActionStatus || "Deactivation signs you out immediately and should only be used when another admin can restore access if needed."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  dark = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dark?: boolean;
}) {
  return (
    <div>
      <label className={`text-xs font-semibold uppercase tracking-[0.24em] ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={dark ? "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-slate-100 shadow-[0_6px_16px_rgba(8,15,30,0.18)] transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 focus:border-cyan-300" : "mt-1 w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.04)] transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"}
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  dark = false
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  dark?: boolean;
}) {
  return (
    <div className={dark ? "flex items-center justify-between rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82)_0%,rgba(2,6,23,0.86)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(8,15,30,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(8,15,30,0.24)]" : "flex items-center justify-between rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.88)_100%)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(15,23,42,0.08)]"}>
      <div>
        <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>{title}</p>
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
    </div>
  );
}

function StatCard({
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

function AnalyticsCard({ label, value, icon, color, dark = false }: { label: string, value: string | number, icon: React.ReactNode, color: string, dark?: boolean }) {
  return (
    <div className={dark ? "rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_18px_55px_rgba(8,15,30,0.32)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(8,15,30,0.38)]" : `rounded-[1.5rem] border border-white/10 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)] ${color}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={dark ? "rounded-xl border border-white/10 bg-white/6 p-2.5 shadow-[0_10px_24px_rgba(8,15,30,0.18)]" : "rounded-xl border border-white/50 bg-white/75 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"}>
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
        <p className={`text-2xl font-bold tracking-tight ${dark ? "text-slate-50" : "text-slate-950"}`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, dark = false }: { status: TaskStatus; dark?: boolean }) {
  const styles = {
    [TaskStatus.PENDING]: dark ? "bg-amber-500/10 text-amber-200 border-amber-400/20" : "bg-amber-50 text-amber-700 border-amber-100",
    [TaskStatus.SUBMITTED]: dark ? "bg-blue-500/10 text-blue-200 border-blue-400/20" : "bg-blue-50 text-blue-700 border-blue-100",
    [TaskStatus.COMPLETED]: dark ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/20" : "bg-emerald-50 text-emerald-700 border-emerald-100",
    [TaskStatus.REJECTED]: dark ? "bg-red-500/10 text-rose-200 border-rose-400/20" : "bg-red-50 text-red-700 border-red-100"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
}

function StatusPill({ status, dark = false }: { status: "active" | "offline"; dark?: boolean }) {
  const styles = {
    active: dark ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/20" : "bg-emerald-50 text-emerald-700 border-emerald-100",
    offline: dark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-stone-100 text-stone-600 border-stone-200"
  };
  const labels = {
    active: "Active",
    offline: "Offline"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}


function Modal({ title, children, onClose, dark = false }: { title: string, children: React.ReactNode, onClose: () => void, dark?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={dark ? "max-h-[85vh] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.98)_100%)] shadow-[0_30px_90px_rgba(8,15,30,0.42)]" : "max-h-[85vh] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_100%)] shadow-[0_30px_90px_rgba(15,23,42,0.22)]"}
      >
        <div className={dark ? "flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-6 py-4" : "flex items-center justify-between border-b border-slate-200/80 bg-[linear-gradient(90deg,rgba(14,165,233,0.08),rgba(236,72,153,0.08))] px-6 py-4"}>
          <h3 className={`font-bold ${dark ? "text-slate-100" : "text-slate-900"}`}>{title}</h3>
          <button onClick={onClose} className={`transition-colors ${dark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}>
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="max-h-[calc(85vh-4rem)] overflow-y-auto p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
















