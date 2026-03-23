import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckCircle, Clock, Send, BarChart3, Trash2, Edit2, Users, FileText, Eye, XCircle, ExternalLink, LayoutDashboard, ListChecks, Activity as ActivityIcon, Users2, Settings, UserCircle } from "lucide-react";
import { motion } from "motion/react";
import { Task, Analytics, User, TaskStatus, Submission, TaskPriority, TaskComment, UserSession, ActivityLog, UserSettingsUpdate } from "../../types";

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [settingsForm, setSettingsForm] = useState<UserSettingsUpdate>({
    name: "",
    email: "",
    notifications: { email: true, in_app: true },
    two_factor_enabled: false
  });
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
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
  const navigate = useNavigate();

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
    if (!viewingSubmissions?.task) return;
    fetchComments(viewingSubmissions.task.id);
  }, [viewingSubmissions?.task?.id]);

  useEffect(() => {
    if (!editingTask) return;
    setEditingCategories(formatCategories(editingTask.categories));
  }, [editingTask?.id]);

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
      if (data?.user) {
        setAdminUser(data.user);
      }
    } else {
      setSettingsStatus(data?.error || "Failed to save settings.");
    }
  };

  return (
    <>
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-stone-500 mt-1">Manage talent tasks and track performance</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingTask(true)}
          className="bg-stone-900 text-stone-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-stone-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-wrap gap-2">
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
            onClick={() => setActiveSection(item.id as typeof activeSection)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
              activeSection === item.id
                ? "bg-stone-900 text-stone-50 border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
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
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Department Filter</div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900"
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
                />
                <AnalyticsCard 
                  label="Completed" 
                  value={effectiveAnalytics.completed} 
                  icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} 
                  color="bg-emerald-50"
                />
                <AnalyticsCard 
                  label="Pending" 
                  value={effectiveAnalytics.pending} 
                  icon={<Clock className="w-5 h-5 text-amber-600" />} 
                  color="bg-amber-50"
                />
                <AnalyticsCard 
                  label="Rejected" 
                  value={(effectiveAnalytics as any).rejected || 0} 
                  icon={<XCircle className="w-5 h-5 text-red-600" />} 
                  color="bg-red-50"
                />
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                  <h2 className="font-bold">Recent Sessions</h2>
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{sessions.length} Sessions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-6 py-3">User</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Login</th>
                      </tr>
                    </thead>
                    <tbody className="p-4 space-y-4">
                      {sessions.slice(0, 6).map((session) => (
                        <tr key={session.id} className="hover:bg-stone-50/60">
                          <td className="px-6 py-3">
                            <div className="font-semibold text-stone-700">{session.user_name}</div>
                            <div className="text-xs text-stone-400">{session.user_email}</div>
                          </td>
                          <td className="px-6 py-3">
                            <StatusPill status={session.status} />
                          </td>
                          <td className="px-6 py-3 text-stone-600">
                            {session.login_at ? new Date(session.login_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-stone-400 italic">
                            No session data yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                  <h2 className="font-bold">Recent Activity</h2>
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{activityLogs.length} Logs</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-6 py-3">User</th>
                        <th className="text-left px-6 py-3">Action</th>
                        <th className="text-left px-6 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="p-4 space-y-4">
                      {activityLogs.slice(0, 6).map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50/60">
                          <td className="px-6 py-3">
                            <div className="font-semibold text-stone-700">{log.user_name}</div>
                            <div className="text-xs text-stone-400">{log.user_email}</div>
                          </td>
                          <td className="px-6 py-3 text-stone-700">{log.action}</td>
                          <td className="px-6 py-3 text-stone-600">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                      {activityLogs.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-stone-400 italic">
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
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-bold">User Sessions</h2>
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{sessions.length} Sessions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
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
                    <tr key={session.id} className="hover:bg-stone-50/60">
                      <td className="px-6 py-3">
                        <div className="font-semibold text-stone-700">{session.user_name}</div>
                        <div className="text-xs text-stone-400">{session.user_email}</div>
                      </td>
                      <td className="px-6 py-3">
                        <StatusPill status={session.status} />
                      </td>
                      <td className="px-6 py-3 text-stone-600">
                        {session.login_at ? new Date(session.login_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-stone-600">
                        {session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-stone-600">
                        {session.logout_at ? new Date(session.logout_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-stone-400 italic">
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
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-bold">Activity Logs</h2>
              <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{activityLogs.length} Logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-6 py-3">User</th>
                    <th className="text-left px-6 py-3">Action</th>
                    <th className="text-left px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="p-4 space-y-4">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60">
                      <td className="px-6 py-3">
                        <div className="font-semibold text-stone-700">{log.user_name}</div>
                        <div className="text-xs text-stone-400">{log.user_email}</div>
                      </td>
                      <td className="px-6 py-3 text-stone-700">{log.action}</td>
                      <td className="px-6 py-3 text-stone-600">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-stone-400 italic">
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
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Department Filter</div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>#{category}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                <h2 className="font-bold">Task Management</h2>
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{filteredTasks.length} Tasks</span>
              </div>
              <div className="p-4 space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="p-6 border border-stone-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-stone-50/50 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-stone-500 text-sm max-w-2xl">{task.description}</p>
                        {task.categories && task.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {task.categories.map((category) => (
                              <span
                                key={`${task.id}-${category}`}
                                className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200 px-2 py-1 rounded-full"
                              >
                                #{category}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <Users className="w-3.5 h-3.5" />
                            Assigned to: <span className="text-stone-600 font-medium">{task.assigned_to_name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <Clock className="w-3.5 h-3.5" />
                            Created: <span className="text-stone-600 font-medium">{new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <Clock className="w-3.5 h-3.5" />
                            Due: <span className="text-stone-600 font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <Clock className="w-3.5 h-3.5" />
                            Days Remaining: <span className="text-stone-600 font-medium">{getDaysRemainingLabel(task.due_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-400">
                            <BarChart3 className="w-3.5 h-3.5" />
                            Priority: {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewSubmissions(task)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                        >
                          <Eye className="w-4 h-4" />
                          {task.status === TaskStatus.SUBMITTED ? "Review" : "Discuss"}
                        </button>
                        <button 
                          onClick={() => setEditingTask({ ...task, priority: task.priority || TaskPriority.MEDIUM })}
                          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="p-12 text-center text-stone-400 font-medium italic">
                    No tasks match this category.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === "profile" && (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-3xl border border-stone-200 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700" />
              <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
              <div className="relative px-6 py-8 sm:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-stone-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-stone-50 flex items-center justify-center text-2xl font-bold">
                    {(adminUser?.name || "A").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-stone-200">Profile</p>
                    <h2 className="text-2xl font-semibold">{adminUser?.name || "Admin User"}</h2>
                    <p className="text-sm text-stone-200">{adminUser?.email || "admin@company.com"}</p>
                    <span className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase tracking-[0.2em]">
                      <Settings className="w-3.5 h-3.5" />
                      {adminUser?.role || "admin"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">Sessions</p>
                    <p className="text-2xl font-semibold">{adminSessions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-200">Activity Logs</p>
                    <p className="text-2xl font-semibold">{adminActivityLogs.length}</p>
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
                    <h3 className="text-lg font-semibold text-stone-900">Profile Details</h3>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Primary</span>
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
                        <p className="text-xs text-stone-500">Product updates and admin alerts.</p>
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
                    <h3 className="text-lg font-semibold text-stone-900">Protect Your Account</h3>
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
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Change password</p>
                        <p className="text-xs text-stone-500">We recommend updating it regularly.</p>
                      </div>
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
                    {adminSessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                        <span className="font-semibold text-stone-700">{session.status === "active" ? "Active" : "Offline"}</span>
                        <span>{session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "—"}</span>
                      </div>
                    ))}
                    {adminSessions.length === 0 && (
                      <p className="text-xs text-stone-400">No sessions available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-bold">Your Recent Activity</h3>
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{adminActivityLogs.length} Logs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="text-left px-6 py-3">Action</th>
                      <th className="text-left px-6 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="p-4 space-y-4">
                    {adminActivityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/60">
                        <td className="px-6 py-3 text-stone-700">{log.action}</td>
                        <td className="px-6 py-3 text-stone-600">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {adminActivityLogs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-10 text-center text-stone-400 italic">
                          No activity logs yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {isAddingTask && (
        <Modal title="Create New Task" onClose={() => setIsAddingTask(false)}>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Title</label>
              <input 
                required
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Description</label>
              <textarea 
                required
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Assign To</label>
              <select 
                value={newTask.assigned_to}
                onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Due Date</label>
              <input 
                type="date"
                value={newTask.due_date}
                onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Priority</label>
              <select 
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Task Categories</label>
              <input 
                value={newTask.categories}
                onChange={e => setNewTask({ ...newTask, categories: e.target.value })}
                placeholder="#Video, #Design, #Copywriting"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <button type="submit" className="w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all">
              Create Task
            </button>
          </form>
        </Modal>
      )}

      {editingTask && (
        <Modal title="Edit Task" onClose={() => setEditingTask(null)}>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            handleUpdateTask({ ...editingTask, categories: parseCategories(editingCategories) }); 
          }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Title</label>
              <input 
                required
                value={editingTask.title}
                onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Description</label>
              <textarea 
                required
                rows={3}
                value={editingTask.description}
                onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Assign To</label>
              <select 
                value={editingTask.assigned_to || ""}
                onChange={e => setEditingTask({ ...editingTask, assigned_to: e.target.value || null })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Due Date</label>
              <input 
                type="date"
                value={toDateInputValue(editingTask.due_date)}
                onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value || null })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Priority</label>
              <select 
                value={editingTask.priority || TaskPriority.MEDIUM}
                onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Task Categories</label>
              <input 
                value={editingCategories}
                onChange={(e) => setEditingCategories(e.target.value)}
                placeholder="#Video, #Design, #Copywriting"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Status</label>
              <select 
                value={editingTask.status}
                onChange={e => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value={TaskStatus.PENDING}>Pending</option>
                <option value={TaskStatus.SUBMITTED}>Submitted</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
                <option value={TaskStatus.REJECTED}>Rejected</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Admin Feedback</label>
              <textarea 
                rows={2}
                value={editingTask.admin_feedback || ""}
                onChange={e => setEditingTask({ ...editingTask, admin_feedback: e.target.value })}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
                placeholder="Provide feedback for rejection or approval..."
              />
            </div>
            <button type="submit" className="w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all">
              Save Changes
            </button>
          </form>
        </Modal>
      )}
      {viewingSubmissions && (
        <Modal title={`Review Submissions: ${viewingSubmissions.task.title}`} onClose={closeReviewModal}>
          <div className="space-y-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {viewingSubmissions.submissions.map((sub) => (
                <div key={sub.id} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Submitted by {sub.user_name}</span>
                    <span className="text-[10px] text-stone-400">{new Date(sub.submitted_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{sub.content}</p>
                  {sub.document_url && (
                    <a 
                      href={sub.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
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
                          className="block text-xs text-blue-600 hover:underline"
                        >
                          {file.original_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {viewingSubmissions.submissions.length === 0 && (
                <div className="text-center py-8 text-stone-400 italic">No submissions found.</div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Discussion</p>
                {replyTo && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-700"
                  >
                    Cancel Reply
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {isLoadingComments && (
                  <p className="text-xs text-stone-400">Loading comments...</p>
                )}
                {!isLoadingComments && comments.length === 0 && (
                  <p className="text-xs text-stone-400 italic">No comments yet.</p>
                )}
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{ marginLeft: commentDepth(comment) * 16 }}
                    className="border border-stone-100 bg-stone-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-widest">
                      <span>{comment.user_name} � {comment.user_role}</span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                    <button
                      type="button"
                      onClick={() => setReplyTo(comment)}
                      className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 hover:text-stone-800"
                    >
                      Reply
                    </button>
                  </div>
                ))}
              </div>
              {replyTo && (
                <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                  Replying to {replyTo.user_name}
                </div>
              )}
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment or reply..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePostComment}
                  className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-semibold uppercase tracking-widest hover:bg-stone-800"
                >
                  Post Comment
                </button>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Admin Feedback</label>
                <textarea 
                  id="review-feedback"
                  rows={2}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
                  placeholder="Reason for approval or rejection..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    const feedback = (document.getElementById("review-feedback") as HTMLTextAreaElement).value;
                    handleRejectTask(viewingSubmissions.task, feedback);
                  }}
                  className="py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button 
                  onClick={() => {
                    const feedback = (document.getElementById("review-feedback") as HTMLTextAreaElement).value;
                    handleApproveTask({ ...viewingSubmissions.task, admin_feedback: feedback });
                  }}
                  className="py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm"
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

function AnalyticsCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className={`p-6 rounded-2xl border border-stone-200 shadow-sm ${color}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-lg border border-stone-100 shadow-sm">
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const styles = {
    [TaskStatus.PENDING]: "bg-amber-50 text-amber-700 border-amber-100",
    [TaskStatus.SUBMITTED]: "bg-blue-50 text-blue-700 border-blue-100",
    [TaskStatus.COMPLETED]: "bg-emerald-50 text-emerald-700 border-emerald-100",
    [TaskStatus.REJECTED]: "bg-red-50 text-red-700 border-red-100"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
}

function StatusPill({ status }: { status: "active" | "offline" }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    offline: "bg-stone-100 text-stone-600 border-stone-200"
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


function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-4rem)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}















