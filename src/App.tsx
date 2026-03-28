/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Search, 
  Plus, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  Download,
  Printer,
  Shield,
  User as UserIcon,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { cn } from './lib/utils';
import { Patient, TreatmentRecord, Appointment, User, Role } from './types';

const LOGO_URL = "https://scontent.fmnl17-2.fna.fbcdn.net/v/t39.30808-6/365407648_102175382979170_6744153975915575014_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=1d70fc&_nc_eui2=AeEip0M-VMqb-7yuZovbcnNDoMxW8hkFhpGgzFbyGQWGkRNhr_Y1L2B6qXaekty4_jOgDs3I9tO2GqzOIR8DFx7R&_nc_ohc=8AIMy9-pP8QQ7kNvwGYGhaT&_nc_oc=Adq2v-4o08AoWHZPr-i0QpL7NZyzCeUfjTV6Wd1Fh2cTrQJ7xTogstxZfC3TIlvo4_M&_nc_zt=23&_nc_ht=scontent.fmnl17-2.fna&_nc_gid=ggYt3ozWlgV1Hh9JLk95mQ&_nc_ss=7a32e&oh=00_AfxVKMWBsjMlRYppLVKgJr2comYtFW5LqdxrhMLEqgsM9g&oe=69CDCACB";

const PesoIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <span className={cn("font-bold inline-flex items-center justify-center", className)} style={{ fontSize: size, width: size, height: size }}>₱</span>
);

