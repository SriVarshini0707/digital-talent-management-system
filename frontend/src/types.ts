export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export enum TaskStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_to_name?: string;
  admin_feedback?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  document_url?: string;
  submitted_at: string;
}

export interface Analytics {
  total: number;
  completed: number;
  pending: number;
  submitted: number;
  completionRate: number;
}
