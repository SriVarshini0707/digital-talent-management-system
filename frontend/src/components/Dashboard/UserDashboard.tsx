import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../../types';
import { Clock, Send, CheckCircle, FileText, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks', { credentials: 'include' });
    const data = await res.json();
    if (Array.isArray(data)) {
      setTasks(data);
    } else {
      console.error('Expected array of tasks, got:', data);
      setTasks([]);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          task_id: submittingTask.id, 
          content: submissionContent,
          document_url: documentUrl 
        }),
      });
      if (res.ok) {
        setSubmittingTask(null);
        setSubmissionContent('');
        setDocumentUrl('');
        fetchTasks();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-stone-500 mt-1">Track and submit your assigned work</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
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
                {task.admin_feedback && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Admin Feedback</p>
                    <p className="text-xs text-stone-600 italic">"{task.admin_feedback}"</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400 pt-2 border-t border-stone-50">
                <Clock className="w-3.5 h-3.5" />
                Assigned: {new Date(task.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end">
              {task.status === TaskStatus.PENDING || task.status === TaskStatus.REJECTED ? (
                <button 
                  onClick={() => setSubmittingTask(task)}
                  className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all group ${
                    task.status === TaskStatus.REJECTED 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
                  }`}
                >
                  {task.status === TaskStatus.REJECTED ? 'Resubmit Work' : 'Submit Work'}
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-2 text-stone-400 font-medium text-sm">
                  <CheckCircle className={`w-4 h-4 ${task.status === TaskStatus.COMPLETED ? 'text-emerald-500' : 'text-blue-500'}`} />
                  {task.status === TaskStatus.SUBMITTED ? 'Work Submitted' : 'Task Completed'}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {tasks.length === 0 && (
          <div className="col-span-full p-12 bg-stone-100/50 border-2 border-dashed border-stone-200 rounded-2xl text-center text-stone-400 font-medium italic">
            No tasks assigned to you yet.
          </div>
        )}
      </div>

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
                  <h3 className="font-bold">Submit: {submittingTask.title}</h3>
                </div>
                <button onClick={() => setSubmittingTask(null)} className="text-stone-400 hover:text-stone-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitTask} className="p-6 space-y-6">
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
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setSubmittingTask(null)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg font-medium text-stone-600 hover:bg-stone-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-[2] bg-stone-900 text-stone-50 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Submitting...' : 'Confirm Submission'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
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
