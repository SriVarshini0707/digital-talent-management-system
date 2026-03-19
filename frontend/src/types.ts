export enum UserRole {
  ADMIN = "admin",
  USER = "user"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export enum TaskStatus {
  PENDING = "pending",
  SUBMITTED = "submitted",
  COMPLETED = "completed",
  REJECTED = "rejected"
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_to_name?: string;
  admin_feedback?: string;
  due_date?: string | null;
  priority?: TaskPriority;
  created_at: string;
}

export interface Attachment {
  original_name: string;
  file_url: string;
  mime_type: string;
  size: number;
}

export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  document_url?: string;
  attachments?: Attachment[];
  submitted_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  parent_id?: string | null;
  content: string;
  created_at: string;
}

export interface Analytics {
  total: number;
  completed: number;
  pending: number;
  submitted: number;
  completionRate: number;
}
