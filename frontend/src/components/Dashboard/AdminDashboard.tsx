import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Send, BarChart3, Trash2, Edit2, Users, FileText, Eye, XCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Analytics, User, TaskStatus, Submission } from '../../types';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<{ task: Task, submissions: Submission[] } | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tasksRes, usersRes, analyticsRes] = await Promise.all([
      fetch('/api/tasks', { credentials: 'include' }),
      fetch('/api/users', { credentials: 'include' }),
      fetch('/api/analytics', { credentials: 'include' })
    ]);
    const tasksData = await tasksRes.json();
    const usersData = await usersRes.json();
    const analyticsData = await analyticsRes.json();
    
    setTasks(Array.isArray(tasksData) ? tasksData : []);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setAnalytics(analyticsData && !analyticsData.error ? analyticsData : null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newTask),
    });
    if (res.ok) {
      setIsAddingTask(false);
      setNewTask({ title: '', description: '', assigned_to: '' });
      fetchData();
    }
  };

  const handleUpdateTask = async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(task),
    });
    if (res.ok) {
      setEditingTask(null);
      fetchData();
    }
  };

  const handleViewSubmissions = async (task: Task) => {
    const res = await fetch(`/api/submissions/${task.id}`, { credentials: 'include' });
    const submissions = await res.json();
    setViewingSubmissions({ task, submissions });
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchData();
    }
  };

  const handleApproveTask = async (task: Task) => {
    await handleUpdateTask({ ...task, status: TaskStatus.COMPLETED });
    setViewingSubmissions(null);
  };

  const handleRejectTask = async (task: Task, feedback: string) => {
    await handleUpdateTask({ ...task, status: TaskStatus.REJECTED, admin_feedback: feedback });
    setViewingSubmissions(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-stone-500 mt-1">Manage talent tasks and track performance</p>
        </div>
        <button 
          onClick={() => setIsAddingTask(true)}
          className="bg-stone-900 text-stone-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-stone-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Analytics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsCard 
            label="Total Tasks" 
            value={analytics.total} 
            icon={<FileText className="w-5 h-5" />} 
            color="bg-stone-100"
          />
          <AnalyticsCard 
            label="Completed" 
            value={analytics.completed} 
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} 
            color="bg-emerald-50"
          />
          <AnalyticsCard 
            label="Pending" 
            value={analytics.pending} 
            icon={<Clock className="w-5 h-5 text-amber-600" />} 
            color="bg-amber-50"
          />
          <AnalyticsCard 
            label="Rejected" 
            value={(analytics as any).rejected || 0} 
            icon={<XCircle className="w-5 h-5 text-red-600" />} 
            color="bg-red-50"
          />
        </div>
      )}

      {/* Task List */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h2 className="font-bold">Task Management</h2>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{tasks.length} Tasks</span>
        </div>
        <div className="divide-y divide-stone-100">
          {tasks.map((task) => (
            <div key={task.id} className="p-6 hover:bg-stone-50/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-stone-500 text-sm max-w-2xl">{task.description}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Users className="w-3.5 h-3.5" />
                      Assigned to: <span className="text-stone-600 font-medium">{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Clock className="w-3.5 h-3.5" />
                      Created: <span className="text-stone-600 font-medium">{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status === TaskStatus.SUBMITTED && (
                    <button 
                      onClick={() => handleViewSubmissions(task)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  )}
                  <button 
                    onClick={() => setEditingTask(task)}
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
          {tasks.length === 0 && (
            <div className="p-12 text-center text-stone-400 font-medium italic">
              No tasks created yet.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isAddingTask && (
        <Modal title="Create New Task" onClose={() => setIsAddingTask(false)}>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Title</label>
              <input 
                required
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Description</label>
              <textarea 
                required
                rows={3}
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Assign To</label>
              <select 
                value={newTask.assigned_to}
                onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all">
              Create Task
            </button>
          </form>
        </Modal>
      )}

      {editingTask && (
        <Modal title="Edit Task" onClose={() => setEditingTask(null)}>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateTask(editingTask); }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Title</label>
              <input 
                required
                value={editingTask.title}
                onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Description</label>
              <textarea 
                required
                rows={3}
                value={editingTask.description}
                onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Assign To</label>
              <select 
                value={editingTask.assigned_to || ''}
                onChange={e => setEditingTask({...editingTask, assigned_to: e.target.value || null})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Status</label>
              <select 
                value={editingTask.status}
                onChange={e => setEditingTask({...editingTask, status: e.target.value as TaskStatus})}
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all text-sm"
              >
                <option value={TaskStatus.PENDING}>Pending</option>
                <option value={TaskStatus.SUBMITTED}>Submitted</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Admin Feedback</label>
              <textarea 
                rows={2}
                value={editingTask.admin_feedback || ''}
                onChange={e => setEditingTask({...editingTask, admin_feedback: e.target.value})}
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
        <Modal title={`Review Submissions: ${viewingSubmissions.task.title}`} onClose={() => setViewingSubmissions(null)}>
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
                </div>
              ))}
              {viewingSubmissions.submissions.length === 0 && (
                <div className="text-center py-8 text-stone-400 italic">No submissions found.</div>
              )}
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
                    const feedback = (document.getElementById('review-feedback') as HTMLTextAreaElement).value;
                    handleRejectTask(viewingSubmissions.task, feedback);
                  }}
                  className="py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-red-200 text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button 
                  onClick={() => {
                    const feedback = (document.getElementById('review-feedback') as HTMLTextAreaElement).value;
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
    </div>
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
    [TaskStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-100',
    [TaskStatus.SUBMITTED]: 'bg-blue-50 text-blue-700 border-blue-100',
    [TaskStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    [TaskStatus.REJECTED]: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
