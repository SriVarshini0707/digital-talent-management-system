export enum UserRole {
  ADMIN = "admin",
  USER = "user"
}

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified?: boolean;
  phone?: string;
  profile_photo_url?: string;
  bio?: string;
  theme?: "light" | "dark";
  role: UserRole;
  notifications?: {
    email: boolean;
    in_app: boolean;
    system_alerts?: boolean;
    user_activity_alerts?: boolean;
  };
  two_factor_enabled?: boolean;
  is_active?: boolean;
  privacy?: {
    profile_visible?: boolean;
    show_email?: boolean;
    show_phone?: boolean;
  };
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
  HIGH = "high",
  URGENT = "urgent"
}

export interface TaskRevision {
  feedback: string;
  admin_name?: string;
  created_at: string;
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
  categories?: string[];
  revision_history?: TaskRevision[];
  created_at: string;
  completed_at?: string;
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
  rejected?: number;
  completionRate: number;
}

export interface UserSession {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  login_at: string;
  last_activity_at: string;
  logout_at?: string;
  status: "active" | "offline";
  ip_address?: string;
  user_agent?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserSettingsUpdate {
  name: string;
  email: string;
  phone?: string;
  profile_photo_url?: string;
  bio?: string;
  theme?: "light" | "dark";
  notifications: {
    email: boolean;
    in_app: boolean;
    system_alerts?: boolean;
    user_activity_alerts?: boolean;
  };
  two_factor_enabled: boolean;
  privacy?: {
    profile_visible?: boolean;
    show_email?: boolean;
    show_phone?: boolean;
  };
  current_password?: string;
}

export interface ChatContact {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile_photo_url?: string;
  latest_message?: string;
  latest_message_at?: string | null;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  sender_name?: string;
  sender_role?: UserRole;
  recipient_name?: string;
  recipient_role?: UserRole;
}
