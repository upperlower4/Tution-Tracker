/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Users, Calendar, DollarSign, Search, ChevronRight, Phone, MessageCircle, Clock,
  Trash2, CreditCard, BarChart3, ArrowLeft, UserPlus, Pencil, GraduationCap, TrendingUp,
  AlertCircle, Wallet, LayoutDashboard, FileText, User, Settings, Check, Layers, Download,
  Upload, Archive, ArchiveRestore, UserCheck, Copy, Share2, Info, Globe, Sun, Moon, Bell,
  ChevronDown, ChevronUp, Edit3, X, CheckCircle2, History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStorage } from './hooks/useStorage';
import { Student, Payment, SalaryType } from './types';
import { DAYS_OF_WEEK, getStudentFinancials } from './lib/financeUtils';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  requestNotificationPermission, schedulePaymentReminders, sendTestNotification, checkNotificationPermission
} from './lib/notifications';

// ─── Helper Components ────────────────────────────────────────────────────────

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden dark:bg-[#1A1D23] dark:border-gray-800/80", className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger'; className?: string }) => {
  const variants = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  };
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>{children}</span>;
};

const AppLogo = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <img src="/logo.png" alt="Tution Pro" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
    <GraduationCap size={size} className="absolute hidden text-white" style={{ display: 'none' }} />
  </div>
);

const Toast = ({ message, show }: { message: string; show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl whitespace-nowrap"
      >
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className={cn("h-1.5 rounded-full transition-all flex-1", i + 1 === current ? "bg-indigo-600 dark:bg-indigo-400" : i + 1 < current ? "bg-indigo-300 dark:bg-indigo-700" : "bg-gray-200 dark:bg-gray-700")} />
    ))}
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
interface StudentFormData {
  name: string; className: string; joinDate: string; batchId: string;
  salaryType: SalaryType; monthlyFee: string; classDays: string[];
  phone: string; whatsapp: string; additionalInfo: string;
}

const defaultForm: StudentFormData = {
  name: '', className: '', joinDate: new Date().toISOString().split('T')[0],
  batchId: '', salaryType: 'fixed', monthlyFee: '', classDays: [], phone: '', whatsapp: '', additionalInfo: ''
};

