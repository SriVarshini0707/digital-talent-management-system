import React, { useState, useEffect, useMemo } from "react";
import { Task, TaskPriority, TaskStatus, Attachment, TaskComment } from "../../types";
import { Clock, Send, CheckCircle, FileText, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const closeSubmissionModal = () => {
    setSubmittingTask(null);
    setSubmissionContent("");
    setDocumentUrl("");
    setAttachments([]);
    setComments([]);
    setCommentText("");
    setReplyTo(null);
  };

  useEffect(() => {
    fetchTasks();
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
        closeSubmissionModal();
        fetchTasks();
      }
    } finally {
      setIsLoading(false);
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

  const canSubmit = submittingTask && (
    submittingTask.status === TaskStatus.PENDING || submittingTask.status === TaskStatus.REJECTED
  );

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
                  <FileText className="w-3.5 h-3.5" />
                  Priority: <span className="capitalize text-stone-600">{task.priority || TaskPriority.MEDIUM}</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end">
              {task.status === TaskStatus.PENDING || task.status === TaskStatus.REJECTED ? (
                <button 
                  onClick={() => setSubmittingTask(task)}
                  className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all group ${
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
                  className="w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all bg-stone-200 text-stone-700 hover:bg-stone-300"
                >
                  View Discussion
                  <CheckCircle className={`w-4 h-4 ${task.status === TaskStatus.COMPLETED ? "text-emerald-500" : "text-blue-500"}`} />
                </button>
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
