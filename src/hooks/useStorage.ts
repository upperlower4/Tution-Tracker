import { useState, useEffect } from 'react';
import { Student, Batch, Payment } from '../types';
import { calculateBillingMonths } from '../lib/financeUtils';

const STORAGE_KEY = 'tution_tracker_data';
const BATCHES_KEY = 'tution_tracker_batches';

export function useStorage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedStudents = localStorage.getItem(STORAGE_KEY);
    if (savedStudents) {
      try { setStudents(JSON.parse(savedStudents)); } catch (e) { console.error('Failed to load students', e); }
    }
    const savedBatches = localStorage.getItem(BATCHES_KEY);
    if (savedBatches) {
      try { setBatches(JSON.parse(savedBatches)); } catch (e) { console.error('Failed to load batches', e); }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }, [students, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  }, [batches, isLoaded]);

  const addStudent = (student: Omit<Student, 'id' | 'payments' | 'status'>) => {
    const newStudent: Student = { ...student, id: crypto.randomUUID(), payments: [], status: 'active' };
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const archiveStudent = (id: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: 'inactive', archivedDate: new Date().toISOString() } : s));
  };

  const restoreStudent = (id: string, newJoinDate: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        const { dueMonths } = calculateBillingMonths(s);
        const currentExpected = s.salaryType === 'fixed' ? dueMonths.length * s.monthlyFee : 0;
        return { ...s, status: 'active', joinDate: newJoinDate, archivedDate: undefined, legacyExpected: (s.legacyExpected || 0) + currentExpected };
      }
      return s;
    }));
  };

  const addPayment = (studentId: string, amount: number, month: string, note?: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const newPayment: Payment = { id: crypto.randomUUID(), amountPaid: amount, totalDue: s.monthlyFee, month, date: new Date().toISOString(), note };
        return { ...s, payments: [...s.payments, newPayment] };
      }
      return s;
    }));
  };

  const editPayment = (studentId: string, paymentId: string, updates: { amountPaid?: number; month?: string; note?: string }) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, payments: s.payments.map(p => p.id === paymentId ? { ...p, ...updates } : p) };
      }
      return s;
    }));
  };

  const deletePayment = (studentId: string, paymentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, payments: s.payments.filter(p => p.id !== paymentId) };
      }
      return s;
    }));
  };

  const deleteStudentPermanently = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const addBatch = (batch: Omit<Batch, 'id' | 'createdAt'>) => {
    const newBatch: Batch = { ...batch, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setBatches(prev => [...prev, newBatch]);
  };

  const updateBatch = (id: string, updates: Partial<Batch>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
    setStudents(prev => prev.map(s => s.batchId === id ? { ...s, batchId: undefined } : s));
  };

  return {
    students, addStudent, updateStudent, archiveStudent, restoreStudent, deleteStudentPermanently,
    addPayment, editPayment, deletePayment,
    batches, addBatch, updateBatch, deleteBatch,
    isLoaded
  };
}