export default function App() {
  const {
    students, addStudent, updateStudent, archiveStudent, restoreStudent, deleteStudentPermanently,
    addPayment, editPayment, deletePayment, batches, addBatch, updateBatch, deleteBatch, isLoaded
  } = useStorage();

  // ─── Profile & Onboarding ─────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<{ name: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardData, setOnboardData] = useState({ name: '', title: '' });
  const [customClasses, setCustomClasses] = useState<string[]>([]);

  // ─── Navigation ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'batches' | 'reports' | 'settings'>('dashboard');
  const [view, setView] = useState<'main' | 'add' | 'edit' | 'details' | 'add-batch'>('main');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // ─── Form State ───────────────────────────────────────────────────
  const [addStudentStep, setAddStudentStep] = useState(1);
  const [studentForm, setStudentForm] = useState<StudentFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── UI State ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [restoringStudentId, setRestoringStudentId] = useState<string | null>(null);
  const [restoreDate, setRestoreDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showBatchManagement, setShowBatchManagement] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [exitToast, setExitToast] = useState(false);
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [backupFilename, setBackupFilename] = useState('');

  // ─── Transaction State ────────────────────────────────────────────
  const [selectedPayment, setSelectedPayment] = useState<{ payment: Payment; studentId: string } | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [showDeletePayment, setShowDeletePayment] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState({ amountPaid: '', month: '', note: '' });

  // ─── Theme & Notifications ────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tution_dark_mode') === 'true');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('tution_notifications_enabled') === 'true');
  const [notificationPermission, setNotificationPermission] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────
  const backPressRef = useRef(false);

  // ─── Dark Mode ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('tution_dark_mode', darkMode.toString());
  }, [darkMode]);

  // ─── Keyboard Detection ───────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!window.visualViewport) return;
      setKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.75);
    };
    window.visualViewport?.addEventListener('resize', handler);
    window.visualViewport?.addEventListener('scroll', handler);
    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      window.visualViewport?.removeEventListener('scroll', handler);
    };
  }, []);

  // ─── Back Button Handler ──────────────────────────────────────────
  const navigateBack = useCallback(() => {
    if (showAddMenu) { setShowAddMenu(false); return; }
    if (showDeleteModal) { setShowDeleteModal(false); return; }
    if (showTransactionDetail) { setShowTransactionDetail(false); return; }
    if (showEditPayment) { setShowEditPayment(false); return; }
    if (showDeletePayment) { setShowDeletePayment(false); return; }
    if (showResetWarning) { setShowResetWarning(false); return; }
    if (showShareModal) { setShowShareModal(false); return; }
    if (showAppInfo) { setShowAppInfo(false); return; }
    if (showDevInfo) { setShowDevInfo(false); return; }
    if (showBackupConfirm) { setShowBackupConfirm(false); return; }

    if (view === 'add') {
      if (addStudentStep > 1) { setAddStudentStep(s => s - 1); return; }
      setView('main'); setAddStudentStep(1); setSelectedBatchId(null); return;
    }
    if (view === 'edit') { setView('details'); return; }
    if (view === 'details') { setView('main'); return; }
    if (view === 'add-batch') { setView('main'); return; }

    if (activeTab !== 'dashboard') { setActiveTab('dashboard'); setView('main'); return; }

    // On dashboard main — double back to exit
    if (backPressRef.current) {
      try {
        (window as any).navigator?.app?.exitApp?.();
      } catch {}
      try {
        import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => {});
      } catch {}
    } else {
      backPressRef.current = true;
      setExitToast(true);
      setTimeout(() => { backPressRef.current = false; setExitToast(false); }, 2000);
    }
  }, [view, activeTab, addStudentStep, showAddMenu, showDeleteModal, showTransactionDetail,
    showEditPayment, showDeletePayment, showResetWarning, showShareModal, showAppInfo, showDevInfo, showBackupConfirm]);

  useEffect(() => {
    document.addEventListener('backbutton', navigateBack, false);
    return () => document.removeEventListener('backbutton', navigateBack, false);
  }, [navigateBack]);

  // ─── Profile & Notifications ──────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('tution_user_profile_v4');
    if (saved) setUserProfile(JSON.parse(saved));
    else setShowOnboarding(true);
    const savedClasses = localStorage.getItem('tution_classes_v4');
    setCustomClasses(savedClasses ? JSON.parse(savedClasses) : [
      'Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10',
      'HSC 1st Year','HSC 2nd Year','Degree','Honours','Masters','Other'
    ]);
  }, []);

  useEffect(() => {
    checkNotificationPermission().then(setNotificationPermission);
  }, []);

  useEffect(() => {
    if (notificationsEnabled && notificationPermission && students.length > 0) {
      schedulePaymentReminders(students);
    }
  }, [notificationsEnabled, notificationPermission, students]);

  // ─── Populate edit form ───────────────────────────────────────────
  useEffect(() => {
    if (view === 'edit' && selectedStudent) {
      setStudentForm({
        name: selectedStudent.name, className: selectedStudent.className,
        joinDate: selectedStudent.joinDate, batchId: selectedStudent.batchId || '',
        salaryType: selectedStudent.salaryType, monthlyFee: selectedStudent.monthlyFee?.toString() || '',
        classDays: [...selectedStudent.classDays], phone: selectedStudent.phone || '',
        whatsapp: selectedStudent.whatsapp || '', additionalInfo: selectedStudent.additionalInfo || ''
      });
      setAddStudentStep(1);
    } else if (view === 'add') {
      const batch = batches.find(b => b.id === selectedBatchId);
      setStudentForm({
        ...defaultForm,
        batchId: selectedBatchId || '',
        ...(batch ? { className: batch.className, monthlyFee: batch.monthlyFee.toString(), salaryType: batch.salaryType, classDays: [...batch.classDays] } : {})
      });
      setAddStudentStep(1);
    }
  }, [view]);

  // ─── Helpers ──────────────────────────────────────────────────────
  const classesToUse = customClasses.length > 0 ? customClasses : [
    'Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10',
    'HSC 1st Year','HSC 2nd Year','Degree','Honours','Masters','Other'
  ];
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (showArchived ? s.status === 'inactive' : s.status === 'active');
  });

  const handleSaveClasses = (newClasses: string[]) => {
    setCustomClasses(newClasses);
    localStorage.setItem('tution_classes_v4', JSON.stringify(newClasses));
  };

  const handleSaveProfile = async (data: { name: string; title: string }) => {
    setUserProfile(data);
    localStorage.setItem('tution_user_profile_v4', JSON.stringify(data));
    setShowOnboarding(false);
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      setNotificationPermission(true);
      localStorage.setItem('tution_notifications_enabled', 'true');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://tution.pro.bd');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = (platform: 'whatsapp' | 'messenger' | 'other') => {
    const url = 'https://tution.pro.bd';
    const text = 'Check out Tution Pro - The ultimate app for private tutors!';
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else if (platform === 'messenger') {
      handleCopyLink();
    } else {
      if (navigator.share) {
        navigator.share({ title: 'Tution Pro', text, url }).catch(() => handleCopyLink());
      } else {
        handleCopyLink();
      }
    }
  };

  const handleExportData = () => {
    const monthStr = format(new Date(), 'MMMM_yyyy');
    const filename = `TutionPro_${monthStr}_Report.json`;
    setBackupFilename(filename);
    const data = { students, batches, version: '1.0', timestamp: new Date().toISOString() };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const a = document.createElement('a');
    a.setAttribute('href', dataUri);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setShowBackupConfirm(true), 300);
  };

  const handleShareBackup = async () => {
    const data = { students, batches, version: '1.0', timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], backupFilename, { type: 'application/json' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: 'Tution Pro Backup', files: [file] }).catch(() => {});
    } else if (navigator.share) {
      await navigator.share({ title: 'Tution Pro Backup', text: 'My Tution Pro data backup', url: 'https://tution.pro.bd' }).catch(() => {});
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.students && data.batches) {
          if (confirm('This will replace all your current data with the backup. Continue?')) {
            localStorage.setItem('tution_tracker_data', JSON.stringify(data.students));
            localStorage.setItem('tution_tracker_batches', JSON.stringify(data.batches));
            window.location.reload();
          }
        } else { alert('Invalid backup file format.'); }
      } catch { alert('Failed to read backup file.'); }
    };
    reader.readAsText(file);
  };

  // ─── Student Form Submit ──────────────────────────────────────────
  const handleStudentSubmit = () => {
    if (isSubmitting) return;
    if (addStudentStep < 3) { setAddStudentStep(s => s + 1); return; }
    setIsSubmitting(true);
    const data = {
      name: studentForm.name, className: studentForm.className, joinDate: studentForm.joinDate,
      phone: studentForm.phone, whatsapp: studentForm.whatsapp, classDays: studentForm.classDays,
      salaryType: studentForm.salaryType, monthlyFee: Number(studentForm.monthlyFee) || 0,
      additionalInfo: studentForm.additionalInfo, batchId: studentForm.batchId || undefined,
    };
    if (view === 'add') { addStudent(data); setView('main'); setActiveTab('students'); setSelectedBatchId(null); }
    else if (view === 'edit' && selectedStudentId) { updateStudent(selectedStudentId, data); setView('details'); }
    setAddStudentStep(1);
    setIsSubmitting(false);
  };

  const handleOpenTransactionDetail = (payment: Payment, studentId: string) => {
    setSelectedPayment({ payment, studentId });
    setShowTransactionDetail(true);
  };

  const handleEditPayment = () => {
    if (!selectedPayment) return;
    setEditPaymentForm({
      amountPaid: selectedPayment.payment.amountPaid.toString(),
      month: selectedPayment.payment.month,
      note: selectedPayment.payment.note || ''
    });
    setShowTransactionDetail(false);
    setShowEditPayment(true);
  };

  const handleSaveEditPayment = () => {
    if (!selectedPayment) return;
    editPayment(selectedPayment.studentId, selectedPayment.payment.id, {
      amountPaid: Number(editPaymentForm.amountPaid),
      month: editPaymentForm.month,
      note: editPaymentForm.note
    });
    setShowEditPayment(false);
    setSelectedPayment(null);
  };

  const handleDeletePaymentConfirm = () => {
    if (!selectedPayment) return;
    deletePayment(selectedPayment.studentId, selectedPayment.payment.id);
    setShowDeletePayment(false);
    setShowTransactionDetail(false);
    setSelectedPayment(null);
  };

  // Recent transactions across all students
  const recentTransactions = students
    .flatMap(s => s.payments.map(p => ({ ...p, studentName: s.name, studentId: s.id })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // ─── Loading ──────────────────────────────────────────────────────
  if (!isLoaded) return <div className="flex items-center justify-center h-screen font-sans text-gray-500">Loading...</div>;

  // ─── Onboarding ───────────────────────────────────────────────────
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F1115] flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-[#1A1D23] rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden">
            <img src="/logo.png" alt="Tution Pro" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display='none'; }} />
            <GraduationCap size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 dark:text-gray-100">Welcome!</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 text-sm">Set up your Tution Pro profile to get started.</p>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (onboardData.name && onboardData.title) handleSaveProfile(onboardData); }}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
              <input required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-400 dark:text-gray-100" placeholder="e.g. Tanvir Ahmed" value={onboardData.name} onChange={(e) => setOnboardData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Professional Title</label>
              <input required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-400 dark:text-gray-100" placeholder="e.g. Mathematics Tutor" value={onboardData.title} onChange={(e) => setOnboardData(p => ({ ...p, title: e.target.value }))} />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] mt-4">
              Get Started
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ─── Main App ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans dark:bg-[#0F1115] dark:text-gray-100 transition-colors duration-300">
      <Toast message="Press back again to exit" show={exitToast} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-3xl border-b border-gray-100/50 sticky top-0 z-40 dark:bg-[#0F1115]/80 dark:border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => { setActiveTab('dashboard'); setView('main'); }}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200/60 dark:shadow-none group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Tution Pro" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as any).style.display='none'; (e.target as any).nextSibling.style.display='block'; }} />
              <GraduationCap size={18} style={{ display: 'none' }} />
            </div>
            <div>
              <h1 className="font-black text-[15px] tracking-tight text-gray-900 leading-none dark:text-white">
                Tution<span className="text-indigo-600">Pro</span>
              </h1>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 dark:text-gray-500">
                {userProfile?.name.split(' ')[0]}
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 mr-4">
            {[
              { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={16} /> },
              { id: 'students', label: 'Students', icon: <Users size={16} /> },
              { id: 'reports', label: 'Reports', icon: <FileText size={16} /> },
              { id: 'settings', label: 'Profile', icon: <User size={16} /> },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setView('main'); }}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                  activeTab === tab.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800")}>
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setDarkMode(!darkMode)}
            className={cn("p-2 rounded-xl transition-all", darkMode ? "text-amber-400 bg-amber-400/10" : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10")}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-28 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {/* ─── Dashboard ─── */}
          {activeTab === 'dashboard' && view === 'main' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Monthly Target', value: `৳${students.filter(s => s.status === 'active' && s.salaryType === 'fixed').reduce((a, s) => a + s.monthlyFee, 0).toLocaleString()}`, color: 'text-white', bg: 'bg-indigo-600', icon: <TrendingUp className="w-4 h-4" />, sub: format(new Date(), 'MMM') + ' target' },
                  { label: 'Collected', value: `৳${students.reduce((a, s) => a + s.payments.filter(p => { const d = parseISO(p.date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); }).reduce((pa, p) => pa + p.amountPaid, 0), 0).toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-white', icon: <DollarSign className="w-4 h-4" />, sub: 'This month' },
                  { label: 'Total Dues', value: `৳${students.filter(s => s.status === 'active').reduce((a, s) => a + getStudentFinancials(s).dues, 0).toLocaleString()}`, color: 'text-rose-600', bg: 'bg-white', icon: <AlertCircle className="w-4 h-4" />, sub: 'Pending' },
                  { label: 'New Students', value: students.filter(s => { const d = parseISO(s.joinDate); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); }).length, color: 'text-indigo-600', bg: 'bg-white', icon: <UserPlus className="w-4 h-4" />, sub: 'This month' }
                ].map((stat, i) => (
                  <Card key={i} className={cn("p-4 border-none rounded-[1.25rem] flex flex-col justify-between min-h-[100px]", stat.bg === 'bg-white' ? "bg-white dark:bg-[#1A1D23] dark:border-gray-800/80" : stat.bg)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("p-1.5 rounded-lg", stat.bg === 'bg-indigo-600' ? "bg-white/10 text-white" : "bg-gray-50 dark:bg-gray-800 " + stat.color)}>{stat.icon}</div>
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", stat.bg === 'bg-indigo-600' ? "text-indigo-100" : "text-gray-400 dark:text-gray-500")}>{stat.label}</p>
                    </div>
                    <div>
                      <h3 className={cn("text-lg sm:text-xl font-black tracking-tighter mb-0.5", stat.bg === 'bg-indigo-600' ? "text-white" : (darkMode ? "text-gray-100" : stat.color))}>{stat.value}</h3>
                      <p className={cn("text-[9px] font-bold uppercase tracking-wider opacity-60", stat.bg === 'bg-indigo-600' ? "text-white" : "text-gray-500 dark:text-gray-400")}>{stat.sub}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setSelectedStudentId(null); setSelectedBatchId(null); setActiveTab('students'); setView('add'); }}
                  className="group bg-white dark:bg-[#1A1D23] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex items-center gap-3 text-left active:scale-[0.97] transition-all">
                  <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center group-active:scale-95 transition-transform shrink-0"><Plus size={22} /></div>
                  <div><p className="font-black text-sm dark:text-gray-100">Add Student</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Register learner</p></div>
                </button>
                <button onClick={() => { setActiveTab('batches'); setView('main'); }}
                  className="group bg-white dark:bg-[#1A1D23] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex items-center gap-3 text-left active:scale-[0.97] transition-all">
                  <div className="w-11 h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center group-active:scale-95 transition-transform shrink-0"><Layers size={22} /></div>
                  <div><p className="font-black text-sm dark:text-gray-100">Batches</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage groups</p></div>
                </button>
              </div>

              {/* Recent Students */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-black text-base tracking-tight flex items-center gap-2 dark:text-gray-100"><Users size={16} className="text-indigo-600" />Recent Students</h2>
                  <button onClick={() => setActiveTab('students')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">See All</button>
                </div>
                <div className="space-y-2">
                  {students.filter(s => s.status === 'active').slice(0, 5).map(student => {
                    const fin = getStudentFinancials(student);
                    return (
                      <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setActiveTab('students'); setView('details'); }}
                        className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0">{student.name.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="font-black text-sm dark:text-gray-100 truncate">{student.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{student.className}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {student.salaryType === 'fixed' ? (
                            fin.dues > 0 ? <span className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Due ৳{fin.dues.toLocaleString()}</span>
                              : <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Paid</span>
                          ) : <span className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Per Class</span>}
                          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                        </div>
                      </div>
                    );
                  })}
                  {students.filter(s => s.status === 'active').length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-[#1A1D23] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                      <p className="text-gray-400 text-sm font-medium">No students yet. Add your first student!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Students List ─── */}
          {activeTab === 'students' && view === 'main' && (
            <motion.div key="students" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Search students or classes..." className="w-full bg-white dark:bg-[#1A1D23] border border-gray-100 dark:border-gray-800 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium placeholder:text-gray-400 dark:text-gray-100" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-base tracking-tight flex items-center gap-2 dark:text-gray-100">{showArchived ? <Archive size={16} className="text-indigo-600" /> : <Users size={16} className="text-indigo-600" />}{showArchived ? 'Archived' : 'Directory'}</h2>
                  <button onClick={() => setShowArchived(!showArchived)} className={cn("p-1.5 rounded-lg transition-all", showArchived ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>{showArchived ? <UserCheck size={13} /> : <Archive size={13} />}</button>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredStudents.length} students</span>
              </div>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-14 bg-white dark:bg-[#1A1D23] rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <Users size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 text-sm font-medium">No students found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(student => {
                    const fin = getStudentFinancials(student);
                    return (
                      <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setView('details'); }}
                        className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-black shrink-0">{student.name.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="font-black text-sm dark:text-gray-100 truncate">{student.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate">{student.className} • {student.classDays.join(', ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {student.salaryType === 'fixed' ? (
                            fin.dues > 0 ? <span className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Due ৳{fin.dues.toLocaleString()}</span>
                              : fin.advance > 0 ? <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Adv ৳{fin.advance.toLocaleString()}</span>
                                : <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">Paid</span>
                          ) : <span className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">{student.salaryType === 'free' ? 'Free' : 'Not Fixed'}</span>}
                          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Add / Edit Student (3-step) ─── */}
          {(view === 'add' || view === 'edit') && (
            <motion.div key={view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => {
                  if (addStudentStep > 1) { setAddStudentStep(s => s - 1); return; }
                  setView(view === 'edit' ? 'details' : 'main'); setSelectedBatchId(null); setAddStudentStep(1);
                }} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-black text-xl tracking-tight dark:text-gray-100">{view === 'add' ? 'New Student' : 'Edit Student'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {addStudentStep} of 3</p>
                </div>
              </div>

              <StepIndicator current={addStudentStep} total={3} />

              <div className="space-y-4">
                {/* Step 1: Basic Info */}
                {addStudentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-200 dark:shadow-none"><UserPlus size={22} /></div>
                      <h3 className="font-black text-lg dark:text-gray-100">Basic Information</h3>
                      <p className="text-gray-400 text-sm">Name, class and enrollment details</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
                      <input value={studentForm.name} onChange={e => setStudentForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rahim Ahmed" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold placeholder:text-gray-400 dark:text-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign to Batch</label>
                      <select value={studentForm.batchId} onChange={e => {
                        const batch = batches.find(b => b.id === e.target.value);
                        setStudentForm(p => ({ ...p, batchId: e.target.value, ...(batch ? { className: batch.className, monthlyFee: batch.monthlyFee.toString(), salaryType: batch.salaryType, classDays: [...batch.classDays] } : {}) }));
                      }} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold appearance-none dark:text-gray-100">
                        <option value="">No Batch (Individual)</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.className})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class / Subject *</label>
                      <select value={studentForm.className} onChange={e => setStudentForm(p => ({ ...p, className: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold appearance-none dark:text-gray-100">
                        <option value="">Select Class</option>
                        {classesToUse.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Join Date *</label>
                      <input type="date" value={studentForm.joinDate} onChange={e => setStudentForm(p => ({ ...p, joinDate: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold dark:text-gray-100" />
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Schedule & Payment */}
                {addStudentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-200 dark:shadow-none"><Calendar size={22} /></div>
                      <h3 className="font-black text-lg dark:text-gray-100">Schedule & Payment</h3>
                      <p className="text-gray-400 text-sm">Class days and fee details</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ id: 'fixed', label: 'Fixed' }, { id: 'free', label: 'Free' }, { id: 'not-sure', label: 'Not Fixed' }].map(type => (
                          <button key={type.id} type="button" onClick={() => setStudentForm(p => ({ ...p, salaryType: type.id as SalaryType }))}
                            className={cn("py-3.5 rounded-2xl font-black text-xs uppercase tracking-tight transition-all border-2", studentForm.salaryType === type.id ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-indigo-400" : "bg-gray-50 border-transparent text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {studentForm.salaryType === 'fixed' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Fee (৳)</label>
                        <input type="number" value={studentForm.monthlyFee} onChange={e => setStudentForm(p => ({ ...p, monthlyFee: e.target.value }))} placeholder="0" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold placeholder:text-gray-400 dark:text-gray-100" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class Days</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <button key={day} type="button" onClick={() => setStudentForm(p => ({ ...p, classDays: p.classDays.includes(day) ? p.classDays.filter(d => d !== day) : [...p.classDays, day] }))}
                            className={cn("w-12 h-12 rounded-2xl font-black text-xs transition-all", studentForm.classDays.includes(day) ? "bg-indigo-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400")}>
                            {day.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contact */}
                {addStudentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-violet-200 dark:shadow-none"><Phone size={22} /></div>
                      <h3 className="font-black text-lg dark:text-gray-100">Contact & Notes</h3>
                      <p className="text-gray-400 text-sm">Phone, WhatsApp and additional info</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input type="tel" value={studentForm.phone} onChange={e => setStudentForm(p => ({ ...p, phone: e.target.value }))} placeholder="017XXXXXXXX" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold placeholder:text-gray-400 dark:text-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                      <input type="tel" value={studentForm.whatsapp} onChange={e => setStudentForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="880171XXXXXXX" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold placeholder:text-gray-400 dark:text-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Notes</label>
                      <textarea value={studentForm.additionalInfo} onChange={e => setStudentForm(p => ({ ...p, additionalInfo: e.target.value }))} rows={3} placeholder="Any special notes..." className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold placeholder:text-gray-400 resize-none dark:text-gray-100" />
                    </div>
                  </motion.div>
                )}

                {/* Validation notice */}
                {addStudentStep === 1 && (!studentForm.name || !studentForm.className) && (
                  <p className="text-[10px] text-amber-500 font-bold text-center">Please fill in Name and Class to continue</p>
                )}

                <button onClick={handleStudentSubmit} disabled={isSubmitting || (addStudentStep === 1 && (!studentForm.name || !studentForm.className))}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {addStudentStep < 3 ? <><span>Continue</span><ChevronRight size={18} /></> : isSubmitting ? 'Saving...' : <><Check size={18} /><span>{view === 'add' ? 'Register Student' : 'Save Changes'}</span></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Student Details ─── */}
          {view === 'details' && selectedStudent && (
            <motion.div key="details" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-bold text-xs uppercase tracking-widest">
                  <ArrowLeft size={16} /><span>Back</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {selectedStudent.status === 'inactive' ? (
                    <button onClick={() => { setRestoringStudentId(selectedStudent.id); setRestoreDate(format(new Date(), 'yyyy-MM-dd')); }} className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><ArchiveRestore size={17} /></button>
                  ) : (
                    <button onClick={() => setView('edit')} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl"><Pencil size={17} /></button>
                  )}
                  <button onClick={() => setShowDeleteModal(true)} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"><Trash2 size={17} /></button>
                </div>
              </div>

              {/* Profile card */}
              <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shrink-0">{selectedStudent.name.charAt(0)}</div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-black tracking-tight dark:text-gray-100">{selectedStudent.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest mt-1">{selectedStudent.className}</p>
                  {selectedStudent.status === 'inactive' && <Badge variant="danger" className="mt-2">Inactive</Badge>}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                    {[{ label: format(parseISO(selectedStudent.joinDate), 'dd/MM/yy'), icon: <Calendar size={12} /> }, { label: selectedStudent.salaryType === 'fixed' ? `৳${selectedStudent.monthlyFee}/mo` : selectedStudent.salaryType, icon: <DollarSign size={12} /> }, { label: selectedStudent.classDays.join(', '), icon: <Clock size={12} /> }].map((item, i) => (
                      <span key={i} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400">{item.icon}{item.label}</span>
                    ))}
                  </div>
                  {(selectedStudent.phone || selectedStudent.whatsapp) && (
                    <div className="flex gap-2 mt-3">
                      {selectedStudent.phone && <a href={`tel:${selectedStudent.phone}`} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-xl text-xs font-black"><Phone size={14} />Call</a>}
                      {selectedStudent.whatsapp && <a href={`https://wa.me/${selectedStudent.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-xs font-black"><MessageCircle size={14} />WhatsApp</a>}
                    </div>
                  )}
                </div>
              </div>

              {/* Financials */}
              {(() => {
                const fin = getStudentFinancials(selectedStudent);
                return (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-indigo-600 rounded-2xl p-4"><p className="text-[9px] text-indigo-100 font-black uppercase tracking-widest mb-1">Total Paid</p><p className="text-lg font-black text-white truncate">৳{fin.totalPaid.toLocaleString()}</p></div>
                    <div className={cn("rounded-2xl p-4 border", fin.dues > 0 ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20" : "bg-white dark:bg-[#1A1D23] border-gray-100 dark:border-gray-800/80")}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Dues</p>
                      <p className={cn("text-lg font-black truncate", fin.dues > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-400")}>৳{fin.dues.toLocaleString()}</p>
                    </div>
                    <div className={cn("rounded-2xl p-4 border", fin.advance > 0 ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" : "bg-white dark:bg-[#1A1D23] border-gray-100 dark:border-gray-800/80")}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-gray-400">Advance</p>
                      <p className={cn("text-lg font-black truncate", fin.advance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>৳{fin.advance.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Record Payment */}
              <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-black text-sm dark:text-gray-100">Record Payment</h3>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addPayment(selectedStudent.id, Number(fd.get('amount')), fd.get('month') as string, fd.get('note') as string);
                  e.currentTarget.reset();
                }} className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (৳)</label><input name="amount" type="number" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold dark:text-gray-100" placeholder="0" /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Month</label>
                    <select name="month" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold appearance-none dark:text-gray-100">
                      {getStudentFinancials(selectedStudent).billingMonths.map((d, i) => <option key={i} value={d.toISOString()}>{format(d, 'MMM yyyy')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Note</label><input name="note" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 outline-none font-bold dark:text-gray-100" placeholder="Optional" /></div>
                  <div className="flex items-end"><button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"><Check size={16} />Pay</button></div>
                </form>
              </div>

              {/* Payment History */}
              <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2"><History size={14} className="text-indigo-600 dark:text-indigo-400" /><h3 className="font-black text-sm dark:text-gray-100">Transactions</h3></div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{selectedStudent.payments.length} records</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800/80 max-h-72 overflow-y-auto no-scrollbar">
                  {selectedStudent.payments.length === 0 ? (
                    <p className="p-8 text-center text-gray-400 text-sm font-medium">No transactions yet.</p>
                  ) : (
                    [...selectedStudent.payments].reverse().map(payment => (
                      <button key={payment.id} onClick={() => handleOpenTransactionDetail(payment, selectedStudent.id)}
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><DollarSign size={14} /></div>
                          <div className="min-w-0">
                            <p className="font-black text-sm dark:text-gray-100">৳{payment.amountPaid.toLocaleString()}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{format(parseISO(payment.month), 'MMM yyyy')} • {format(parseISO(payment.date), 'dd/MM/yy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {payment.note && <span className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-400 px-2 py-1 rounded-lg max-w-[80px] truncate">{payment.note}</span>}
                          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Archive/Restore Modals */}
              <AnimatePresence>
                {showDeleteModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-900 rounded-[2rem] p-7 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
                      <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-4 mx-auto"><Trash2 size={26} /></div>
                      <h3 className="text-xl font-black text-center mb-2 dark:text-gray-100">Stop Teaching?</h3>
                      <p className="text-gray-400 text-center mb-6 text-sm font-medium">Student will be archived. Payment history preserved.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                        <button onClick={() => { archiveStudent(selectedStudent.id); setShowDeleteModal(false); setView('main'); }} className="py-3.5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Archive</button>
                      </div>
                    </motion.div>
                  </div>
                )}
                {restoringStudentId && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-900 rounded-[2rem] p-7 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
                      <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto"><UserPlus size={26} /></div>
                      <h3 className="text-xl font-black text-center mb-2 dark:text-gray-100">Restore Student?</h3>
                      <p className="text-gray-400 text-center mb-4 text-sm font-medium">Pick a new join date to restart billing.</p>
                      <input type="date" value={restoreDate} onChange={e => setRestoreDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 outline-none font-bold dark:text-gray-100 mb-4" />
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setRestoringStudentId(null)} className="py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                        <button onClick={() => { restoreStudent(restoringStudentId, new Date(restoreDate).toISOString()); setRestoringStudentId(null); setView('main'); setShowArchived(false); }} className="py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Restore</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── Batches ─── */}
          {activeTab === 'batches' && (
            <motion.div key="batches" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-black tracking-tight dark:text-gray-100">Batches</h2>
                </div>
                <button onClick={() => setView('add-batch')} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"><Plus size={18} /></button>
              </div>

              {view === 'add-batch' ? (
                <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView('main')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400"><ArrowLeft size={18} /></button>
                    <h3 className="font-black text-lg dark:text-gray-100">Create Batch</h3>
                  </div>
                  <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    if (isSubmitting) return; setIsSubmitting(true);
                    const fd = new FormData(e.currentTarget);
                    const name = fd.get('name') as string, className = fd.get('className') as string;
                    const monthlyFee = Number(fd.get('monthlyFee')), salaryType = fd.get('salaryType') as SalaryType;
                    const classDays = Array.from(fd.getAll('classDays')) as string[];
                    if (name && className) { addBatch({ name, className, monthlyFee, salaryType, classDays }); setView('main'); }
                    setIsSubmitting(false);
                  }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch Name</label><input name="name" required placeholder="e.g. Morning Batch" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 dark:text-gray-100" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Class</label><select name="className" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-bold outline-none appearance-none dark:text-gray-100">{classesToUse.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Fee</label><input name="monthlyFee" type="number" required placeholder="2000" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-bold outline-none dark:text-gray-100" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label><select name="salaryType" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-bold outline-none appearance-none dark:text-gray-100"><option value="fixed">Fixed</option><option value="free">Free</option><option value="not-sure">Not Sure</option></select></div>
                    </div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Class Days</label>
                      <div className="flex flex-wrap gap-2">{DAYS_OF_WEEK.map(day => (<label key={day} className="cursor-pointer"><input type="checkbox" name="classDays" value={day} className="hidden peer" /><div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold text-xs peer-checked:bg-indigo-600 peer-checked:text-white transition-all">{day}</div></label>))}</div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50">Create Batch</button>
                  </form>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1A1D23] rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <Layers size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 font-medium text-sm">No batches yet. Create one!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map(batch => {
                    const batchStudents = students.filter(s => s.batchId === batch.id);
                    return (
                      <div key={batch.id} className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-black text-base dark:text-gray-100">{batch.name}</h3>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{batch.className} • {batch.classDays.join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">৳{batch.monthlyFee}/mo</span>
                            <button onClick={() => deleteBatch(batch.id)} className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-lg"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {batchStudents.map(s => <span key={s.id} className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400">{s.name}</span>)}
                          <button onClick={() => { setSelectedStudentId(null); setSelectedBatchId(batch.id); setActiveTab('students'); setView('add'); }} className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg"><UserPlus size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Reports ─── */}
          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
              <div className="flex items-center gap-3">
                <BarChart3 size={22} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xl font-black tracking-tight dark:text-gray-100">Financial Report</h2>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Expected', value: `৳${students.reduce((a, s) => a + getStudentFinancials(s).totalExpected, 0).toLocaleString()}`, color: 'text-indigo-600', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { label: 'Collected', value: `৳${students.reduce((a, s) => a + s.payments.reduce((pa, p) => pa + p.amountPaid, 0), 0).toLocaleString()}`, color: 'text-emerald-600', icon: <DollarSign className="w-3.5 h-3.5" /> },
                  { label: 'Dues', value: `৳${students.reduce((a, s) => a + getStudentFinancials(s).dues, 0).toLocaleString()}`, color: 'text-rose-600', icon: <AlertCircle className="w-3.5 h-3.5" /> },
                  { label: 'Advance', value: `৳${students.reduce((a, s) => a + getStudentFinancials(s).advance, 0).toLocaleString()}`, color: 'text-amber-600', icon: <Wallet className="w-3.5 h-3.5" /> }
                ].map((s, i) => (
                  <Card key={i} className="p-3.5 rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{s.label}</p>
                      <div className={cn("p-1 rounded-lg bg-gray-50 dark:bg-gray-800", s.color)}>{s.icon}</div>
                    </div>
                    <p className={cn("text-lg font-black tracking-tight", s.color)}>{s.value}</p>
                  </Card>
                ))}
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="font-black text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2"><History size={13} />Recent Transactions</h3>
                <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden">
                  {recentTransactions.length === 0 ? (
                    <p className="p-8 text-center text-gray-400 text-sm font-medium">No transactions yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                      {recentTransactions.map(tx => (
                        <button key={tx.id} onClick={() => handleOpenTransactionDetail(tx, tx.studentId)}
                          className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><DollarSign size={14} /></div>
                            <div className="min-w-0">
                              <p className="font-black text-sm dark:text-gray-100 truncate">{tx.studentName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{format(parseISO(tx.month), 'MMM yyyy')} • {format(parseISO(tx.date), 'dd/MM/yy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">৳{tx.amountPaid.toLocaleString()}</span>
                            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Student Ledger */}
              <div>
                <h3 className="font-black text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2"><FileText size={13} />Student Ledger</h3>
                <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden">
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
                    {students.map(s => {
                      const fin = getStudentFinancials(s);
                      return (
                        <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setActiveTab('students'); setView('details'); }}
                          className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                          <div className="min-w-0">
                            <p className="font-black text-sm dark:text-gray-100 truncate">{s.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.className}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right"><p className="text-[9px] text-gray-400 font-bold">Paid</p><p className="font-black text-sm text-emerald-600 dark:text-emerald-400">৳{fin.totalPaid.toLocaleString()}</p></div>
                            <div className="text-right"><p className="text-[9px] text-gray-400 font-bold">Due</p><p className="font-black text-sm text-rose-600 dark:text-rose-400">৳{fin.dues.toLocaleString()}</p></div>
                            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Class Distribution */}
              <div>
                <h3 className="font-black text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2"><Layers size={13} />Class Distribution</h3>
                <div className="bg-white dark:bg-[#1A1D23] rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 space-y-3">
                  {Array.from(new Set(students.filter(s => s.status === 'active').map(s => s.className))).map(cls => {
                    const active = students.filter(s => s.status === 'active');
                    const count = active.filter(s => s.className === cls).length;
                    const pct = active.length > 0 ? (count / active.length) * 100 : 0;
                    return (
                      <div key={cls} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black uppercase tracking-wider"><span className="dark:text-gray-100">{cls}</span><span className="text-gray-400">{count}</span></div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Settings ─── */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5 pb-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4 px-1 py-2">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg shadow-indigo-200/50 dark:shadow-none">{userProfile?.name.charAt(0)}</div>
                <div>
                  <h2 className="text-xl font-black tracking-tight dark:text-gray-100">{userProfile?.name}</h2>
                  <p className="text-gray-400 font-medium text-sm">{userProfile?.title}</p>
                </div>
              </div>

              {/* Appearance */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Appearance</p>
                <div className="settings-section">
                  <div className="settings-row">
                    <div className="flex items-center gap-3">
                      {darkMode ? <Moon size={18} className="text-amber-400" /> : <Sun size={18} className="text-amber-500" />}
                      <div><p className="font-bold text-sm dark:text-gray-100">Dark Mode</p><p className="text-[10px] text-gray-400 font-medium">{darkMode ? 'Enabled' : 'Disabled'}</p></div>
                    </div>
                    <button onClick={() => setDarkMode(!darkMode)} className={cn("w-12 h-6 rounded-full transition-all relative shrink-0", darkMode ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700")}>
                      <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow", darkMode ? "left-6" : "left-0.5")} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Notifications</p>
                <div className="settings-section">
                  <div className="settings-row">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-indigo-500" />
                      <div><p className="font-bold text-sm dark:text-gray-100">Payment Reminders</p><p className="text-[10px] text-gray-400 font-medium">{notificationsEnabled ? 'Active' : 'Disabled'}</p></div>
                    </div>
                    <button onClick={async () => {
                      if (!notificationsEnabled) {
                        const g = await requestNotificationPermission();
                        if (g) { setNotificationsEnabled(true); setNotificationPermission(true); localStorage.setItem('tution_notifications_enabled', 'true'); await schedulePaymentReminders(students); }
                      } else { setNotificationsEnabled(false); localStorage.setItem('tution_notifications_enabled', 'false'); }
                    }} className={cn("w-12 h-6 rounded-full transition-all relative shrink-0", notificationsEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700")}>
                      <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow", notificationsEnabled ? "left-6" : "left-0.5")} />
                    </button>
                  </div>
                  <div className="settings-divider" />
                  <button onClick={sendTestNotification} disabled={!notificationsEnabled} className="settings-row w-full disabled:opacity-40">
                    <div className="flex items-center gap-3"><Bell size={18} className="text-gray-400" /><p className="font-bold text-sm dark:text-gray-100">Send Test Notification</p></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Class/Batch Management (collapsible) */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Classes & Batches</p>
                <div className="settings-section">
                  <button onClick={() => setShowBatchManagement(!showBatchManagement)} className="settings-row w-full">
                    <div className="flex items-center gap-3"><Layers size={18} className="text-indigo-500" /><p className="font-bold text-sm dark:text-gray-100">Manage Classes</p></div>
                    {showBatchManagement ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  <AnimatePresence>
                    {showBatchManagement && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="settings-divider" />
                        <div className="p-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {classesToUse.map(cls => (
                              <div key={cls} className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                                <span className="text-xs font-bold dark:text-gray-100">{cls}</span>
                                <button onClick={() => handleSaveClasses(classesToUse.filter(c => c !== cls))} className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const input = (e.currentTarget.elements.namedItem('newClass') as HTMLInputElement); if (input.value.trim()) { handleSaveClasses([...classesToUse, input.value.trim()]); input.value = ''; } }}>
                            <input name="newClass" placeholder="Add class..." className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 dark:text-gray-100" />
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs shrink-0">Add</button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Data */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Data</p>
                <div className="settings-section">
                  <button onClick={handleExportData} className="settings-row w-full">
                    <div className="flex items-center gap-3"><Download size={18} className="text-indigo-500" /><div><p className="font-bold text-sm dark:text-gray-100">Backup Data</p><p className="text-[10px] text-gray-400 font-medium">Download JSON file</p></div></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                  <div className="settings-divider" />
                  <label className="settings-row cursor-pointer">
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                    <div className="flex items-center gap-3"><Upload size={18} className="text-emerald-500" /><div><p className="font-bold text-sm dark:text-gray-100">Restore Data</p><p className="text-[10px] text-gray-400 font-medium">Upload from file</p></div></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </label>
                </div>
              </div>

              {/* About */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">About</p>
                <div className="settings-section">
                  <button onClick={() => setShowAppInfo(true)} className="settings-row w-full">
                    <div className="flex items-center gap-3"><Info size={18} className="text-blue-500" /><div><p className="font-bold text-sm dark:text-gray-100">App Info</p><p className="text-[10px] text-gray-400 font-medium">Version 1.0.0</p></div></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                  <div className="settings-divider" />
                  <button onClick={() => setShowDevInfo(true)} className="settings-row w-full">
                    <div className="flex items-center gap-3"><User size={18} className="text-purple-500" /><div><p className="font-bold text-sm dark:text-gray-100">Developer</p><p className="text-[10px] text-gray-400 font-medium">Joy Krishna Malakar</p></div></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                  <div className="settings-divider" />
                  <button onClick={() => setShowShareModal(true)} className="settings-row w-full">
                    <div className="flex items-center gap-3"><Share2 size={18} className="text-indigo-500" /><p className="font-bold text-sm dark:text-gray-100">Share App</p></div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Danger */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Danger Zone</p>
                <div className="settings-section">
                  <button onClick={() => setShowResetWarning(true)} className="settings-row w-full">
                    <div className="flex items-center gap-3"><Trash2 size={18} className="text-rose-500" /><div><p className="font-bold text-sm text-rose-500">Reset All Data</p><p className="text-[10px] text-gray-400 font-medium">Permanently delete everything</p></div></div>
                    <ChevronRight size={16} className="text-rose-300" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Bottom Nav ─── */}
      <nav className={cn("fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-gray-100/80 md:hidden px-2 pt-2 bottom-nav-safe flex justify-between items-center z-50 dark:bg-[#0F1115]/90 dark:border-gray-800/80 transition-all duration-200", keyboardOpen && "hidden")}>
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
          { id: 'students', icon: <Users size={20} />, label: 'Students' },
          { id: 'add', icon: <Plus size={22} />, label: 'Add', isSpecial: true },
          { id: 'reports', icon: <FileText size={20} />, label: 'Reports' },
          { id: 'settings', icon: <User size={20} />, label: 'Profile' },
        ].map((item) => (
          <button key={item.id} onClick={() => { if (item.id === 'add') { setShowAddMenu(true); } else { setActiveTab(item.id as any); setView('main'); } }}
            className={cn("flex flex-col items-center gap-0.5 px-3 py-1 transition-all rounded-xl",
              item.isSpecial ? "bg-indigo-600 text-white w-12 h-12 rounded-2xl justify-center -mt-6 shadow-xl shadow-indigo-300/50 dark:shadow-none" : (activeTab === item.id && !item.isSpecial ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"))}>
            {item.icon}
            {!item.isSpecial && <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ─── Add Menu Overlay ─── */}
      <AnimatePresence>
        {showAddMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMenu(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
              className="fixed bottom-24 left-4 right-4 bg-white dark:bg-[#1A1D23] rounded-[2rem] p-5 z-[70] shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Quick Add</h3>
                <button onClick={() => setShowAddMenu(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setSelectedStudentId(null); setSelectedBatchId(null); setActiveTab('students'); setView('add'); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2.5 p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 active:scale-95 transition-all">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm"><UserPlus size={22} /></div>
                  <span className="font-black text-[10px] uppercase tracking-widest">New Student</span>
                </button>
                <button onClick={() => { setActiveTab('batches'); setView('add-batch'); setShowAddMenu(false); }}
                  className="flex flex-col items-center gap-2.5 p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm"><Layers size={22} /></div>
                  <span className="font-black text-[10px] uppercase tracking-widest">New Batch</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Transaction Detail Modal ─── */}
      <AnimatePresence>
        {showTransactionDetail && selectedPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransactionDetail(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 z-[110] shadow-2xl border-t sm:border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg dark:text-gray-100">Transaction Details</h3>
                <button onClick={() => setShowTransactionDetail(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Amount', value: `৳${selectedPayment.payment.amountPaid.toLocaleString()}` },
                  { label: 'For Month', value: format(parseISO(selectedPayment.payment.month), 'MMMM yyyy') },
                  { label: 'Date Paid', value: format(parseISO(selectedPayment.payment.date), 'dd MMM yyyy, hh:mm a') },
                  ...(selectedPayment.payment.note ? [{ label: 'Note', value: selectedPayment.payment.note }] : [])
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-xl">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                    <span className="font-bold text-sm dark:text-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleEditPayment} className="py-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Edit3 size={14} />Edit</button>
                <button onClick={() => { setShowTransactionDetail(false); setShowDeletePayment(true); }} className="py-3.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Trash2 size={14} />Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Edit Payment Modal ─── */}
      <AnimatePresence>
        {showEditPayment && selectedPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditPayment(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-6 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg dark:text-gray-100">Edit Transaction</h3>
                <button onClick={() => setShowEditPayment(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3 mb-5">
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (৳)</label><input type="number" value={editPaymentForm.amountPaid} onChange={e => setEditPaymentForm(p => ({ ...p, amountPaid: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3.5 outline-none font-bold dark:text-gray-100" /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Note</label><input value={editPaymentForm.note} onChange={e => setEditPaymentForm(p => ({ ...p, note: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3.5 outline-none font-bold dark:text-gray-100" placeholder="Optional" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowEditPayment(false)} className="py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleSaveEditPayment} className="py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Save</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Delete Payment Confirm ─── */}
      <AnimatePresence>
        {showDeletePayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeletePayment(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-7 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-4 mx-auto"><Trash2 size={26} /></div>
              <h3 className="text-xl font-black mb-2 dark:text-gray-100">Delete Transaction?</h3>
              <p className="text-gray-400 text-sm font-medium mb-6">This will permanently remove ৳{selectedPayment?.payment.amountPaid.toLocaleString()} payment. This cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDeletePayment(false)} className="py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleDeletePaymentConfirm} className="py-3.5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Backup Confirm Modal ─── */}
      <AnimatePresence>
        {showBackupConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBackupConfirm(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-7 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto"><CheckCircle2 size={28} /></div>
              <h3 className="text-xl font-black mb-1 dark:text-gray-100">Backup Saved!</h3>
              <p className="text-gray-400 text-sm font-medium mb-2">Your data has been downloaded.</p>
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 rounded-xl mb-6 break-all">{backupFilename}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleShareBackup} className="py-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Share2 size={14} />Share</button>
                <button onClick={() => setShowBackupConfirm(false)} className="py-3.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Close</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Reset Warning ─── */}
      <AnimatePresence>
        {showResetWarning && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetWarning(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-7 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4"><AlertCircle size={32} /></div>
              <h3 className="text-xl font-black mb-2 dark:text-gray-100">Reset All Data?</h3>
              <p className="text-gray-400 font-medium text-sm mb-7 leading-relaxed">This will permanently delete all students, batches, and payment history. Cannot be undone.</p>
              <div className="space-y-2">
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all">Yes, Reset Everything</button>
                <button onClick={() => setShowResetWarning(false)} className="w-full bg-gray-50 dark:bg-gray-800 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Share Modal ─── */}
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 z-[110] shadow-2xl border-t sm:border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg dark:text-gray-100">Share Tution Pro</h3>
                <button onClick={() => setShowShareModal(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3.5 flex items-center justify-between mb-5">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 truncate">tution.pro.bd</span>
                <button onClick={handleCopyLink} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0", copySuccess ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white")}>
                  {copySuccess ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={22} />, bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { id: 'messenger', label: 'Messenger', icon: <Share2 size={22} />, bg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                  { id: 'other', label: 'More', icon: <Globe size={22} />, bg: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' }
                ].map(item => (
                  <button key={item.id} onClick={() => handleShare(item.id as any)} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl active:scale-95 transition-all", item.bg)}>
                    <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm">{item.icon}</div>
                    <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── App Info Modal ─── */}
      <AnimatePresence>
        {showAppInfo && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAppInfo(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] p-7 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 dark:shadow-none overflow-hidden">
                    <img src="/logo.png" alt="Tution Pro" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as any).style.display='none'; }} />
                    <GraduationCap size={22} />
                  </div>
                  <div><h3 className="text-lg font-black dark:text-gray-100">Tution Pro</h3><p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Version 1.0.0</p></div>
                </div>
                <button onClick={() => setShowAppInfo(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-5">A comprehensive tuition management app for private tutors. Track students, schedules, and payments with ease.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p><p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Stable Release</p></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Platform</p><p className="text-xs font-black dark:text-gray-100">Web / Mobile</p></div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Features</p>
                <div className="space-y-1">{['Student Management', 'Batch Scheduling', 'Payment Tracking', 'Financial Reports', 'Offline Storage', 'Payment Reminders'].map((f, i) => (<p key={i} className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0" />{f}</p>))}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Dev Info Modal ─── */}
      <AnimatePresence>
        {showDevInfo && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDevInfo(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] p-7 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <button onClick={() => setShowDevInfo(false)} className="absolute top-5 right-5 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-xl shadow-purple-200/50 dark:shadow-none">JM</div>
              <h3 className="text-xl font-black mb-0.5 dark:text-gray-100">Joy Krishna Malakar</h3>
              <p className="text-purple-600 dark:text-purple-400 font-black text-[10px] uppercase tracking-widest mb-3">Lead Developer</p>
              <p className="text-gray-400 text-sm font-medium mb-2 leading-relaxed">Currently studying Computer Science & Engineering at Sylhet Polytechnic Institute.</p>
              <div className="flex flex-col gap-2.5 mt-5">
                <a href="mailto:joymkrishna@gmail.com" className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest"><FileText size={16} />Email Me</a>
                <a href="https://joymkrishna.pro.bd" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none"><Globe size={16} />Portfolio</a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
