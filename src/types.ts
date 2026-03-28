export type Role = 'admin' | 'staff';

export interface User {
  username: string;
  password?: string;
  role: Role;
}

export interface TreatmentRecord {
  id: string;
  date: string;
  procedure: string;
  notes: string;
  cost: number;
  paid: number;
}

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  address: string;
  medicalHistory: string;
  dentalHistory: string;
  allergies: string;
  currentMedications: string;
  treatmentRecords: TreatmentRecord[];
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}
