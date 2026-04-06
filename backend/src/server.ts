import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".txt",
  ".md",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".go",
  ".rs",
  ".html",
  ".css",
  ".json",
  ".yaml",
  ".yml",
  ".sql",
  ".sh"
]);

// --- Schemas & Models ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  email_verified: { type: Boolean, default: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  profile_photo_url: { type: String, default: "" },
  bio: { type: String, default: "" },
  theme: { type: String, default: "light", enum: ["light", "dark"] },
  role: { type: String, default: "user", enum: ["user", "admin"] },
  notifications: {
    email: { type: Boolean, default: true },
    in_app: { type: Boolean, default: true },
    system_alerts: { type: Boolean, default: true },
    user_activity_alerts: { type: Boolean, default: true }
  },
  privacy: {
    profile_visible: { type: Boolean, default: true },
    show_email: { type: Boolean, default: false },
    show_phone: { type: Boolean, default: false }
  },
  two_factor_enabled: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
userSchema.virtual("id").get(function() { return this._id.toHexString(); });

const userSessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  login_at: { type: Date, default: Date.now },
  last_activity_at: { type: Date, default: Date.now },
  logout_at: { type: Date },
  status: { type: String, default: "active", enum: ["active", "offline"] },
  ip_address: { type: String },
  user_agent: { type: String }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
userSessionSchema.virtual("id").get(function() { return this._id.toHexString(); });

const activityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
activityLogSchema.virtual("id").get(function() { return this._id.toHexString(); });

