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
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "admin"] }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
userSchema.virtual("id").get(function() { return this._id.toHexString(); });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: "pending", enum: ["pending", "submitted", "completed", "rejected"] },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  due_date: { type: Date },
  priority: { type: String, default: "medium", enum: ["low", "medium", "high"] },
  admin_feedback: { type: String },
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

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);
const Submission = mongoose.model("Submission", submissionSchema);
const TaskComment = mongoose.model("TaskComment", taskCommentSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database Connection
  let mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log("No MONGODB_URI provided. Starting in-memory MongoDB...");
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }

  try {
    await mongoose.connect(mongoUri);
    console.log(
      "Connected to MongoDB:",
      mongoUri.includes("127.0.0.1") ? "In-Memory Instance" : "External Instance"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
    if (process.env.MONGODB_URI) {
      console.log("Falling back to in-memory MongoDB...");
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log("Connected to in-memory MongoDB.");
    }
  }

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
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
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
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
    const { title, description, assigned_to, due_date, priority } = req.body;
    try {
      const task = new Task({
        title,
        description,
        assigned_to: assigned_to || null,
        due_date: due_date ? new Date(due_date) : null,
        priority: priority || "medium"
      });
      await task.save();
      res.json({ success: true, id: task.id });
    } catch (err) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", authenticate, isAdmin, async (req, res) => {
    const { title, description, assigned_to, status, admin_feedback, due_date, priority } = req.body;
    try {
      await Task.findByIdAndUpdate(req.params.id, {
        title,
        description,
        assigned_to: assigned_to || null,
        status,
        admin_feedback,
        due_date: due_date ? new Date(due_date) : null,
        priority
      });
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