type View = 'dashboard' | 'patients' | 'appointments' | 'add-patient' | 'patient-detail' | 'accounting';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (window.innerWidth > 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Load data from API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patientsRes, appointmentsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/appointments')
        ]);
        
        if (patientsRes.ok) setPatients(await patientsRes.json());
        if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    const savedUser = localStorage.getItem('teeth-talks-user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('teeth-talks-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('teeth-talks-user');
    }
  }, [user]);

  const handleLogin = async (loggedInUser: User) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loggedInUser)
      });
      if (res.ok) {
        const user = await res.json();
        setUser(user);
        return { success: true };
      } else {
        return { success: false, message: 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, message: 'Server error' };
    }
  };

  const handleCreateAccount = async (newUser: User) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, message: data.message || 'Error creating account' };
      }
    } catch (error) {
      return { success: false, message: 'Server error' };
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  const addPatient = async (patient: Omit<Patient, 'id' | 'createdAt' | 'treatmentRecords'>) => {
    const newPatient: Patient = {
      ...patient,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      treatmentRecords: []
    };
    
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      if (res.ok) {
        setPatients([newPatient, ...patients]);
        setView('patients');
      }
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const updatePatient = async (updatedPatient: Patient) => {
    try {
      const res = await fetch(`/api/patients/${updatedPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      }
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const deletePatient = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('Only administrators can delete patient records.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      try {
        const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setPatients(patients.filter(p => p.id !== id));
          if (selectedPatientId === id) setSelectedPatientId(null);
          setView('patients');
        }
      } catch (error) {
        console.error('Error deleting patient:', error);
      }
    }
  };

  const handleBackup = () => {
    const data = {
      patients,
      appointments,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teeth-talks-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.patients && Array.isArray(data.patients)) {
          setPatients(data.patients);
          if (data.appointments) setAppointments(data.appointments);
          alert('Data restored successfully!');
          setShowBackupRestore(false);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing backup file.');
      }
    };
    reader.readAsText(file);
  };

  const addTreatment = async (patientId: string, record: Omit<TreatmentRecord, 'id'>) => {
    const newRecord: TreatmentRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      cost: Number(record.cost) || 0,
      paid: Number(record.paid) || 0
    };
    
    try {
      const res = await fetch(`/api/patients/${patientId}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        setPatients(patients.map(p => {
          if (p.id === patientId) {
            return { ...p, treatmentRecords: [newRecord, ...p.treatmentRecords] };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Error adding treatment:', error);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactNumber.includes(searchQuery)
    );
  }, [patients, searchQuery]);

  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  const addAppointment = async (appointment: Appointment) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      if (res.ok) {
        setAppointments([appointment, ...appointments]);
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAppointments(appointments.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} onCreateAccount={handleCreateAccount} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && window.innerWidth <= 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-secondary text-white transition-all duration-300 flex flex-col z-50",
        window.innerWidth <= 1024 ? "fixed inset-y-0 left-0" : "relative",
        isSidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0",
        !isSidebarOpen && window.innerWidth > 1024 && "w-20"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-full bg-white object-cover" referrerPolicy="no-referrer" />
            {isSidebarOpen && <span className="font-bold text-lg truncate">Teeth Talks</span>}
          </div>
          {isSidebarOpen && window.innerWidth <= 1024 && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Patients" 
            active={view === 'patients' || view === 'patient-detail'} 
            onClick={() => setView('patients')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Calendar size={20} />} 
            label="Appointments" 
            active={view === 'appointments'} 
            onClick={() => setView('appointments')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<CreditCard size={20} />} 
            label="Accounting" 
            active={view === 'accounting'} 
            onClick={() => setView('accounting')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Shield size={20} />} 
            label="System" 
            active={showBackupRestore} 
            onClick={() => setShowBackupRestore(true)} 
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-secondary font-bold">
              {user.username[0].toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-white/60 capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <Menu size={20} className={cn("transition-transform", isSidebarOpen && window.innerWidth > 1024 && "rotate-180")} />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-secondary capitalize truncate">
              {view.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search patient..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-primary rounded-lg text-sm w-32 md:w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setView('add-patient')}
              className="btn-primary py-2 px-3 md:px-4 text-xs md:text-sm shadow-lg shadow-accent/20"
            >
              <Plus size={18} />
              <span className="hidden xs:inline">Add Patient</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <DashboardView 
                patients={patients} 
                appointments={appointments} 
                onViewPatients={() => setView('patients')}
                onViewAccounting={() => setView('accounting')}
                onViewAppointments={() => setView('appointments')}
                onViewPatient={(id) => {
                  setSelectedPatientId(id);
                  setView('patient-detail');
                }}
              />
            )}
            {view === 'patients' && (
              <PatientsView 
                patients={filteredPatients} 
                onSelectPatient={(id) => {
                  setSelectedPatientId(id);
                  setView('patient-detail');
                }}
                onDeletePatient={deletePatient}
                onViewAccounting={() => setView('accounting')}
              />
            )}
            {view === 'add-patient' && (
              <AddPatientView 
                onAdd={addPatient} 
                onCancel={() => setView('patients')} 
              />
            )}
            {view === 'patient-detail' && selectedPatient && (
              <PatientDetailView 
                patient={selectedPatient} 
                onBack={() => setView('patients')}
                onUpdate={updatePatient}
                onAddTreatment={addTreatment}
                onDelete={() => deletePatient(selectedPatient.id)}
              />
            )}
            {view === 'appointments' && (
              <AppointmentsView 
                appointments={appointments} 
                patients={patients}
                onAddAppointment={addAppointment}
                onDeleteAppointment={deleteAppointment}
                onUpdateStatus={updateAppointmentStatus}
              />
            )}
            {view === 'accounting' && (
              <AccountingView patients={patients} />
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button for Mobile */}
        {view !== 'add-patient' && view !== 'patient-detail' && (
          <button 
            onClick={() => setView('add-patient')}
            className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-2xl flex items-center justify-center lg:hidden z-40 active:scale-95 transition-transform"
            title="Add Patient"
          >
            <Plus size={28} />
          </button>
        )}

        {/* Backup/Restore Modal */}
        {showBackupRestore && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="text-primary" />
                System Maintenance
              </h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="font-bold mb-2">Backup Data</h3>
                  <p className="text-sm text-gray-500 mb-4">Download a copy of all patient and appointment records.</p>
                  <button onClick={handleBackup} className="btn-secondary w-full">
                    <Download size={18} />
                    Download Backup
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="font-bold mb-2">Restore Data</h3>
                  <p className="text-sm text-gray-500 mb-4">Upload a previously saved backup file. This will overwrite current data.</p>
                  <label className="btn-primary w-full cursor-pointer">
                    <Plus size={18} />
                    Upload Backup
                    <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                  </label>
                </div>
              </div>

              <button 
                onClick={() => setShowBackupRestore(false)}
                className="mt-8 w-full py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        active ? "bg-primary text-secondary font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function LoginPage({ onLogin, onCreateAccount }: { 
  onLogin: (u: User) => Promise<{ success: boolean, message?: string }>, 
  onCreateAccount: (u: User) => Promise<{ success: boolean, message?: string }>
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (isLogin) {
      const result = await onLogin({ username, password, role: 'staff' });
      if (!result.success) {
        setError(result.message || 'Invalid credentials.');
      }
    } else {
      const result = await onCreateAccount({ username, password, role });
      if (result.success) {
        setIsLogin(true);
        setError('');
        alert('Account created successfully! Please login.');
      } else {
        setError(result.message || 'Error creating account');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Teeth Talks Logo" className="w-24 h-24 mx-auto rounded-full mb-4 shadow-md object-cover" referrerPolicy="no-referrer" />
          <h1 className="text-3xl font-bold text-secondary">Teeth Talks</h1>
          <p className="text-gray-500 mt-2">Clinic Management System</p>
        </div>

        <div className="flex gap-4 mb-6 p-1 bg-gray-100 rounded-lg">
          <button 
            onClick={() => { setIsLogin(true); setError(''); }}
            className={cn("flex-1 py-2 rounded-md transition-all", isLogin ? "bg-white shadow-sm text-secondary font-bold" : "text-gray-500")}
          >
            Login
          </button>
          <button 
            onClick={() => { setIsLogin(false); setError(''); }}
            className={cn("flex-1 py-2 rounded-md transition-all", !isLogin ? "bg-white shadow-sm text-secondary font-bold" : "text-gray-500")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select 
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-lg mt-4 disabled:opacity-50">
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">© 2026 Teeth Talks Dental Clinic. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardView({ patients, appointments, onViewPatients, onViewAccounting, onViewAppointments, onViewPatient }: { 
  patients: Patient[], 
  appointments: Appointment[], 
  onViewPatients: () => void,
  onViewAccounting: () => void,
  onViewAppointments: () => void,
  onViewPatient: (id: string) => void
}) {
  const totalRevenue = useMemo(() => {
    return patients.reduce((acc, p) => 
      acc + p.treatmentRecords.reduce((tAcc, r) => tAcc + (r.paid || 0), 0)
    , 0);
  }, [patients]);

  const totalBalance = useMemo(() => {
    return patients.reduce((acc, p) => 
      acc + p.treatmentRecords.reduce((tAcc, r) => tAcc + ((r.cost || 0) - (r.paid || 0)), 0)
    , 0);
  }, [patients]);

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: <Users className="text-primary" />, color: 'bg-primary/10', onClick: onViewPatients },
    { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, icon: <PesoIcon className="text-green-600" />, color: 'bg-green-50', onClick: onViewAccounting },
    { label: 'Outstanding Balance', value: `₱${totalBalance.toLocaleString()}`, icon: <AlertCircle className="text-red-500" />, color: 'bg-red-50', onClick: onViewAccounting },
    { label: 'Today\'s Appointments', value: appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length, icon: <Calendar className="text-accent" />, color: 'bg-accent/10', onClick: onViewAppointments },
  ];

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'MMM dd');
    }).reverse();

    return last7Days.map(day => ({
      name: day,
      patients: patients.filter(p => format(new Date(p.createdAt), 'MMM dd') === day).length
    }));
  }, [patients]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={stat.onClick}
          >
            <div className={cn("p-3 rounded-xl", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-secondary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-bold mb-6">Patient Growth (Last 7 Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="patients" fill="#4EE2ED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Recent Patients</h3>
            <button onClick={onViewPatients} className="text-sm text-primary font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {patients.slice(0, 5).map(patient => (
              <div 
                key={patient.id} 
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => onViewPatient(patient.id)}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-secondary font-bold">
                  {patient.fullName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{patient.fullName}</p>
                  <p className="text-xs text-gray-500">{patient.contactNumber}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))}
            {patients.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users size={40} className="mx-auto mb-2 opacity-20" />
                <p>No patients recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PatientsView({ patients, onSelectPatient, onDeletePatient, onViewAccounting }: { 
  patients: Patient[], 
  onSelectPatient: (id: string) => void,
  onDeletePatient: (id: string) => void,
  onViewAccounting: () => void
}) {
  const [activeTab, setActiveTab] = useState<'list' | 'accounting'>('list');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
          <Users className="text-primary" />
          Patient Directory
        </h2>
        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-lg transition-all",
              activeTab === 'list' ? "bg-white text-secondary shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Patient List
          </button>
          <button 
            onClick={() => setActiveTab('accounting')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-lg transition-all",
              activeTab === 'accounting' ? "bg-white text-secondary shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Accounting
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-secondary">Patient Name</th>
                    <th className="px-6 py-4 text-sm font-bold text-secondary">Age/Gender</th>
                    <th className="px-6 py-4 text-sm font-bold text-secondary">Contact</th>
                    <th className="px-6 py-4 text-sm font-bold text-secondary">Last Visit</th>
                    <th className="px-6 py-4 text-sm font-bold text-secondary text-right">Balance</th>
                    <th className="px-6 py-4 text-sm font-bold text-secondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map(patient => {
                    const balance = patient.treatmentRecords.reduce((acc, r) => acc + ((r.cost || 0) - (r.paid || 0)), 0);
                    return (
                      <tr key={patient.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group/name"
                            onClick={() => onSelectPatient(patient.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-secondary flex items-center justify-center font-bold text-xs group-hover/name:bg-primary/30 transition-colors">
                              {patient.fullName[0]}
                            </div>
                            <span className="font-medium group-hover/name:text-primary transition-colors">{patient.fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {patient.age} / {patient.gender}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {patient.contactNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {patient.treatmentRecords.length > 0 
                            ? format(parseISO(patient.treatmentRecords[0].date), 'MMM dd, yyyy')
                            : 'No visits'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs",
                            balance > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                          )}>
                            ₱{balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => onSelectPatient(patient.id)}
                              className="p-2 text-secondary hover:bg-secondary/10 rounded-lg"
                              title="View Details"
                            >
                              <ChevronRight size={18} />
                            </button>
                            <button 
                              onClick={() => onDeletePatient(patient.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {patients.map(patient => {
              const balance = patient.treatmentRecords.reduce((acc, r) => acc + ((r.cost || 0) - (r.paid || 0)), 0);
              return (
                <div 
                  key={patient.id} 
                  className="card p-4 flex items-center justify-between"
                  onClick={() => onSelectPatient(patient.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 text-secondary flex items-center justify-center font-bold text-lg">
                      {patient.fullName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-secondary">{patient.fullName}</h4>
                      <p className="text-xs text-gray-500">{patient.contactNumber} • {patient.age}/{patient.gender}</p>
                      {balance > 0 && (
                        <p className="text-xs font-bold text-red-600 mt-1">Balance: ₱{balance.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeletePatient(patient.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {patients.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">No patients found matching your search.</p>
            </div>
          )}
        </>
      ) : (
        <AccountingView patients={patients} />
      )}
    </motion.div>
  );
}

function AddPatientView({ onAdd, onCancel }: { onAdd: (p: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    fullName: '',
    age: 0,
    gender: 'Male' as const,
    contactNumber: '',
    address: '',
    medicalHistory: '',
    dentalHistory: '',
    allergies: '',
    currentMedications: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto pb-10"
    >
      <div className="flex items-center gap-4 mb-4 md:mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-secondary">Add New Patient</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="card space-y-4 md:space-y-6 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold border-b pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                className="input-field" 
                required 
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Age</label>
              <input 
                type="number" 
                className="input-field" 
                required 
                value={formData.age}
                onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select 
                className="input-field" 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as any})}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input 
                type="tel" 
                className="input-field" 
                required 
                value={formData.contactNumber}
                onChange={e => setFormData({...formData, contactNumber: e.target.value})}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                className="input-field h-20" 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="card space-y-4 md:space-y-6 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold border-b pb-2">Medical & Dental History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Medical History</label>
              <textarea 
                className="input-field h-24" 
                placeholder="Past illnesses, surgeries, etc."
                value={formData.medicalHistory}
                onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Dental History</label>
              <textarea 
                className="input-field h-24" 
                placeholder="Previous dental procedures, issues, etc."
                value={formData.dentalHistory}
                onChange={e => setFormData({...formData, dentalHistory: e.target.value})}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 text-red-600 font-bold">Allergies</label>
              <textarea 
                className="input-field h-24 border-red-200 focus:ring-red-500" 
                placeholder="List any allergies..."
                value={formData.allergies}
                onChange={e => setFormData({...formData, allergies: e.target.value})}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Current Medications</label>
              <textarea 
                className="input-field h-24" 
                placeholder="List any medications currently being taken..."
                value={formData.currentMedications}
                onChange={e => setFormData({...formData, currentMedications: e.target.value})}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
          <button type="button" onClick={onCancel} className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg order-2 sm:order-1">Cancel</button>
          <button type="submit" className="w-full sm:w-auto btn-primary px-10 order-1 sm:order-2">Save Record</button>
        </div>
      </form>
    </motion.div>
  );
}

function PatientDetailView({ patient, onBack, onUpdate, onAddTreatment, onDelete }: { 
  patient: Patient, 
  onBack: () => void,
  onUpdate: (p: Patient) => void,
  onAddTreatment: (pid: string, r: any) => void,
  onDelete: () => void
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'treatments'>('info');
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTreatment, setNewTreatment] = useState({ 
    procedure: '', 
    notes: '', 
    date: format(new Date(), 'yyyy-MM-dd'),
    cost: 0,
    paid: 0
  });
  
  const totalPatientBalance = useMemo(() => {
    return patient.treatmentRecords.reduce((acc, r) => acc + ((r.cost || 0) - (r.paid || 0)), 0);
  }, [patient]);

  const handleFieldChange = (field: keyof Patient, value: any) => {
    onUpdate({ ...patient, [field]: value });
  };

  const handleAddTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTreatment(patient.id, newTreatment);
    setShowAddTreatment(false);
    setNewTreatment({ 
      procedure: '', 
      notes: '', 
      date: format(new Date(), 'yyyy-MM-dd'),
      cost: 0,
      paid: 0
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(22, 84, 119); // Secondary color
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('TEETH TALKS DENTAL CLINIC', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Dr. Angelita P. Magtoto', 105, 30, { align: 'center' });

    // Patient Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Patient Medical Record', 20, 55);
    doc.setLineWidth(0.5);
    doc.line(20, 58, 190, 58);

    doc.setFontSize(11);
    doc.text(`Full Name: ${patient.fullName}`, 20, 70);
    doc.text(`Age/Gender: ${patient.age} / ${patient.gender}`, 20, 78);
    doc.text(`Contact: ${patient.contactNumber}`, 20, 86);
    doc.text(`Address: ${patient.address}`, 20, 94);

    doc.setFontSize(14);
    doc.text('Medical History', 20, 110);
    doc.setFontSize(10);
    doc.text(patient.medicalHistory || 'None recorded', 20, 118, { maxWidth: 170 });

    doc.setFontSize(14);
    doc.text('Allergies', 20, 140);
    doc.setTextColor(255, 0, 0);
    doc.setFontSize(10);
    doc.text(patient.allergies || 'No known allergies', 20, 148, { maxWidth: 170 });

    // Treatment Table
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Treatment Records', 20, 170);

    const tableData = patient.treatmentRecords.map(r => [
      format(parseISO(r.date), 'MMM dd, yyyy'),
      r.procedure,
      r.notes
    ]);

    (doc as any).autoTable({
      startY: 175,
      head: [['Date', 'Procedure', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [22, 84, 119] }
    });

    doc.save(`${patient.fullName.replace(/\s+/g, '_')}_Record.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-secondary">{patient.fullName}</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
              <p className="text-sm text-gray-500">ID: {patient.id} • Registered {format(parseISO(patient.createdAt), 'MMM dd, yyyy')}</p>
              {totalPatientBalance > 0 && (
                <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Balance: ₱{totalPatientBalance.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <Edit size={18} />
          </button>
          <button onClick={exportToPDF} className="btn-secondary text-sm">
            <Download size={16} />
            Export PDF
          </button>
          <button onClick={() => window.print()} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <Printer size={18} />
          </button>
          <button onClick={onDelete} className="p-2 border border-red-100 rounded-lg hover:bg-red-50 text-red-500">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2",
            activeTab === 'info' ? "border-primary text-secondary" : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          Patient Information
        </button>
        <button 
          onClick={() => setActiveTab('treatments')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all border-b-2",
            activeTab === 'treatments' ? "border-primary text-secondary" : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          Treatment Records ({patient.treatmentRecords.length})
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <div className="card">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Full Name</label>
                      <input type="text" className="input-field" value={patient.fullName} onChange={e => handleFieldChange('fullName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Age</label>
                      <input type="number" className="input-field" value={patient.age} onChange={e => handleFieldChange('age', parseInt(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gender</label>
                      <select className="input-field" value={patient.gender} onChange={e => handleFieldChange('gender', e.target.value as any)}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Contact Number</label>
                      <input type="tel" className="input-field" value={patient.contactNumber} onChange={e => handleFieldChange('contactNumber', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <textarea className="input-field h-20" value={patient.address} onChange={e => handleFieldChange('address', e.target.value)}></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Medical History</label>
                      <textarea className="input-field h-24" value={patient.medicalHistory} onChange={e => handleFieldChange('medicalHistory', e.target.value)}></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Dental History</label>
                      <textarea className="input-field h-24" value={patient.dentalHistory} onChange={e => handleFieldChange('dentalHistory', e.target.value)}></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-red-600 font-bold">Allergies</label>
                      <textarea className="input-field h-24 border-red-200" value={patient.allergies} onChange={e => handleFieldChange('allergies', e.target.value)}></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Current Medications</label>
                      <textarea className="input-field h-24" value={patient.currentMedications} onChange={e => handleFieldChange('currentMedications', e.target.value)}></textarea>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-primary px-6">Done Editing</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  Medical Background
                </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Medical History</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{patient.medicalHistory || 'None recorded'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dental History</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{patient.dentalHistory || 'None recorded'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-400 uppercase mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Allergies
                  </p>
                  <p className="text-red-700 font-semibold">{patient.allergies || 'No known allergies'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-400 uppercase mb-1">Current Medications</p>
                  <p className="text-blue-700">{patient.currentMedications || 'None'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Contact Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Age / Gender</p>
                    <p className="font-medium">{patient.age} years old / {patient.gender}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Contact Number</p>
                    <p className="font-medium">{patient.contactNumber}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="font-medium">{patient.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Financial Summary
              </h3>
              <div className="space-y-4">
                {patient.treatmentRecords.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {patient.treatmentRecords.slice(0, 3).map(record => (
                      <div key={record.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-secondary text-sm">{record.procedure}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{format(parseISO(record.date), 'MMM dd')}</p>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Paid: <span className="text-green-600 font-bold">₱{record.paid.toLocaleString()}</span></span>
                          <span className="text-gray-500">Balance: <span className={cn("font-bold", (record.cost - record.paid) > 0 ? "text-red-600" : "text-gray-400")}>₱{(record.cost - record.paid).toLocaleString()}</span></span>
                        </div>
                      </div>
                    ))}
                    {patient.treatmentRecords.length > 3 && (
                      <button 
                        onClick={() => setActiveTab('treatments')} 
                        className="w-full text-center text-primary text-xs font-bold mt-3 hover:underline"
                      >
                        View All Records
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No financial records found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Treatment History</h3>
            <button 
              onClick={() => setShowAddTreatment(true)}
              className="btn-primary text-sm"
            >
              <Plus size={18} />
              Add Treatment
            </button>
          </div>

          {showAddTreatment && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card border-primary bg-primary/5"
            >
              <form onSubmit={handleAddTreatment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      required 
                      value={newTreatment.date}
                      onChange={e => setNewTreatment({...newTreatment, date: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Procedure</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Tooth Extraction, Cleaning, Filling"
                      required 
                      value={newTreatment.procedure}
                      onChange={e => setNewTreatment({...newTreatment, procedure: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea 
                      className="input-field h-20" 
                      placeholder="Details about the procedure..."
                      value={newTreatment.notes}
                      onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})}
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cost (₱)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required 
                      value={newTreatment.cost}
                      onChange={e => setNewTreatment({...newTreatment, cost: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount Paid (₱)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required 
                      value={newTreatment.paid}
                      onChange={e => setNewTreatment({...newTreatment, paid: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddTreatment(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                  <button type="submit" className="btn-primary px-6">Save Treatment</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="space-y-4">
            {patient.treatmentRecords.map((record, i) => (
              <div key={record.id} className="card relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-1 rounded">
                        {format(parseISO(record.date), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        {patient.fullName}
                      </span>
                      <h4 className="font-bold text-lg">{record.procedure}</h4>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap mb-3">{record.notes}</p>
                    <div className="flex flex-wrap gap-4 text-sm border-t pt-3">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp size={14} />
                        Paid Amount: <span className="font-bold">₱{record.paid?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle size={14} />
                        Balance: <span className="font-bold">₱{((record.cost || 0) - (record.paid || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <PesoIcon size={14} />
                        Total Cost: <span className="font-bold text-secondary">₱{record.cost?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {patient.treatmentRecords.length === 0 && !showAddTreatment && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-10" />
                <p>No treatment records yet.</p>
                <button 
                  onClick={() => setShowAddTreatment(true)}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  Add the first treatment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AppointmentsView({ appointments, patients, onAddAppointment, onDeleteAppointment, onUpdateStatus }: { 
  appointments: Appointment[], 
  patients: Patient[],
  onAddAppointment: (a: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  onUpdateStatus: (id: string, status: Appointment['status']) => void
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    type: 'Check-up'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === newApp.patientId);
    if (!patient) return;

    const appointment: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: newApp.patientId,
      patientName: patient.fullName,
      date: newApp.date,
      time: newApp.time,
      type: newApp.type,
      status: 'Scheduled'
    };

    onAddAppointment(appointment);
    setShowAdd(false);
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [appointments]);

  const upcoming = sortedAppointments.filter(a => isAfter(parseISO(a.date), startOfDay(new Date())) || a.date === format(new Date(), 'yyyy-MM-dd'));
  const past = sortedAppointments.filter(a => !upcoming.includes(a));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary">Appointments</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={18} />
          Schedule Appointment
        </button>
      </div>

      {showAdd && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card border-primary"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient</label>
                <select 
                  className="input-field" 
                  required 
                  value={newApp.patientId}
                  onChange={e => setNewApp({...newApp, patientId: e.target.value})}
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select 
                  className="input-field" 
                  value={newApp.type}
                  onChange={e => setNewApp({...newApp, type: e.target.value})}
                >
                  <option>Check-up</option>
                  <option>Cleaning</option>
                  <option>Extraction</option>
                  <option>Filling</option>
                  <option>Root Canal</option>
                  <option>Braces Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  required 
                  value={newApp.date}
                  onChange={e => setNewApp({...newApp, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input 
                  type="time" 
                  className="input-field" 
                  required 
                  value={newApp.time}
                  onChange={e => setNewApp({...newApp, time: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500">Cancel</button>
              <button type="submit" className="btn-primary px-6">Schedule</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} />
            Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {upcoming.map(app => (
              <AppointmentCard 
                key={app.id} 
                appointment={app} 
                onDelete={onDeleteAppointment} 
                onUpdateStatus={onUpdateStatus}
              />
            ))}
            {upcoming.length === 0 && (
              <p className="text-center py-10 bg-white rounded-xl border border-dashed text-gray-400">No upcoming appointments.</p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Past Appointments</h3>
          <div className="space-y-3 opacity-60">
            {past.map(app => (
              <AppointmentCard 
                key={app.id} 
                appointment={app} 
                onDelete={onDeleteAppointment} 
                onUpdateStatus={onUpdateStatus}
              />
            ))}
            {past.length === 0 && (
              <p className="text-center py-10 text-gray-400">No past appointments.</p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function AccountingView({ patients }: { patients: Patient[] }) {
  const allTransactions = useMemo(() => {
    const transactions: any[] = [];
    patients.forEach(patient => {
      patient.treatmentRecords.forEach(record => {
        transactions.push({
          id: record.id,
          patientName: patient.fullName,
          date: record.date,
          procedure: record.procedure,
          cost: record.cost || 0,
          paid: record.paid || 0,
          balance: (record.cost || 0) - (record.paid || 0)
        });
      });
    });
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patients]);

  const totalRevenue = allTransactions.reduce((acc, t) => acc + t.paid, 0);
  const totalBalance = allTransactions.reduce((acc, t) => acc + t.balance, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-primary/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl text-secondary">
              <PesoIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-secondary">₱{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card bg-red-50 border-red-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">₱{totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card bg-green-50 border-green-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Procedures</p>
              <p className="text-2xl font-bold text-green-600">{allTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold">Financial Directory</h3>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <Printer size={18} />
            Print Report
          </button>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-secondary">Patient</th>
                <th className="px-6 py-4 text-sm font-bold text-secondary">Procedure</th>
                <th className="px-6 py-4 text-sm font-bold text-secondary text-right">Paid Amount</th>
                <th className="px-6 py-4 text-sm font-bold text-secondary text-right">Balance</th>
                <th className="px-6 py-4 text-sm font-bold text-secondary text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{t.patientName}</td>
                  <td className="px-6 py-4 text-sm">{t.procedure}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-bold">₱{t.paid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                    {t.balance > 0 ? `₱${t.balance.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-400">{format(parseISO(t.date), 'MMM dd, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-gray-100">
          {allTransactions.map(t => (
            <div key={t.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">{format(parseISO(t.date), 'MMM dd, yyyy')}</p>
                  <h4 className="font-bold text-secondary">{t.patientName}</h4>
                  <p className="text-sm text-gray-600">{t.procedure}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Balance</p>
                  <p className={cn("font-bold", t.balance > 0 ? "text-red-600" : "text-gray-400")}>
                    {t.balance > 0 ? `₱${t.balance.toLocaleString()}` : 'Paid'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Cost</p>
                  <p className="font-semibold text-sm">₱{t.cost.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Paid</p>
                  <p className="font-semibold text-sm text-green-600">₱{t.paid.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {allTransactions.length === 0 && (
          <div className="px-6 py-10 text-center text-gray-400">
            No financial records found.
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, onDelete, onUpdateStatus }) => {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-secondary flex flex-col items-center justify-center">
        <span className="text-xs font-bold">{format(parseISO(appointment.date), 'MMM')}</span>
        <span className="text-lg font-bold leading-none">{format(parseISO(appointment.date), 'dd')}</span>
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-secondary">{appointment.patientName}</h4>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Clock size={14} /> {appointment.time}</span>
          <span className="flex items-center gap-1"><FileText size={14} /> {appointment.type}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select 
          value={appointment.status}
          onChange={(e) => onUpdateStatus(appointment.id, e.target.value as Appointment['status'])}
          className={cn(
            "text-xs font-bold px-2 py-1 rounded-full border-none cursor-pointer focus:ring-0",
            appointment.status === 'Scheduled' ? "bg-blue-50 text-blue-600" : 
            appointment.status === 'Completed' ? "bg-green-50 text-green-600" : 
            "bg-red-50 text-red-600"
          )}
        >
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button 
          onClick={() => onDelete(appointment.id)}
          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