const taskRevisionSchema = new mongoose.Schema({
  feedback: { type: String, required: true },
  admin_name: { type: String },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: "pending", enum: ["pending", "submitted", "completed", "rejected"] },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  due_date: { type: Date },
  priority: { type: String, default: "medium", enum: ["low", "medium", "high", "urgent"] },
  categories: { type: [String], default: [] },
  admin_feedback: { type: String },
  revision_history: { type: [taskRevisionSchema], default: [] },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
taskSchema.virtual("id").get(function() { return this._id.toHexString(); });

const attachmentSchema = new mongoose.Schema({
  original_name: { type: String, required: true },
  file_url: { type: String, required: true },
  mime_type: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  document_url: { type: String },
  attachments: { type: [attachmentSchema], default: [] },
  submitted_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
submissionSchema.virtual("id").get(function() { return this._id.toHexString(); });

const taskCommentSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "TaskComment", default: null },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
taskCommentSchema.virtual("id").get(function() { return this._id.toHexString(); });

const directMessageSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  read_at: { type: Date, default: null }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
directMessageSchema.virtual("id").get(function() { return this._id.toHexString(); });

const User = mongoose.model("User", userSchema);
const UserSession = mongoose.model("UserSession", userSessionSchema);
const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
const Task = mongoose.model("Task", taskSchema);
const Submission = mongoose.model("Submission", submissionSchema);
const TaskComment = mongoose.model("TaskComment", taskCommentSchema);
const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const frontendDistDir = path.resolve(process.cwd(), "..", "frontend", "dist");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Database Connection
  const useInMemoryDb = process.env.USE_IN_MEMORY_DB === "true";
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri && useInMemoryDb) {
    console.log("USE_IN_MEMORY_DB=true and no MONGODB_URI provided. Starting in-memory MongoDB...");
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }

  if (!mongoUri) {
    throw new Error(
      "Missing MONGODB_URI. Set it to your MongoDB Atlas connection string, or set USE_IN_MEMORY_DB=true for local temporary data."
    );
  }

  try {
    await mongoose.connect(mongoUri);
    console.log(
      "Connected to MongoDB:",
      mongoUri.includes("127.0.0.1") ? "Local/In-Memory Instance" : "Atlas/External Instance"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
    if (useInMemoryDb) {
      console.log("Atlas/external connection failed. Falling back to in-memory MongoDB because USE_IN_MEMORY_DB=true...");
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log("Connected to in-memory MongoDB.");
    } else {
      throw err;
    }
  }

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: frontendUrl,
    credentials: true
  }));

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        return cb(new Error("Unsupported file type"));
      }
      cb(null, true);
    }
  });

  app.use("/uploads", express.static(uploadDir));

  const normalizeCategories = (input: any): string[] => {
    if (Array.isArray(input)) {
      return input
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .map((item) => item.replace(/^#/, ""));
    }
    if (typeof input === "string") {
      return input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^#/, ""));
    }
    return [];
  };

  const logActivity = async (userId: string, action: string, metadata?: any) => {
    if (!userId || !action) return;
    try {
      await ActivityLog.create({
        user_id: userId,
        action,
        metadata: metadata || null
      });
    } catch (err) {
      // avoid breaking the request if logging fails
    }
  };

  // --- Auth Middleware ---
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select("name email email_verified phone profile_photo_url bio theme role notifications privacy two_factor_enabled is_active");
      if (!user || user.is_active === false) {
        res.clearCookie("token");
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        phone: user.phone,
        profile_photo_url: user.profile_photo_url,
        bio: user.bio,
        theme: user.theme,
        role: user.role,
        notifications: user.notifications,
        privacy: user.privacy,
        two_factor_enabled: user.two_factor_enabled,
        is_active: user.is_active,
        session_id: decoded.session_id
      };
      if (decoded?.session_id) {
        const now = new Date();
        UserSession.findByIdAndUpdate(decoded.session_id, {
          last_activity_at: now,
          status: "active"
        }).catch(() => {});
      }
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  };

  const canDirectMessage = async (currentUser: any, otherUserId: string): Promise<
    | { ok: true; user: any }
    | { ok: false; status: number; error: string }
  > => {
    if (currentUser.id === otherUserId) {
      return { ok: false, status: 400, error: "You cannot message yourself." };
    }

    const otherUser = await User.findById(otherUserId).select("name email role is_active");
    if (!otherUser || otherUser.is_active === false) {
      return { ok: false, status: 404, error: "User not found" };
    }

    const isAllowedPair =
      (currentUser.role === "admin" && otherUser.role === "user") ||
      (currentUser.role === "user" && otherUser.role === "admin");

    if (!isAllowedPair) {
      return { ok: false, status: 403, error: "Messages are only allowed between admins and users." };
    }

    return { ok: true, user: otherUser };
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const user = new User({ name, email, password: hashedPassword, role: role || "user" });
      await user.save();
      res.json({ success: true, id: user.id });
    } catch (err: any) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.is_active === false) {
        return res.status(403).json({ error: "Account deactivated. Contact another admin to restore access." });
      }
      const session = await UserSession.create({
      user_id: user._id,
      login_at: new Date(),
      last_activity_at: new Date(),
      status: "active",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "unknown"
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, session_id: session.id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    await logActivity(user.id, "Logged in");
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.email_verified,
          phone: user.phone,
          profile_photo_url: user.profile_photo_url,
          bio: user.bio,
          theme: user.theme,
          role: user.role,
          notifications: user.notifications,
          privacy: user.privacy,
          two_factor_enabled: user.two_factor_enabled,
          is_active: user.is_active
        }
      });
  });

  app.post("/api/auth/logout", (_req, res) => {
    const token = _req.cookies.token;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded?.session_id) {
          UserSession.findByIdAndUpdate(decoded.session_id, {
            logout_at: new Date(),
            status: "offline"
          }).catch(() => {});
        }
        if (decoded?.id) {
          logActivity(decoded.id, "Logged out");
        }
      } catch (err) {
        // ignore invalid token on logout
      }
    }
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/settings/me", authenticate, async (req: any, res) => {
    try {
      const user = await User.findById(req.user.id).select("name email email_verified phone profile_photo_url bio theme role notifications privacy two_factor_enabled is_active");
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/settings/me", authenticate, async (req: any, res) => {
    const { name, email, phone, profile_photo_url, bio, theme, notifications, privacy, two_factor_enabled } = req.body || {};
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const emailChanged = Boolean(email && email !== user.email);
      if (emailChanged) {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "Email already exists" });
        user.email = email;
        user.email_verified = false;
      }
      if (name) user.name = name;
      if (typeof phone === "string") user.phone = phone;
      if (typeof profile_photo_url === "string") user.profile_photo_url = profile_photo_url;
      if (typeof bio === "string") user.bio = bio;
      if (theme === "light" || theme === "dark") user.theme = theme;
      if (notifications) {
        user.notifications = {
          email: typeof notifications.email === "boolean" ? notifications.email : user.notifications?.email ?? true,
          in_app: typeof notifications.in_app === "boolean" ? notifications.in_app : user.notifications?.in_app ?? true,
          system_alerts: typeof notifications.system_alerts === "boolean" ? notifications.system_alerts : user.notifications?.system_alerts ?? true,
          user_activity_alerts: typeof notifications.user_activity_alerts === "boolean" ? notifications.user_activity_alerts : user.notifications?.user_activity_alerts ?? true
        };
      }
      if (privacy) {
        user.privacy = {
          profile_visible: typeof privacy.profile_visible === "boolean" ? privacy.profile_visible : user.privacy?.profile_visible ?? true,
          show_email: typeof privacy.show_email === "boolean" ? privacy.show_email : user.privacy?.show_email ?? false,
          show_phone: typeof privacy.show_phone === "boolean" ? privacy.show_phone : user.privacy?.show_phone ?? false
        };
      }
      if (typeof two_factor_enabled === "boolean") {
        user.two_factor_enabled = two_factor_enabled;
      }
      await user.save();
      await logActivity(req.user.id, "Updated profile settings");

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name, session_id: req.user.session_id },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.email_verified,
          phone: user.phone,
          profile_photo_url: user.profile_photo_url,
          bio: user.bio,
          theme: user.theme,
          role: user.role,
          notifications: user.notifications,
          privacy: user.privacy,
          two_factor_enabled: user.two_factor_enabled,
          is_active: user.is_active
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings/deactivate", authenticate, async (req: any, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.is_active = false;
      await user.save();
      await UserSession.findByIdAndUpdate(req.user.session_id, {
        logout_at: new Date(),
        status: "offline"
      }).catch(() => {});
      await logActivity(req.user.id, "Deactivated own account");

      res.clearCookie("token");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings/logout-all", authenticate, async (req: any, res) => {
    try {
      await UserSession.updateMany(
        { user_id: req.user.id, status: "active" },
        { logout_at: new Date(), status: "offline" }
      );
      await logActivity(req.user.id, "Logged out from all devices");
      res.clearCookie("token");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings/delete", authenticate, async (req: any, res) => {
    const { current_password } = req.body || {};
    if (!current_password) {
      return res.status(400).json({ error: "Current password is required" });
    }
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const ok = bcrypt.compareSync(current_password, user.password);
      if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

      await UserSession.updateMany(
        { user_id: req.user.id },
        { logout_at: new Date(), status: "offline" }
      );
      await logActivity(req.user.id, "Deleted own account");
      await User.findByIdAndDelete(req.user.id);

      res.clearCookie("token");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/settings/password", authenticate, async (req: any, res) => {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Current and new password are required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const ok = bcrypt.compareSync(current_password, user.password);
      if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
      user.password = bcrypt.hashSync(new_password, 10);
      await user.save();
      await logActivity(req.user.id, "Changed password");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Task Routes ---
  app.get("/api/tasks", authenticate, async (req: any, res) => {
    try {
      let tasks;
      if (req.user.role === "admin") {
        tasks = await Task.find().populate("assigned_to", "name").sort({ created_at: -1 });
      } else {
        tasks = await Task.find({
          $or: [{ assigned_to: req.user.id }, { assigned_to: null }]
        }).populate("assigned_to", "name").sort({ created_at: -1 });
      }

      const mappedTasks = tasks.map(t => {
        const task = t.toJSON();
        return {
          ...task,
          assigned_to_name: (t.assigned_to as any)?.name || null
        };
      });

      res.json(mappedTasks);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticate, isAdmin, async (req, res) => {
    const { title, description, assigned_to, due_date, priority, categories } = req.body;
    try {
      const task = new Task({
        title,
        description,
        assigned_to: assigned_to || null,
        due_date: due_date ? new Date(due_date) : null,
        priority: priority || "medium",
        categories: normalizeCategories(categories)
      });
      await task.save();
      res.json({ success: true, id: task.id });
    } catch (err) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", authenticate, isAdmin, async (req: any, res) => {
    const { title, description, assigned_to, status, admin_feedback, due_date, priority, categories } = req.body;
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (status === "rejected" && admin_feedback && admin_feedback.trim()) {
        task.revision_history.push({
          feedback: admin_feedback.trim(),
          admin_name: req.user?.name || "Admin"
        });
      }
      task.title = title;
      task.description = description;
      task.assigned_to = assigned_to || null;
      task.status = status;
      task.admin_feedback = admin_feedback;
      task.due_date = due_date ? new Date(due_date) : null;
      task.priority = priority;
      task.categories = normalizeCategories(categories);
      await task.save();
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", authenticate, isAdmin, async (req, res) => {
    try {
      await Task.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Task not found" });
    }
  });

  // --- Uploads ---
  app.post("/api/uploads", authenticate, upload.array("files", 5), (req: any, res) => {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const mapped = files.map((file) => ({
      original_name: file.originalname,
      file_url: `/uploads/${file.filename}`,
      mime_type: file.mimetype,
      size: file.size
    }));
    res.json({ files: mapped });
  });

  // --- Task Comments ---
  app.get("/api/tasks/:id/comments", authenticate, async (req: any, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (req.user.role !== "admin") {
        if (task.assigned_to && task.assigned_to.toString() !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      const comments = await TaskComment.find({ task_id: req.params.id })
        .populate("user_id", "name role")
        .sort({ created_at: 1 });
      const mapped = comments.map(c => {
        const comment = c.toJSON();
        return {
          ...comment,
          user_name: (c.user_id as any)?.name || "Unknown",
          user_role: (c.user_id as any)?.role || "user"
        };
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tasks/:id/comments", authenticate, async (req: any, res) => {
    const { content, parent_id } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      if (req.user.role !== "admin") {
        if (task.assigned_to && task.assigned_to.toString() !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      const comment = new TaskComment({
        task_id: req.params.id,
        user_id: req.user.id,
        parent_id: parent_id || null,
        content: content.trim()
      });
      await comment.save();
      res.json({ success: true, id: comment.id });
    } catch (err) {
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  // --- Submission Routes ---
  app.post("/api/submissions", authenticate, async (req: any, res) => {
    const { task_id, content, document_url, attachments } = req.body;
    try {
      const submission = new Submission({
        task_id,
        user_id: req.user.id,
        content,
        document_url,
        attachments: attachments || []
      });
      await submission.save();
      await Task.findByIdAndUpdate(task_id, { status: "submitted" });
      await logActivity(req.user.id, "Submitted task", { task_id });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Invalid submission data" });
    }
  });

  app.get("/api/submissions/:taskId", authenticate, isAdmin, async (req, res) => {
    try {
      const submissions = await Submission.find({ task_id: req.params.taskId })
        .populate("user_id", "name")
        .sort({ submitted_at: -1 });

      const mappedSubmissions = submissions.map(s => {
        const sub = s.toJSON();
        return {
          ...sub,
          user_name: (s.user_id as any)?.name || "Unknown"
        };
      });

      res.json(mappedSubmissions);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Analytics ---
  app.get("/api/analytics", authenticate, isAdmin, async (_req, res) => {
    try {
      const total = await Task.countDocuments();
      const completed = await Task.countDocuments({ status: "completed" });
      const pending = await Task.countDocuments({ status: "pending" });
      const submitted = await Task.countDocuments({ status: "submitted" });
      const rejected = await Task.countDocuments({ status: "rejected" });

      res.json({
        total,
        completed,
        pending,
        submitted,
        rejected,
        completionRate: total > 0 ? (completed / total) * 100 : 0
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- User List (for assignment) ---
  app.get("/api/users", authenticate, isAdmin, async (_req, res) => {
    try {
      const users = await User.find({ role: "user" }).select("name email role");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/chat/contacts", authenticate, async (req: any, res) => {
    try {
      const users = await User.find({})
        .select("name email role profile_photo_url")
        .sort({ name: 1 });

      const contacts = users.filter((contact: any) => {
        const contactId = contact.id?.toString?.() || contact._id?.toString?.();
        const isOppositeRole =
          (req.user.role === "admin" && contact.role === "user") ||
          (req.user.role === "user" && contact.role === "admin");
        return contactId !== req.user.id && contact.is_active !== false && isOppositeRole;
      });

      const mapped = await Promise.all(contacts.map(async (contact) => {
        const latestMessage = await DirectMessage.findOne({
          $or: [
            { sender_id: req.user.id, recipient_id: contact.id },
            { sender_id: contact.id, recipient_id: req.user.id }
          ]
        }).sort({ created_at: -1 });

        const unreadCount = await DirectMessage.countDocuments({
          sender_id: contact.id,
          recipient_id: req.user.id,
          read_at: null
        });

        return {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          profile_photo_url: contact.profile_photo_url || "",
          latest_message: latestMessage?.content || "",
          latest_message_at: latestMessage?.created_at || null,
          unread_count: unreadCount
        };
      }));

      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/chat/:userId/messages", authenticate, async (req: any, res) => {
    try {
      const permission = await canDirectMessage(req.user, req.params.userId);
      if (!permission.ok) {
        return res.status(permission.status).json({ error: permission.error });
      }

      const messages = await DirectMessage.find({
        $or: [
          { sender_id: req.user.id, recipient_id: req.params.userId },
          { sender_id: req.params.userId, recipient_id: req.user.id }
        ]
      })
        .populate("sender_id", "name email role")
        .populate("recipient_id", "name email role")
        .sort({ created_at: 1 });

      await DirectMessage.updateMany({
        sender_id: req.params.userId,
        recipient_id: req.user.id,
        read_at: null
      }, {
        read_at: new Date()
      });

      const mapped = messages.map((message) => {
        const item = message.toJSON();
        return {
          ...item,
          sender_id: (message.sender_id as any)?.id || item.sender_id,
          recipient_id: (message.recipient_id as any)?.id || item.recipient_id,
          sender_name: (message.sender_id as any)?.name || "Unknown",
          sender_role: (message.sender_id as any)?.role || "user",
          recipient_name: (message.recipient_id as any)?.name || "Unknown",
          recipient_role: (message.recipient_id as any)?.role || "user"
        };
      });

      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/chat/:userId/messages", authenticate, async (req: any, res) => {
    const { content } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    try {
      const permission = await canDirectMessage(req.user, req.params.userId);
      if (!permission.ok) {
        return res.status(permission.status).json({ error: permission.error });
      }

      const message = await DirectMessage.create({
        sender_id: req.user.id,
        recipient_id: req.params.userId,
        content: content.trim()
      });

      await logActivity(req.user.id, "Sent direct message", {
        recipient_id: req.params.userId
      });

      res.json({ success: true, id: message.id });
    } catch (err) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.get("/api/sessions", authenticate, async (req: any, res) => {
    try {
      const query = req.user.role === "admin" ? {} : { user_id: req.user.id };
      const sessions = await UserSession.find(query)
        .populate("user_id", "name email role")
        .sort({ login_at: -1 })
        .limit(200);

      const now = new Date();
      const mapped = sessions.map((s) => {
        const session = s.toJSON();
        const lastActivity = session.last_activity_at ? new Date(session.last_activity_at) : null;
        const minutesSince = lastActivity ? (now.getTime() - lastActivity.getTime()) / (1000 * 60) : Infinity;
        let status = "active";
        if (session.logout_at || minutesSince > 5) {
          status = "offline";
        }
        return {
          ...session,
          status,
          user_name: (s.user_id as any)?.name || "Unknown",
          user_email: (s.user_id as any)?.email || "unknown"
        };
      });

      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/activity-log", authenticate, async (req: any, res) => {
    const { action, metadata } = req.body || {};
    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "Action is required" });
    }
    await logActivity(req.user.id, action.trim(), metadata || null);
    res.json({ success: true });
  });

  app.get("/api/activity-logs", authenticate, isAdmin, async (_req, res) => {
    try {
      const logs = await ActivityLog.find()
        .populate("user_id", "name email role")
        .sort({ created_at: -1 })
        .limit(200);

      const mapped = logs.map((l) => {
        const log = l.toJSON();
        return {
          ...log,
          user_name: (l.user_id as any)?.name || "Unknown",
          user_email: (l.user_id as any)?.email || "unknown"
        };
      });

      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  if (fs.existsSync(frontendDistDir)) {
    app.use(express.static(frontendDistDir));

    app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(frontendDistDir, "index.html"));
    });
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    if (err?.message === "Unsupported file type") {
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      console.error("Unhandled error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
