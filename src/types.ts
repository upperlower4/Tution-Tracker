export type SalaryType = 'free' | 'fixed' | 'not-sure';

export interface Payment {
  id: string;
  month: string; // ISO string for the start of the billing month
  amountPaid: number;
  totalDue: number;
  date: string;
  note?: string;
}

export interface Batch {
  id: string;
  name: string;
  className: string;
  classDays: string[];
  monthlyFee: number;
  salaryType: SalaryType;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  joinDate: string;
  phone: string;
  whatsapp: string;
  classDays: string[]; // ['Mon', 'Wed', 'Fri']
  salaryType: SalaryType;
  monthlyFee: number;
  additionalInfo?: string;
  payments: Payment[];
  status: 'active' | 'inactive';
  archivedDate?: string;
  legacyExpected?: number;
  batchId?: string; // Optional link to a batch
}

export interface AppState {
  students: Student[];
  batches: Batch[];
  version: string;
  timestamp: string;
}
