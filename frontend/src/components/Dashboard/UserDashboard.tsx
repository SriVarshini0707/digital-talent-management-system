import React, { useState, useEffect, useMemo } from "react";
import { Task, TaskPriority, TaskStatus, Attachment, TaskComment } from "../../types";
import { Clock, Send, CheckCircle, FileText, ArrowRight, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewPreset, setViewPreset] = useState<"all" | "dueSoon" | "highPriority" | "needsRevision">("all");
  const [drafts, setDrafts] = useState<Record<string, { content: string; documentUrl: string; savedAt: string }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activePanel, setActivePanel] = useState<"tasks" | "views" | "notifications" | "achievements" | "calendar" | "progress">("tasks");

  const closeSubmissionModal = () => {
    setSubmittingTask(null);
    setSubmissionContent("");
    setDocumentUrl("");
    setAttachments([]);
    setComments([]);
    setCommentText("");
    setReplyTo(null);
  };

  const closeViewingModal = () => {
    setViewingTask(null);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dtms:user:drafts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setDrafts(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dtms:user:notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setNotes(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (!submittingTask) return;
    const draft = drafts[submittingTask.id];
    if (draft) {
      setSubmissionContent(draft.content || "");
      setDocumentUrl(draft.documentUrl || "");
    }
  }, [submittingTask?.id, drafts]);

  useEffect(() => {
    fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "Viewed dashboard" })
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!submittingTask) return;
    fetchComments(submittingTask.id);
  }, [submittingTask?.id]);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks", { credentials: "include" });
    const data = await res.json();
    if (Array.isArray(data)) {
      setTasks(data);
    } else {
      console.error("Expected array of tasks, got:", data);
      setTasks([]);
    }
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

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append("files", file));
      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.files)) {
        setAttachments(prev => [...prev, ...data.files]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostComment = async () => {
    if (!submittingTask || !commentText.trim()) return;
    const res = await fetch(`/api/tasks/${submittingTask.id}/comments`, {
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
      fetchComments(submittingTask.id);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          task_id: submittingTask.id, 
          content: submissionContent,
          document_url: documentUrl,
          attachments
        })
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          const nextDrafts = { ...drafts };
          delete nextDrafts[submittingTask.id];
          setDrafts(nextDrafts);
          window.localStorage.setItem("dtms:user:drafts", JSON.stringify(nextDrafts));
        }
        closeSubmissionModal();
        fetchTasks();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!submittingTask) return;
    const updated = {
      ...drafts,
      [submittingTask.id]: {
        content: submissionContent,
        documentUrl,
        savedAt: new Date().toISOString()
      }
    };
    setDrafts(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dtms:user:drafts", JSON.stringify(updated));
    }
  };

  const handleSaveNote = (taskId: string, value: string) => {
    const updated = { ...notes, [taskId]: value };
    setNotes(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dtms:user:notes", JSON.stringify(updated));
    }
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

  const canSubmitTask = (task?: Task | null) => !!task && (
    task.status === TaskStatus.PENDING || task.status === TaskStatus.REJECTED
  );

  const canSubmit = canSubmitTask(submittingTask);

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

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return tasks.filter((task) => {
      if (viewPreset === "needsRevision" && task.status !== TaskStatus.REJECTED) return false;
      if (viewPreset === "highPriority" && ![TaskPriority.HIGH, TaskPriority.URGENT].includes(task.priority || TaskPriority.MEDIUM)) {
        return false;
      }
      if (viewPreset === "dueSoon") {
        if (task.status === TaskStatus.COMPLETED) return false;
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        if (Number.isNaN(due.getTime())) return false;
        const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 3) return false;
      }
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && (task.priority || TaskPriority.MEDIUM) !== priorityFilter) return false;
      if (!query) return true;
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      );
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery, viewPreset]);

  const presetCounts = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueSoon = tasks.filter((task) => {
      if (task.status === TaskStatus.COMPLETED) return false;
      if (!task.due_date) return false;
      const due = new Date(task.due_date);
      if (Number.isNaN(due.getTime())) return false;
      const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).length;
    const highPriority = tasks.filter((task) => [TaskPriority.HIGH, TaskPriority.URGENT].includes(task.priority || TaskPriority.MEDIUM)).length;
    const needsRevision = tasks.filter((task) => task.status === TaskStatus.REJECTED).length;
    return { dueSoon, highPriority, needsRevision };
  }, [tasks]);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; body: string; tone: "alert" | "info" | "neutral" }[] = [];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    tasks.forEach((task) => {
      if (task.status === TaskStatus.REJECTED) {
        items.push({
          id: `${task.id}-rejected`,
          title: "Revision requested",
          body: `"${task.title}" needs updates from admin feedback.`,
          tone: "alert"
        });
      }

      if (task.due_date && task.status !== TaskStatus.COMPLETED) {
        const due = new Date(task.due_date);
        if (!Number.isNaN(due.getTime())) {
          const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
          const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            items.push({
              id: `${task.id}-overdue`,
              title: "Task overdue",
              body: `"${task.title}" is overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}.`,
              tone: "alert"
            });
          } else if (diffDays <= 3) {
            items.push({
              id: `${task.id}-due`,
              title: "Upcoming deadline",
              body: `"${task.title}" is due in ${diffDays} day${diffDays === 1 ? "" : "s"}.`,
              tone: "info"
            });
          }
        }
      }
    });

    const toneWeight = { alert: 0, info: 1, neutral: 2 };
    return items
      .sort((a, b) => toneWeight[a.tone] - toneWeight[b.tone])
      .slice(0, 6);
  }, [tasks]);

  const achievements = useMemo(() => {
    const completedCount = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const onTimeCount = tasks.filter(task => {
      if (task.status !== TaskStatus.COMPLETED) return false;
      if (!task.due_date || !task.completed_at) return false;
      const due = new Date(task.due_date);
      const completed = new Date(task.completed_at);
      if (Number.isNaN(due.getTime()) || Number.isNaN(completed.getTime())) return false;
      const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const startOfCompleted = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
      return startOfCompleted.getTime() <= startOfDue.getTime();
    }).length;

    return [
      {
        id: "starter",
        title: "Getting Started",
        description: "Complete your first task.",
        achieved: completedCount >= 1
      },
      {
        id: "momentum",
        title: "Momentum Builder",
        description: "Complete 5 tasks.",
        achieved: completedCount >= 5
      },
      {
        id: "finisher",
        title: "Project Finisher",
        description: "Complete 10 tasks.",
        achieved: completedCount >= 10
      },
      {
        id: "streak",
        title: "Three-Day Streak",
        description: "Complete tasks on 3 consecutive days.",
        achieved: (() => {
          const days = tasks
            .filter(task => task.status === TaskStatus.COMPLETED && task.completed_at)
            .map(task => {
              const date = new Date(task.completed_at!);
              if (Number.isNaN(date.getTime())) return null;
              return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            })
            .filter((value): value is number => value !== null)
            .sort((a, b) => a - b);
          const uniqueDays = Array.from(new Set(days));
          let streak = 1;
          let maxStreak = 1;
          for (let i = 1; i < uniqueDays.length; i += 1) {
            if (uniqueDays[i] - uniqueDays[i - 1] === 24 * 60 * 60 * 1000) {
              streak += 1;
              maxStreak = Math.max(maxStreak, streak);
            } else {
              streak = 1;
            }
          }
          return uniqueDays.length > 0 && maxStreak >= 3;
        })()
      },
      {
        id: "on-time",
        title: "On-Time Delivery",
        description: "Finish 3 tasks on or before due date.",
        achieved: onTimeCount >= 3
      }
    ];
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return tasks
      .filter(task => task.due_date && task.status !== TaskStatus.COMPLETED)
      .map(task => {
        const due = new Date(task.due_date!);
        return { task, due };
      })
      .filter(item => !Number.isNaN(item.due.getTime()))
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, 6)
      .map(item => {
        const due = item.due;
        const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
        return { ...item, diffDays };
      });
  }, [tasks]);

  const progressStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const submitted = tasks.filter(task => task.status === TaskStatus.SUBMITTED).length;
    const pending = tasks.filter(task => task.status === TaskStatus.PENDING).length;
    const rejected = tasks.filter(task => task.status === TaskStatus.REJECTED).length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, submitted, pending, rejected, completionRate };
  }, [tasks]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-stone-500 mt-1">Track and submit your assigned work</p>
        </div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-700 hover:border-stone-300 hover:text-stone-900"
        >
          <Settings className="w-4 h-4" />
          Profile Settings
        </Link>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-wrap gap-2">
        {[
          { id: "tasks", label: "Tasks" },
          { id: "calendar", label: "Calendar" },
          { id: "progress", label: "Progress" },
          { id: "notifications", label: "Notifications" },
          { id: "achievements", label: "Achievements" }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePanel(item.id as typeof activePanel)}
            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
              activePanel === item.id
                ? "bg-stone-900 text-stone-50 border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activePanel === "tasks" && (
        <>
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Filters</p>
                <p className="text-sm font-semibold text-stone-800">Refine your task list</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full md:w-64 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | TaskStatus)}
                className="w-full md:w-44 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              >
                <option value="all">All Statuses</option>
                <option value={TaskStatus.PENDING}>Pending</option>
                <option value={TaskStatus.SUBMITTED}>Submitted</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
                <option value={TaskStatus.REJECTED}>Rejected</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as "all" | TaskPriority)}
                className="w-full md:w-44 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              >
                <option value="all">All Priorities</option>
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setSearchQuery("");
                }}
                className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-semibold text-stone-600 border border-stone-200 hover:bg-stone-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Views</p>
              <p className="text-sm font-semibold text-stone-800">Quickly focus on what matters</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewPreset("all")}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
                  viewPreset === "all"
                    ? "bg-stone-900 text-stone-50 border-stone-900"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => setViewPreset("dueSoon")}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
                  viewPreset === "dueSoon"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                Due Soon ({presetCounts.dueSoon})
              </button>
              <button
                type="button"
                onClick={() => setViewPreset("highPriority")}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
                  viewPreset === "highPriority"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                High Priority ({presetCounts.highPriority})
              </button>
              <button
                type="button"
                onClick={() => setViewPreset("needsRevision")}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border ${
                  viewPreset === "needsRevision"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                Needs Revision ({presetCounts.needsRevision})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <motion.div 
                key={task.id}
                layout
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <StatusBadge status={task.status} />
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      ID: {task.id}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl leading-tight">{task.title}</h3>
                    <p className="text-stone-500 text-sm line-clamp-3">{task.description}</p>
                    {drafts[task.id] && (
                      <span className="inline-flex text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Draft saved
                      </span>
                    )}
                    {notes[task.id] && (
                      <span className="inline-flex text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        Note added
                      </span>
                    )}
                    {task.revision_history && task.revision_history.length > 0 && (
                      <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Revision History</p>
                        <div className="space-y-2">
                          {[...task.revision_history].reverse().map((entry, index) => (
                            <div key={`${task.id}-history-${index}`} className="text-xs text-stone-600">
                              <div className="flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-widest">
                                <span>{entry.admin_name || "Admin"}</span>
                                <span>{new Date(entry.created_at).toLocaleString()}</span>
                              </div>
                              <p className="mt-1 italic">"{entry.feedback}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!task.revision_history || task.revision_history.length === 0) && task.admin_feedback && (
                      <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Admin Feedback</p>
                        <p className="text-xs text-stone-600 italic">"{task.admin_feedback}"</p>
                      </div>
                    )}
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
                  </div>
                  <div className="pt-2 border-t border-stone-50 space-y-2 text-xs text-stone-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Assigned: {new Date(task.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Days Remaining: {getDaysRemainingLabel(task.due_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Priority: {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button 
                    onClick={() => setViewingTask(task)}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all border border-stone-200 text-stone-700 hover:bg-white"
                  >
                    View Task
                    <FileText className="w-4 h-4 text-stone-500" />
                  </button>
                  {task.status === TaskStatus.PENDING || task.status === TaskStatus.REJECTED ? (
                    <button 
                      onClick={() => setSubmittingTask(task)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all group ${
                        task.status === TaskStatus.REJECTED 
                          ? "bg-red-600 text-white hover:bg-red-700" 
                          : "bg-stone-900 text-stone-50 hover:bg-stone-800"
                      }`}
                    >
                      {task.status === TaskStatus.REJECTED ? "Resubmit Work" : "Submit Work"}
                      <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setSubmittingTask(task)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-stone-200 text-stone-700 hover:bg-stone-300"
                    >
                      View Discussion
                      <CheckCircle className={`w-4 h-4 ${task.status === TaskStatus.COMPLETED ? "text-emerald-500" : "text-blue-500"}`} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {filteredTasks.length === 0 && (
              <div className="col-span-full p-12 bg-stone-100/50 border-2 border-dashed border-stone-200 rounded-2xl text-center text-stone-400 font-medium italic">
                No tasks match the current filters.
              </div>
            )}
          </div>
        </>
      )}

      {activePanel === "notifications" && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Notifications</p>
              <h2 className="text-lg font-semibold text-stone-900">Reminders & Updates</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Latest</span>
          </div>
          <div className="p-6 space-y-3">
            {notifications.length === 0 && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                You are all caught up. No new reminders right now.
              </div>
            )}
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-4 py-3 ${
                  item.tone === "alert"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : item.tone === "info"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-stone-200 bg-stone-50 text-stone-700"
                }`}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePanel === "achievements" && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Achievements</p>
              <h2 className="text-lg font-semibold text-stone-900">Your Progress</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {achievements.filter((badge) => badge.achieved).length}/{achievements.length} Earned
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl border px-4 py-3 ${
                  badge.achieved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                }`}
              >
                <p className="text-sm font-semibold">{badge.title}</p>
                <p className="text-xs mt-1">{badge.description}</p>
                <span className="mt-3 inline-flex text-[10px] uppercase tracking-widest font-semibold">
                  {badge.achieved ? "Unlocked" : "Locked"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePanel === "calendar" && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Calendar</p>
              <h2 className="text-lg font-semibold text-stone-900">Upcoming Deadlines</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Next 6</span>
          </div>
          <div className="p-6 space-y-3">
            {upcomingTasks.length === 0 && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                No upcoming deadlines. You are all set.
              </div>
            )}
            {upcomingTasks.map(({ task, due, diffDays }) => (
              <div key={`${task.id}-upcoming`} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{task.title}</p>
                  <p className="text-xs text-stone-500">Due {due.toLocaleDateString()}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${
                    diffDays < 0
                      ? "bg-red-100 text-red-700"
                      : diffDays <= 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {diffDays < 0 ? `Overdue ${Math.abs(diffDays)}d` : `${diffDays}d left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePanel === "progress" && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Progress</p>
              <h2 className="text-lg font-semibold text-stone-900">Completion Overview</h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {progressStats.completionRate}% Done
            </span>
          </div>
          <div className="p-6 space-y-4">
            <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: progressStats.total === 0 ? "0%" : `${progressStats.completionRate}%`,
                  minWidth: progressStats.total > 0 && progressStats.completionRate > 0 ? "6px" : "0px"
                }}
              />
            </div>
            {progressStats.total === 0 && (
              <p className="text-xs text-stone-400">No tasks yet. Progress will appear once tasks are assigned.</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Completed</p>
                <p className="text-lg font-semibold text-emerald-600">{progressStats.completed}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Submitted</p>
                <p className="text-lg font-semibold text-blue-600">{progressStats.submitted}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Pending</p>
                <p className="text-lg font-semibold text-amber-600">{progressStats.pending}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Rejected</p>
                <p className="text-lg font-semibold text-red-600">{progressStats.rejected}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {viewingTask && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-900 rounded-lg">
                    <FileText className="w-4 h-4 text-stone-50" />
                  </div>
                  <div>
                    <h3 className="font-bold">Task Details</h3>
                    <p className="text-xs text-stone-500">{viewingTask.title}</p>
                  </div>
                </div>
                <button onClick={closeViewingModal} className="text-stone-400 hover:text-stone-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={viewingTask.status} />
                  {getPriorityBadge(viewingTask.priority)}
                  {viewingTask.categories && viewingTask.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {viewingTask.categories.map((category) => (
                        <span
                          key={`${viewingTask.id}-${category}-view`}
                          className="text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200 px-2 py-1 rounded-full"
                        >
                          #{category}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Description</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{viewingTask.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">Assigned</p>
                    <p className="font-semibold text-stone-800">{new Date(viewingTask.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">Due</p>
                    <p className="font-semibold text-stone-800">{viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleDateString() : "No due date"}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">Remaining</p>
                    <p className="font-semibold text-stone-800">{getDaysRemainingLabel(viewingTask.due_date)}</p>
                  </div>
                </div>
                {viewingTask.admin_feedback && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-stone-400">Admin Feedback</p>
                    <p className="text-sm text-stone-700 italic mt-1">"{viewingTask.admin_feedback}"</p>
                  </div>
                )}
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Personal Notes</p>
                  <textarea
                    rows={3}
                    value={notes[viewingTask.id] || ""}
                    onChange={(e) => handleSaveNote(viewingTask.id, e.target.value)}
                    placeholder="Add your private notes for this task..."
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 resize-none"
                  />
                  <p className="text-[10px] uppercase tracking-widest text-stone-400">Saved locally in your browser.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row gap-3 sm:justify-end bg-white">
                <button 
                  type="button"
                  onClick={closeViewingModal}
                  className="w-full sm:w-auto px-4 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50 transition-all"
                >
                  Close
                </button>
                {canSubmitTask(viewingTask) && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSubmittingTask(viewingTask);
                      setViewingTask(null);
                    }}
                    className="w-full sm:w-auto bg-stone-900 text-stone-50 px-4 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                  >
                    {viewingTask.status === TaskStatus.REJECTED ? "Resubmit Work" : "Submit Work"}
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submittingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-900 rounded-lg">
                    <FileText className="w-4 h-4 text-stone-50" />
                  </div>
                  <h3 className="font-bold">{canSubmit ? "Submit" : "Discussion"}: {submittingTask.title}</h3>
                </div>
                <button onClick={closeSubmissionModal} className="text-stone-400 hover:text-stone-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitTask} className="p-6 space-y-6">
                {canSubmit ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Submission Content</label>
                      <textarea 
                        required
                        rows={6}
                        value={submissionContent}
                        onChange={e => setSubmissionContent(e.target.value)}
                        placeholder="Describe your work or provide links to your deliverables..."
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Document URL (Optional)</label>
                      <input 
                        type="url"
                        value={documentUrl}
                        onChange={e => setDocumentUrl(e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Upload Files</label>
                      <input 
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.go,.rs,.html,.css,.json,.yaml,.yml,.sql,.sh"
                        onChange={(e) => handleUploadFiles(e.target.files)}
                        className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-900 file:text-stone-50 hover:file:bg-stone-800"
                      />
                      {isUploading && (
                        <p className="text-xs text-stone-400">Uploading files...</p>
                      )}
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div key={`${file.file_url}-${index}`} className="flex items-center justify-between text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                              <a href={file.file_url} target="_blank" rel="noreferrer" className="hover:underline">
                                {file.original_name}
                              </a>
                              <button
                                type="button"
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                className="text-stone-400 hover:text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {drafts[submittingTask.id]?.savedAt && (
                      <p className="text-[10px] uppercase tracking-widest text-stone-400">
                        Draft saved at {new Date(drafts[submittingTask.id].savedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                    Submissions are locked for this task. You can continue the discussion below.
                  </div>
                )}

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
                          <span>{comment.user_name} · {comment.user_role}</span>
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

                {canSubmit ? (
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={closeSubmissionModal}
                      className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveDraft}
                      className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50 transition-all"
                    >
                      Save Draft
                    </button>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="flex-[2] bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? "Submitting..." : "Confirm Submission"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={closeSubmissionModal}
                      className="px-4 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50 transition-all"
                    >
                      Close
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

