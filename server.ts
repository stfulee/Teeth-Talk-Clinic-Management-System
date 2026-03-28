import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database setup
  const db = new Database('./database.sqlite');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      contactNumber TEXT,
      address TEXT,
      medicalHistory TEXT,
      dentalHistory TEXT,
      allergies TEXT,
      currentMedications TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS treatment_records (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      date TEXT,
      procedure TEXT,
      notes TEXT,
      cost REAL,
      paid REAL,
      FOREIGN KEY(patientId) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      patientName TEXT,
      date TEXT,
      time TEXT,
      type TEXT,
      status TEXT
    );
  `);

  // Default users
  const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('staff', 'staff123', 'staff');
  }

  // Auth API
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    const { username, password, role } = req.body;
    try {
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: 'Username already exists' });
    }
  });

  // Patients API
  app.get('/api/patients', async (req, res) => {
    const patients = db.prepare('SELECT * FROM patients').all() as any[];
    for (const patient of patients) {
      patient.treatmentRecords = db.prepare('SELECT * FROM treatment_records WHERE patientId = ?').all(patient.id);
    }
    res.json(patients);
  });

  app.post('/api/patients', async (req, res) => {
    const patient = req.body;
    db.prepare(
      'INSERT INTO patients (id, fullName, age, gender, contactNumber, address, medicalHistory, dentalHistory, allergies, currentMedications, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      patient.id, patient.fullName, patient.age, patient.gender, patient.contactNumber, patient.address, patient.medicalHistory, patient.dentalHistory, patient.allergies, patient.currentMedications, patient.createdAt
    );
    res.json({ success: true });
  });

  app.put('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const patient = req.body;
    db.prepare(
      'UPDATE patients SET fullName = ?, age = ?, gender = ?, contactNumber = ?, address = ?, medicalHistory = ?, dentalHistory = ?, allergies = ?, currentMedications = ? WHERE id = ?'
    ).run(
      patient.fullName, patient.age, patient.gender, patient.contactNumber, patient.address, patient.medicalHistory, patient.dentalHistory, patient.allergies, patient.currentMedications, id
    );
    res.json({ success: true });
  });

  app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    db.prepare('DELETE FROM treatment_records WHERE patientId = ?').run(id);
    res.json({ success: true });
  });

  // Treatment Records API
  app.post('/api/patients/:id/treatments', async (req, res) => {
    const { id: patientId } = req.params;
    const record = req.body;
    db.prepare(
      'INSERT INTO treatment_records (id, patientId, date, procedure, notes, cost, paid) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      record.id, patientId, record.date, record.procedure, record.notes, record.cost, record.paid
    );
    res.json({ success: true });
  });

  // Appointments API
  app.get('/api/appointments', async (req, res) => {
    const appointments = db.prepare('SELECT * FROM appointments').all();
    res.json(appointments);
  });

  app.post('/api/appointments', async (req, res) => {
    const appointment = req.body;
    db.prepare(
      'INSERT INTO appointments (id, patientId, patientName, date, time, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      appointment.id, appointment.patientId, appointment.patientName, appointment.date, appointment.time, appointment.type, appointment.status
    );
    res.json({ success: true });
  });

  app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
