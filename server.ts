import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { GoogleGenAI } from "@google/genai";

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

app.use(express.json());

// Database Initialization
const db = new Database("internship_engine.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('student', 'company', 'admin')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    user_id INTEGER PRIMARY KEY,
    college TEXT,
    branch TEXT,
    cgpa REAL,
    skills TEXT, -- JSON array
    preferences TEXT, -- JSON array
    experience_score INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS companies (
    user_id INTEGER PRIMARY KEY,
    industry TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    required_skills TEXT NOT NULL, -- JSON array
    seats INTEGER NOT NULL,
    duration TEXT,
    description TEXT,
    FOREIGN KEY(company_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    internship_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, allocated
    match_score REAL,
    success_probability REAL, -- ML Prediction
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(internship_id) REFERENCES internships(id)
  );

  CREATE TABLE IF NOT EXISTS allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    internship_id INTEGER NOT NULL,
    score REAL,
    success_probability REAL, -- ML Prediction
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(internship_id) REFERENCES internships(id)
  );
`);

// Migration: Ensure skills column exists in students table
try {
  db.prepare("SELECT skills FROM students LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE students ADD COLUMN skills TEXT;");
  } catch (err) {
    console.log("Migration: skills column already exists or table not ready.");
  }
}

// Seed Data
const seed = () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync("password123", 10);
    
    // Admin
    db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
      .run("Admin User", "admin@example.com", hashedPassword, "admin");

    // Company
    const companyId = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
      .run("TechCorp Solutions", "hr@techcorp.com", hashedPassword, "company").lastInsertRowid;
    db.prepare("INSERT INTO companies (user_id, industry) VALUES (?, ?)").run(companyId, "Software Development");

    // Internship
    db.prepare(`
      INSERT INTO internships (company_id, role, required_skills, seats, duration, description) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, "Full Stack Developer", JSON.stringify(["React", "Node.js", "TypeScript"]), 5, "6 Months", "Join our team to build modern web applications using the latest technologies.");

    // Student
    const studentId = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
      .run("John Doe", "john@example.com", hashedPassword, "student").lastInsertRowid;
    db.prepare("INSERT INTO students (user_id, college, branch, cgpa, skills, preferences, experience_score) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(studentId, "IIT Bombay", "Computer Science", 9.2, JSON.stringify(["React", "JavaScript"]), JSON.stringify(["Full Stack Developer"]), 8);
  }
};
seed();

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AI & ML Engine Logic ---
const calculateSuccessProbability = (matchScore: number, cgpa: number, experience: number) => {
  // Simulated Logistic Regression Model
  // Coefficients (beta) would normally be trained on historical data
  const b0 = -2.5; // Intercept
  const b1 = 4.0;  // Match Score weight
  const b2 = 0.5;  // CGPA weight
  const b3 = 0.8;  // Experience weight
  
  const z = b0 + (b1 * matchScore) + (b2 * (cgpa / 10)) + (b3 * (experience / 10));
  const probability = 1 / (1 + Math.exp(-z));
  return Math.round(probability * 100) / 100;
};

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role, ...details } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    const info = stmt.run(name, email, hashedPassword, role);
    const userId = info.lastInsertRowid;

    if (role === 'student') {
      db.prepare("INSERT INTO students (user_id, college, branch, cgpa, skills, preferences) VALUES (?, ?, ?, ?, ?, ?)")
        .run(userId, details.college || '', details.branch || '', details.cgpa || 0, JSON.stringify(details.skills || []), JSON.stringify(details.preferences || []));
    } else if (role === 'company') {
      db.prepare("INSERT INTO companies (user_id, industry) VALUES (?, ?)")
        .run(userId, details.industry || '');
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

// --- Student Routes ---
app.get("/api/student/profile", authenticateToken, (req: any, res) => {
  const profile = db.prepare(`
    SELECT u.name, u.email, s.* 
    FROM users u 
    JOIN students s ON u.id = s.user_id 
    WHERE u.id = ?
  `).get(req.user.id);
  res.json(profile);
});

app.put("/api/student/profile", authenticateToken, (req: any, res) => {
  const { college, branch, cgpa, skills, preferences } = req.body;
  db.prepare(`
    UPDATE students 
    SET college = ?, branch = ?, cgpa = ?, skills = ?, preferences = ? 
    WHERE user_id = ?
  `).run(college, branch, cgpa, JSON.stringify(skills), JSON.stringify(preferences), req.user.id);
  res.json({ message: "Profile updated" });
});

// --- Internship Routes ---
app.get("/api/internships", authenticateToken, (req, res) => {
  const internships = db.prepare(`
    SELECT i.*, u.name as company_name 
    FROM internships i 
    JOIN users u ON i.company_id = u.id
  `).all();
  res.json(internships);
});

app.post("/api/internships", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'company') return res.sendStatus(403);
  const { role, required_skills, seats, duration, description } = req.body;
  db.prepare(`
    INSERT INTO internships (company_id, role, required_skills, seats, duration, description) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, role, JSON.stringify(required_skills), seats, duration, description);
  res.status(201).json({ message: "Internship created" });
});

app.get("/api/company/internships", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'company') return res.sendStatus(403);
  const internships = db.prepare("SELECT * FROM internships WHERE company_id = ?").all(req.user.id);
  res.json(internships);
});

// --- Application Routes ---
app.post("/api/applications", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'student') return res.sendStatus(403);
  const { internship_id } = req.body;
  
  // Calculate initial match score
  const student: any = db.prepare("SELECT * FROM students WHERE user_id = ?").get(req.user.id);
  const internship: any = db.prepare("SELECT * FROM internships WHERE id = ?").get(internship_id);
  
  if (!student || !internship) return res.status(404).json({ error: "Not found" });

  const studentSkills = JSON.parse(student.skills);
  const requiredSkills = JSON.parse(internship.required_skills);
  const studentPrefs = JSON.parse(student.preferences);

  // Matching Score Formula:
  // Match Score = (0.4 × Skill Match) + (0.2 × CGPA) + (0.2 × Preference Match) + (0.2 × Experience)
  
  const skillMatchCount = requiredSkills.filter((s: string) => studentSkills.some((ss: string) => ss.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ss.toLowerCase()))).length;
  const skillMatchPercent = requiredSkills.length > 0 ? skillMatchCount / requiredSkills.length : 0;
  
  const cgpaScore = student.cgpa / 10;
  
  const prefMatch = studentPrefs.some((p: string) => internship.role.toLowerCase().includes(p.toLowerCase())) ? 1 : 0;
  
  const experienceScore = Math.min(student.experience_score / 10, 1); 

  // New Formula: (Skills Match * 50%) + (CGPA * 20%) + (Experience * 20%) + (Preference Match * 10%)
  const score = (0.5 * skillMatchPercent) + (0.2 * cgpaScore) + (0.2 * experienceScore) + (0.1 * prefMatch);
  const successProb = calculateSuccessProbability(score, student.cgpa, student.experience_score);

  db.prepare("INSERT INTO applications (student_id, internship_id, match_score, success_probability) VALUES (?, ?, ?, ?)")
    .run(req.user.id, internship_id, score, successProb);
  
  res.status(201).json({ message: "Applied successfully", score, success_probability: successProb });
});

app.get("/api/student/applications", authenticateToken, (req: any, res) => {
  const apps = db.prepare(`
    SELECT a.*, i.role, u.name as company_name 
    FROM applications a 
    JOIN internships i ON a.internship_id = i.id 
    JOIN users u ON i.company_id = u.id 
    WHERE a.student_id = ?
  `).all(req.user.id);
  res.json(apps);
});

app.post("/api/student/scan-resume", authenticateToken, async (req: any, res) => {
  const { resumeText } = req.body;
  if (!resumeText) return res.status(400).json({ error: "Resume text required" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the following information from the resume text:
      1. Technical Skills (as a JSON array of strings)
      2. CGPA (as a number, if found)
      3. Experience Level (score from 1-10 based on projects/internships)
      
      Return ONLY a JSON object with keys: "skills", "cgpa", "experience_score".
      
      Resume:
      ${resumeText}`,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/recommendation-reason", authenticateToken, async (req: any, res) => {
  const { internshipId } = req.body;
  
  try {
    const student: any = db.prepare("SELECT u.name, s.* FROM users u JOIN students s ON u.id = s.user_id WHERE u.id = ?").get(req.user.id);
    const internship: any = db.prepare("SELECT i.*, u.name as company_name FROM internships i JOIN users u ON i.company_id = u.id WHERE i.id = ?").get(internshipId);

    if (!student || !internship) return res.status(404).json({ error: "Not found" });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As an AI Career Advisor, explain why this internship is a good match for this student.
      
      Student: ${student.name}
      Skills: ${student.skills}
      CGPA: ${student.cgpa}
      Preferences: ${student.preferences}
      
      Internship: ${internship.role} at ${internship.company_name}
      Required Skills: ${internship.required_skills}
      Description: ${internship.description}
      
      Provide a concise 2-3 sentence explanation highlighting specific skill overlaps and career alignment.`,
    });

    res.json({ reason: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/company/applications/:internshipId", authenticateToken, (req: any, res) => {
  const apps = db.prepare(`
    SELECT a.*, u.name as student_name, s.cgpa, s.skills 
    FROM applications a 
    JOIN users u ON a.student_id = u.id 
    JOIN students s ON u.id = s.user_id 
    WHERE a.internship_id = ?
  `).all(req.params.internshipId);
  res.json(apps);
});

// --- Admin & Allocation Routes ---
app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const stats = {
    students: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get(),
    companies: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'company'").get(),
    internships: db.prepare("SELECT COUNT(*) as count FROM internships").get(),
    applications: db.prepare("SELECT COUNT(*) as count FROM applications").get(),
    allocations: db.prepare("SELECT COUNT(*) as count FROM allocations").get(),
    allocation_rate: 0,
    top_skills: db.prepare("SELECT required_skills FROM internships").all()
  };

  const totalApps = (stats.applications as any).count;
  const totalAlloc = (stats.allocations as any).count;
  stats.allocation_rate = totalApps > 0 ? Math.round((totalAlloc / totalApps) * 100) : 0;

  // Process top skills
  const skillMap: Record<string, number> = {};
  (stats.top_skills as any[]).forEach(row => {
    const skills = JSON.parse(row.required_skills);
    skills.forEach((s: string) => {
      skillMap[s] = (skillMap[s] || 0) + 1;
    });
  });
  stats.top_skills = Object.entries(skillMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json(stats);
});

app.post("/api/admin/run-allocation", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  // Simple Greedy Allocation based on Match Score
  const pendingApps = db.prepare(`
    SELECT * FROM applications 
    WHERE status = 'pending' 
    ORDER BY match_score DESC
  `).all();

  const results = [];
  for (const app of pendingApps as any[]) {
    const internship: any = db.prepare("SELECT seats FROM internships WHERE id = ?").get(app.internship_id);
    const allocatedCount: any = db.prepare("SELECT COUNT(*) as count FROM allocations WHERE internship_id = ?").get(app.internship_id);

    if (allocatedCount.count < internship.seats) {
      // Check if student already allocated
      const alreadyAllocated = db.prepare("SELECT * FROM allocations WHERE student_id = ?").get(app.student_id);
      if (!alreadyAllocated) {
        db.prepare("INSERT INTO allocations (student_id, internship_id, score, success_probability) VALUES (?, ?, ?, ?)")
          .run(app.student_id, app.internship_id, app.match_score, app.success_probability);
        db.prepare("UPDATE applications SET status = 'allocated' WHERE id = ?").run(app.id);
        results.push({ student_id: app.student_id, internship_id: app.internship_id, status: 'success' });
      }
    }
  }

  res.json({ message: "Allocation process completed", results });
});

app.get("/api/admin/allocations", authenticateToken, (req: any, res) => {
  const allocations = db.prepare(`
    SELECT al.*, us.name as student_name, uc.name as company_name, i.role 
    FROM allocations al 
    JOIN users us ON al.student_id = us.id 
    JOIN internships i ON al.internship_id = i.id 
    JOIN users uc ON i.company_id = uc.id
  `).all();
  res.json(allocations);
});

app.get("/api/admin/students", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, s.college, s.branch, s.cgpa 
    FROM users u 
    JOIN students s ON u.id = s.user_id 
    WHERE u.role = 'student'
  `).all();
  res.json(students);
});

app.get("/api/admin/companies", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const companies = db.prepare(`
    SELECT u.id, u.name, u.email, c.industry 
    FROM users u 
    JOIN companies c ON u.id = c.user_id 
    WHERE u.role = 'company'
  `).all();
  res.json(companies);
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
