/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  Calendar, 
  DollarSign, 
  Search, 
  ChevronRight, 
  Phone, 
  MessageCircle, 
  Clock,
  Trash2, 
  CreditCard,
  BarChart3,
  ArrowLeft,
  UserPlus,
  Pencil,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  Wallet,
  LayoutDashboard,
  FileText,
  User,
  Settings,
  Check,
  Layers,
  Download,
  Upload,
  Archive,
  ArchiveRestore,
  UserCheck,
  Copy,
  Share2,
  Info,
  ExternalLink,
  Globe,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { useStorage } from './hooks/useStorage';
import { Student, SalaryType } from './types';
import { DAYS_OF_WEEK, getStudentFinancials } from './lib/financeUtils';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  requestNotificationPermission, 
  schedulePaymentReminders, 
  sendTestNotification,
  checkNotificationPermission 
} from './lib/notifications';

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden dark:bg-[#1A1D23] dark:border-gray-800 transition-colors duration-300", className)} {...props}>
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
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

export default function App() {
  const { 
    students, 
    addStudent, 
    updateStudent, 
    archiveStudent, 
    restoreStudent, 
    deleteStudentPermanently, 
    addPayment, 
    batches,
    addBatch,
    updateBatch,
    deleteBatch,
    isLoaded 
  } = useStorage();
  const [userProfile, setUserProfile] = useState<{ name: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'batches' | 'reports' | 'settings'>('dashboard');
  const [view, setView] = useState<'main' | 'add' | 'edit' | 'details' | 'add-batch'>('main');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [salaryType, setSalaryType] = useState<SalaryType>('fixed');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [restoringStudentId, setRestoringStudentId] = useState<string | null>(null);
  const [restoreDate, setRestoreDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tution_dark_mode');
    return saved === 'true';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('tution_notifications_enabled');
    return saved === 'true';
  });
  const [notificationPermission, setNotificationPermission] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tution_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Check notification permission on mount
  useEffect(() => {
    checkNotificationPermission().then(granted => {
      setNotificationPermission(granted);
    });
  }, []);

  // Schedule notifications when enabled
  useEffect(() => {
    if (notificationsEnabled && notificationPermission && students.length > 0) {
      schedulePaymentReminders(students);
    }
  }, [notificationsEnabled, notificationPermission, students]);

  // Onboarding form state
  const [onboardData, setOnboardData] = useState({ name: '', title: '' });
  const [customClasses, setCustomClasses] = useState<string[]>([]);

  useEffect(() => {
    const savedProfile = localStorage.getItem('tution_user_profile_v4');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    } else {
      setShowOnboarding(true);
    }

    const savedClasses = localStorage.getItem('tution_classes_v4');
    if (savedClasses) {
      setCustomClasses(JSON.parse(savedClasses));
    } else {
      setCustomClasses([
        'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
        'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
        'HSC 1st Year', 'HSC 2nd Year', 'Degree', 'Honours', 'Masters', 'Other'
      ]);
    }
  }, []);

  const classesToUse = customClasses.length > 0 ? customClasses : [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
    'HSC 1st Year', 'HSC 2nd Year', 'Degree', 'Honours', 'Masters', 'Other'
  ];

  const handleSaveClasses = (newClasses: string[]) => {
    setCustomClasses(newClasses);
    localStorage.setItem('tution_classes_v4', JSON.stringify(newClasses));
  };

  const handleSaveProfile = (data: { name: string; title: string }) => {
    setUserProfile(data);
    localStorage.setItem('tution_user_profile_v4', JSON.stringify(data));
    setShowOnboarding(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://tutiontracker.vercel.app');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = (platform: 'whatsapp' | 'messenger' | 'other') => {
    const url = 'https://tutiontracker.vercel.app';
    const text = 'Check out TuitionTracker - The ultimate app for private tutors!';
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else if (platform === 'messenger') {
      // Messenger sharing - copy link instead as FB App ID required
      handleCopyLink();
    } else {
      if (navigator.share) {
        navigator.share({
          title: 'TuitionTracker',
          text: text,
          url: url,
        });
      }
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Pre-fill salary type when editing or adding from batch
  useEffect(() => {
    if (view === 'edit' && selectedStudent) {
      setSalaryType(selectedStudent.salaryType);
    } else if (view === 'add') {
      if (selectedBatchId) {
        const batch = batches.find(b => b.id === selectedBatchId);
        if (batch) {
          setSalaryType(batch.salaryType);
        } else {
          setSalaryType('fixed');
        }
      } else {
        setSalaryType('fixed');
      }
    }
  }, [view, selectedStudent, selectedBatchId, batches]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showArchived ? s.status === 'inactive' : s.status === 'active';
    return matchesSearch && matchesStatus;
  });

  if (!isLoaded) return <div className="flex items-center justify-center h-screen font-sans">Loading...</div>;

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F1115] flex items-center justify-center p-6 font-sans transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-[#1A1D23] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl shadow-indigo-100 dark:shadow-none border border-transparent dark:border-gray-800"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-white mb-6 sm:mb-8 shadow-xl shadow-indigo-200 dark:shadow-none">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 dark:text-gray-100">Welcome!</h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium mb-8 sm:mb-10 text-sm sm:text-base">Let's set up your tuition profile to get started.</p>
          
          <form className="space-y-4 sm:space-y-6" onSubmit={(e) => {
            e.preventDefault();
            if (onboardData.name && onboardData.title) {
              handleSaveProfile(onboardData);
            }
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
              <input 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 sm:p-5 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 text-sm sm:text-base dark:text-gray-100" 
                placeholder="e.g. Tanvir Ahmed"
                value={onboardData.name}
                onChange={(e) => setOnboardData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest ml-1">Professional Title</label>
              <input 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 sm:p-5 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 text-sm sm:text-base dark:text-gray-100" 
                placeholder="e.g. Mathematics Tutor"
                value={onboardData.title}
                onChange={(e) => setOnboardData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black text-lg sm:text-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] mt-2 sm:mt-4">
              Get Started
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const handleExportData = () => {
    const data = {
      students,
      batches,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tuition_tracker_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-32 dark:bg-[#0F1115] dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-3xl border-b border-gray-100/50 sticky top-0 z-40 dark:bg-[#0F1115]/80 dark:border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => {
            setActiveTab('dashboard');
            setView('main');
          }}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-base sm:text-xl tracking-tighter text-gray-900 leading-none truncate dark:text-white">
                Tuition<span className="text-indigo-600">Tracker</span>
              </h1>
              <p className="text-[8px] sm:text-[10px] font-black text-gray-700 uppercase tracking-widest mt-0.5 sm:mt-1 truncate dark:text-gray-400">
                Hello, {userProfile?.name.split(' ')[0] || 'Tutor'}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 mr-6">
            {[
              { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={18} /> },
              { id: 'students', label: 'Students', icon: <Users size={18} /> },
              { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
              { id: 'settings', label: 'Profile', icon: <User size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setView('main');
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  activeTab === tab.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-2.5 rounded-2xl transition-all",
                darkMode ? "text-amber-400 bg-amber-400/10" : "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
              )}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 mb-24 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && view === 'main' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Dashboard Top Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {[
                  { 
                    label: 'Monthly Target', 
                    value: `৳${students.filter(s => s.status === 'active' && s.salaryType === 'fixed').reduce((acc, s) => acc + s.monthlyFee, 0).toLocaleString()}`, 
                    color: 'text-white', 
                    bg: 'bg-indigo-600', 
                    icon: <TrendingUp className="w-4 h-4 sm:w-5 h-5" />,
                    sub: 'Target for ' + format(new Date(), 'MMM')
                  },
                  { 
                    label: 'Collected (Month)', 
                    value: `৳${students.reduce((acc, s) => acc + s.payments.filter(p => {
                      const pDate = parseISO(p.date);
                      return pDate.getMonth() === new Date().getMonth() && pDate.getFullYear() === new Date().getFullYear();
                    }).reduce((pAcc, p) => pAcc + p.amountPaid, 0), 0).toLocaleString()}`, 
                    color: 'text-emerald-600', 
                    bg: 'bg-white', 
                    icon: <DollarSign className="w-4 h-4 sm:w-5 h-5" />,
                    sub: 'Received this month'
                  },
                  { 
                    label: 'Total Dues', 
                    value: `৳${students.filter(s => s.status === 'active').reduce((acc, s) => acc + getStudentFinancials(s).dues, 0).toLocaleString()}`, 
                    color: 'text-rose-600', 
                    bg: 'bg-white', 
                    icon: <AlertCircle className="w-4 h-4 sm:w-5 h-5" />,
                    sub: 'Pending from all'
                  },
                  { 
                    label: 'New Students', 
                    value: students.filter(s => {
                      const jDate = parseISO(s.joinDate);
                      return jDate.getMonth() === new Date().getMonth() && jDate.getFullYear() === new Date().getFullYear();
                    }).length, 
                    color: 'text-indigo-600', 
                    bg: 'bg-white', 
                    icon: <UserPlus className="w-4 h-4 sm:w-5 h-5" />,
                    sub: 'Joined this month'
                  }
                ].map((stat, i) => (
                  <Card key={i} className={cn(
                    "p-4 sm:p-6 border-none shadow-sm hover:shadow-md transition-all rounded-[1.5rem] sm:rounded-[2rem] flex flex-col justify-between min-h-[110px] sm:min-h-[140px]", 
                    stat.bg === 'bg-white' ? "bg-white dark:bg-[#1A1D23] dark:border dark:border-gray-800" : stat.bg
                  )}>
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <div className={cn(
                        "p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl",
                        stat.bg === 'bg-indigo-600' ? "bg-white/10 text-white" : "bg-gray-50 dark:bg-gray-800 " + stat.color
                      )}>
                        {stat.icon}
                      </div>
                      <p className={cn(
                        "text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
                        stat.bg === 'bg-indigo-600' ? "text-indigo-100" : "text-gray-700 dark:text-gray-400"
                      )}>{stat.label}</p>
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-lg sm:text-2xl font-black tracking-tighter mb-0.5 sm:mb-1", 
                        stat.bg === 'bg-indigo-600' ? "text-white" : (darkMode ? "text-gray-100" : stat.color)
                      )}>{stat.value}</h3>
                      <p className={cn(
                        "text-[8px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60",
                        stat.bg === 'bg-indigo-600' ? "text-indigo-100" : "text-gray-600 dark:text-gray-400"
                      )}>{stat.sub}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => {
                    setSelectedStudentId(null);
                    setSelectedBatchId(null);
                    setActiveTab('students');
                    setView('add');
                  }}
                  className="group bg-white dark:bg-[#1A1D23] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left border border-gray-100 dark:border-gray-800"
                >
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <div>
                    <p className="font-black text-sm tracking-tight dark:text-gray-100">Add New Student</p>
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest">Register a learner</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveTab('batches');
                    setView('main');
                  }}
                  className="group bg-white dark:bg-[#1A1D23] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left border border-gray-100 dark:border-gray-800"
                >
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <div>
                    <p className="font-black text-sm tracking-tight dark:text-gray-100">Manage Batches</p>
                    <p className="text-[10px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest">Organize groups</p>
                  </div>
                </button>
              </div>

              {/* Recent Students Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-black text-xl tracking-tight flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" />
                    Recent Students
                  </h2>
                  <button 
                    onClick={() => setActiveTab('students')}
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                    title="View All Students"
                  >
                    <Users size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.filter(s => s.status === 'active').slice(0, 4).map(student => {
                    const financials = getStudentFinancials(student);
                    return (
                      <Card key={student.id} className="hover:ring-4 hover:ring-indigo-500/5 transition-all cursor-pointer group border-none shadow-sm rounded-[1.5rem]">
                        <div 
                          className="p-4 flex items-center justify-between"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveTab('students');
                            setView('details');
                          }}
                        >
                          <div className="flex flex-col min-w-0">
                            <h3 className="font-black text-base dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight truncate">{student.name}</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5 uppercase tracking-wider truncate">{student.className}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            {student.salaryType === 'fixed' ? (
                              financials.dues > 0 ? (
                                <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                  Due ৳{financials.dues.toLocaleString()}
                                </div>
                              ) : (
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                  Paid
                                </div>
                              )
                            ) : (
                              <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                Per Class
                              </div>
                            )}
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && view === 'main' && (
            <motion.div 
              key="students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Search & Filter */}
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search students or classes..."
                  className="w-full bg-white dark:bg-[#1A1D23] border border-gray-100 dark:border-gray-800 rounded-[1.5rem] py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm text-base font-medium placeholder:text-gray-400 dark:text-gray-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Student List */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                      <h2 className="font-black text-base sm:text-lg tracking-tight truncate flex items-center gap-2">
                        {showArchived ? <Archive size={18} className="text-indigo-600" /> : <Users size={18} className="text-indigo-600" />}
                        {showArchived ? 'Archived' : 'Directory'}
                      </h2>
                      <button 
                        onClick={() => setShowArchived(!showArchived)}
                        title={showArchived ? 'Show Active' : 'Show Archived'}
                        className={cn(
                          "p-1.5 rounded-lg transition-all shrink-0",
                          showArchived ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                      >
                        {showArchived ? <UserCheck size={14} /> : <Archive size={14} />}
                      </button>
                      <button 
                        onClick={() => {
                          setActiveTab('batches');
                          setView('main');
                        }}
                        title="Manage Batches"
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shrink-0"
                      >
                        <Layers size={14} />
                      </button>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
                      <Users size={12} />
                      {filteredStudents.length}
                    </span>
                  </div>
                
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#1A1D23] rounded-[1.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                      <Users size={32} />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">No students found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStudents.map(student => {
                      const financials = getStudentFinancials(student);
                      return (
                        <Card key={student.id} className="hover:ring-4 hover:ring-indigo-500/5 transition-all cursor-pointer group border-none shadow-sm rounded-[1.25rem] sm:rounded-[1.5rem]">
                          <div 
                            className="p-3 sm:p-4 flex items-center justify-between"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setView('details');
                            }}
                          >
                            <div className="flex flex-col min-w-0">
                              <h3 className="font-black text-base sm:text-lg group-hover:text-indigo-600 transition-colors leading-tight truncate dark:text-white">{student.name}</h3>
                              <p className="text-[9px] sm:text-[10px] text-gray-700 font-bold mt-0.5 uppercase tracking-wider truncate dark:text-gray-400">{student.className} • {student.classDays.join(', ')}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              {student.salaryType === 'fixed' ? (
                                financials.dues > 0 ? (
                                  <div className="bg-rose-50 text-rose-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:bg-rose-500/10 dark:text-rose-400">
                                    Due ৳{financials.dues.toLocaleString()}
                                  </div>
                                ) : financials.advance > 0 ? (
                                  <div className="bg-amber-50 text-amber-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:bg-amber-500/10 dark:text-amber-400">
                                    Adv ৳{financials.advance.toLocaleString()}
                                  </div>
                                ) : financials.totalPaid > 0 ? (
                                  <div className="bg-emerald-50 text-emerald-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:bg-emerald-500/10 dark:text-emerald-400">
                                    Paid
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 text-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:bg-gray-800 dark:text-gray-400">
                                    No Dues
                                  </div>
                                )
                              ) : (
                                <div className="bg-gray-50 text-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:bg-gray-800 dark:text-gray-400">
                                  {student.salaryType === 'free' ? 'Free' : 'Not Fixed'}
                                </div>
                              )}
                              <ChevronRight size={16} className="text-gray-600 group-hover:text-indigo-600 transition-colors dark:text-gray-500" />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {(view === 'add' || view === 'edit') && (
            <motion.div 
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <button onClick={() => {
                setView(view === 'edit' ? 'details' : 'main');
                setSelectedBatchId(null);
              }} className="flex items-center gap-2 text-gray-700 mb-8 hover:text-gray-900 transition-colors font-bold text-sm uppercase tracking-widest">
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <Card className="p-5 sm:p-10 border-none shadow-xl rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-8 sm:mb-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                    {view === 'add' ? <UserPlus size={20} /> : <Users size={20} />}
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{view === 'add' ? 'New Student' : 'Edit Student'}</h2>
                    <p className="text-gray-700 font-medium text-xs sm:text-sm">
                      {view === 'add' ? 'Fill in the details to register a new student.' : `Updating information for ${selectedStudent?.name}`}
                    </p>
                  </div>
                </div>

                <form className="space-y-8" onSubmit={(e) => {
                  e.preventDefault();
                  if (isSubmitting) return;
                  setIsSubmitting(true);

                  const formData = new FormData(e.currentTarget);
                  const days = DAYS_OF_WEEK.filter(day => formData.get(`day-${day}`));
                  
                  const selectedBatch = batches.find(b => b.id === (formData.get('batchId') as string));
                  
                  const studentData = {
                    name: formData.get('name') as string,
                    className: formData.get('className') as string,
                    joinDate: formData.get('joinDate') as string,
                    phone: formData.get('phone') as string,
                    whatsapp: formData.get('whatsapp') as string,
                    classDays: days,
                    salaryType: formData.get('salaryType') as SalaryType,
                    monthlyFee: Number(formData.get('monthlyFee') || 0),
                    additionalInfo: formData.get('additionalInfo') as string,
                    batchId: formData.get('batchId') as string || undefined,
                  };

                  if (view === 'add') {
                    addStudent(studentData);
                    setView('main');
                    setActiveTab('students');
                    setSelectedBatchId(null);
                    setSelectedStudentId(null);
                  } else if (view === 'edit' && selectedStudentId) {
                    updateStudent(selectedStudentId, studentData);
                    setView('details');
                  }
                  setIsSubmitting(false);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Full Name</label>
                      <input name="name" required defaultValue={selectedStudent?.name} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600" placeholder="e.g. Rahim Ahmed" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Assign to Batch (Optional)</label>
                      <select 
                        name="batchId" 
                        defaultValue={selectedBatchId || selectedStudent?.batchId || ""} 
                        onChange={(e) => {
                          const batchId = e.target.value;
                          const batch = batches.find(b => b.id === batchId);
                          if (batch && view === 'add') {
                            const form = e.currentTarget.form;
                            if (form) {
                              const classNameSelect = form.elements.namedItem('className') as HTMLSelectElement;
                              const feeInput = form.elements.namedItem('monthlyFee') as HTMLInputElement;
                              
                              if (classNameSelect) classNameSelect.value = batch.className;
                              if (feeInput) feeInput.value = batch.monthlyFee.toString();
                              
                              setSalaryType(batch.salaryType);
                              
                              DAYS_OF_WEEK.forEach(day => {
                                const checkbox = form.elements.namedItem(`day-${day}`) as HTMLInputElement;
                                if (checkbox) checkbox.checked = batch.classDays.includes(day);
                              });
                            }
                          }
                        }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold appearance-none dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">No Batch (Individual)</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.className})</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Class / Subject</label>
                      <select 
                        name="className" 
                        required 
                        defaultValue={
                          (view === 'add' && selectedBatchId ? batches.find(b => b.id === selectedBatchId)?.className : selectedStudent?.className) || ""
                        } 
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold appearance-none dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">Select Class</option>
                        {classesToUse.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Join Date</label>
                      <input name="joinDate" type="date" required defaultValue={selectedStudent?.joinDate || new Date().toISOString().split('T')[0]} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold dark:bg-gray-800 dark:text-gray-100" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Salary Type</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'fixed', label: 'Fixed' },
                          { id: 'free', label: 'Free' },
                          { id: 'not-sure', label: 'Not Fixed' }
                        ].map(type => (
                          <label key={type.id} className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-2xl cursor-pointer transition-all border-2",
                            salaryType === type.id 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-indigo-400" 
                              : "bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                          )}>
                            <input 
                              type="radio" 
                              name="salaryType" 
                              value={type.id} 
                              checked={salaryType === type.id} 
                              onChange={() => setSalaryType(type.id as SalaryType)}
                              className="hidden" 
                            />
                            <span className="text-xs font-black uppercase tracking-tighter">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {salaryType === 'fixed' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Monthly Fee (৳)</label>
                        <input 
                          name="monthlyFee" 
                          type="number" 
                          required 
                          defaultValue={
                            (view === 'add' && selectedBatchId ? batches.find(b => b.id === selectedBatchId)?.monthlyFee : selectedStudent?.monthlyFee) || ""
                          } 
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600" 
                          placeholder="0" 
                        />
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">Phone Number</label>
                      <input name="phone" defaultValue={selectedStudent?.phone} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600" placeholder="017XXXXXXXX" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 dark:text-gray-400">WhatsApp Number</label>
                      <input name="whatsapp" defaultValue={selectedStudent?.whatsapp} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600" placeholder="880171XXXXXXX (country code)" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 dark:text-gray-400">Additional Notes (Optional)</label>
                    <textarea name="additionalInfo" defaultValue={selectedStudent?.additionalInfo} rows={3} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold placeholder:text-gray-400 resize-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600" placeholder="কোনো বিশেষ তথ্য, বিষয়, বা টীকা..." />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 dark:text-gray-400">Class Schedule</label>
                    <div className="flex flex-wrap gap-3">
                      {DAYS_OF_WEEK.map(day => {
                        const isSelectedByBatch = view === 'add' && selectedBatchId && batches.find(b => b.id === selectedBatchId)?.classDays.includes(day);
                        const isSelectedByStudent = selectedStudent?.classDays.includes(day);
                        
                        return (
                          <label key={day} className="group relative flex items-center justify-center w-12 h-12 rounded-2xl cursor-pointer transition-all overflow-hidden">
                            <input 
                              type="checkbox" 
                              name={`day-${day}`} 
                              defaultChecked={isSelectedByBatch || isSelectedByStudent} 
                              className="peer hidden" 
                            />
                            <div className="absolute inset-0 bg-gray-50 border-2 border-transparent peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all dark:bg-gray-800" />
                            <span className="relative text-xs font-black peer-checked:text-white transition-colors dark:text-gray-400">{day.charAt(0)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : (view === 'add' ? 'Register Student' : 'Save Changes')}
                  </button>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'details' && selectedStudent && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => {
                  setActiveTab('dashboard');
                  setView('main');
                }} className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-bold text-sm uppercase tracking-widest">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <div className="flex items-center gap-2">
                  {selectedStudent.status === 'inactive' ? (
                    <button 
                      onClick={() => {
                        setRestoringStudentId(selectedStudent.id);
                        setRestoreDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                      title="Restore Student"
                      className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                    >
                      <ArchiveRestore size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => setView('edit')}
                      className="text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 p-3 rounded-2xl transition-all"
                      title="Edit Student"
                    >
                      <Pencil size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-3 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {showDeleteModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-transparent dark:border-gray-800"
                    >
                      <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-center mb-2 dark:text-gray-100">Stop Teaching?</h3>
                      <p className="text-gray-400 dark:text-gray-500 text-center mb-8 font-medium">This student will be moved to the archive. Their payment history and logs will be preserved.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setShowDeleteModal(false)}
                          className="py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            archiveStudent(selectedStudent.id);
                            setShowDeleteModal(false);
                            setView('main');
                          }}
                          className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
                        >
                          Archive
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {restoringStudentId && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-transparent dark:border-gray-800"
                    >
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                        <UserPlus size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-center mb-2 dark:text-gray-100">Restore Student?</h3>
                      <p className="text-gray-400 dark:text-gray-500 text-center mb-8 font-medium">Pick a new join date for this student to restart their billing cycle.</p>
                      
                      <div className="space-y-2 mb-8">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Join Date</label>
                        <input 
                          type="date" 
                          value={restoreDate}
                          onChange={(e) => setRestoreDate(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/10 outline-none font-bold dark:text-gray-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setRestoringStudentId(null)}
                          className="py-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            if (restoringStudentId) {
                              restoreStudent(restoringStudentId, new Date(restoreDate).toISOString());
                              setRestoringStudentId(null);
                              setView('main');
                              setShowArchived(false);
                            }
                          }}
                          className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                        >
                          Confirm
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="p-6 sm:p-8 border-none shadow-sm rounded-[2.5rem] text-center">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl shadow-indigo-200 mb-6">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 truncate px-2 dark:text-gray-100">{selectedStudent.name}</h2>
                    <div className="flex flex-col items-center gap-2 mb-6">
                      <p className="text-indigo-600 font-black text-xs sm:text-sm uppercase tracking-widest">{selectedStudent.className}</p>
                      {selectedStudent.status === 'inactive' && (
                        <Badge variant="danger">Inactive / Archived</Badge>
                      )}
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
                      <div className="flex justify-center gap-4">
                        {selectedStudent.phone && (
                          <a href={`tel:${selectedStudent.phone}`} className="flex-1 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 shadow-sm shadow-indigo-100 dark:shadow-none font-black text-xs uppercase tracking-widest">
                            <Phone size={18} />
                            <span>Call</span>
                          </a>
                        )}
                        {selectedStudent.whatsapp && (
                          <a href={`https://wa.me/${selectedStudent.whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 shadow-sm shadow-emerald-100 dark:shadow-none font-black text-xs uppercase tracking-widest">
                            <MessageCircle size={18} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'Joined', value: format(parseISO(selectedStudent.joinDate), 'dd/MM/yyyy'), icon: <Calendar size={14} /> },
                          { label: 'Fee', value: selectedStudent.salaryType === 'fixed' ? `৳${selectedStudent.monthlyFee}` : selectedStudent.salaryType === 'not-sure' ? 'Not Fixed' : 'Free', icon: <DollarSign size={14} /> },
                          { label: 'Schedule', value: selectedStudent.classDays.join(', '), icon: <Clock size={14} /> }
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <span className="text-indigo-600 dark:text-indigo-400">{item.icon}</span>
                              <span className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-[0.15em]">{item.label}</span>
                            </div>
                            <span className="font-black text-sm text-gray-900 dark:text-gray-100">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Financial Section */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const financials = getStudentFinancials(selectedStudent);
                      return (
                        <>
                          <Card className="p-3 sm:p-6 border-none shadow-sm bg-indigo-600 text-white rounded-2xl sm:rounded-3xl">
                            <p className="text-[8px] sm:text-[10px] opacity-60 font-black uppercase tracking-widest mb-1">Total Paid</p>
                            <p className="text-lg sm:text-3xl font-black tracking-tight truncate">৳{financials.totalPaid.toLocaleString()}</p>
                          </Card>
                          <Card className={cn("p-3 sm:p-4 border-none shadow-sm rounded-xl sm:rounded-2xl", financials.dues > 0 ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" : "bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                            <p className="text-[8px] opacity-60 font-black uppercase tracking-widest mb-1">Dues</p>
                            <p className="text-base sm:text-2xl font-black tracking-tight truncate">৳{financials.dues.toLocaleString()}</p>
                          </Card>
                          <Card className={cn("p-3 sm:p-4 border-none shadow-sm rounded-xl sm:rounded-2xl", financials.advance > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                            <p className="text-[8px] opacity-60 font-black uppercase tracking-widest mb-1">Advance</p>
                            <p className="text-base sm:text-2xl font-black tracking-tight truncate">৳{financials.advance.toLocaleString()}</p>
                          </Card>
                        </>
                      );
                    })()}
                  </div>

                  {/* Payment Action */}
                  <Card className="p-6 border-none shadow-sm rounded-[1.5rem] dark:bg-gray-900 dark:border dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <CreditCard size={18} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight dark:text-gray-100">Record Payment</h3>
                    </div>
                    
                    <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      addPayment(
                        selectedStudent.id, 
                        Number(formData.get('amount')), 
                        formData.get('month') as string,
                        formData.get('note') as string
                      );
                      e.currentTarget.reset();
                    }}>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Amount (৳)</label>
                        <input name="amount" type="number" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold dark:text-gray-100" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Billing Month</label>
                        <select name="month" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold appearance-none dark:text-gray-100">
                          {getStudentFinancials(selectedStudent).billingMonths.map((date, i) => (
                            <option key={i} value={date.toISOString()}>
                              {format(date, 'MMMM yyyy')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Note</label>
                        <input name="note" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold dark:text-gray-100" placeholder="Optional" />
                      </div>
                      <div className="sm:col-span-2">
                        <button type="submit" className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2">
                          <Check size={20} />
                          Confirm Payment
                        </button>
                      </div>
                    </form>
                  </Card>

                  {/* Payment History */}
                  <Card className="border-none shadow-sm rounded-[1.5rem] overflow-hidden dark:bg-gray-900 dark:border dark:border-gray-800">
                    <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/30">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-black tracking-tight text-sm dark:text-gray-100">Transaction History</h3>
                      </div>
                      <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{selectedStudent.payments.length} Records</span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[350px] overflow-y-auto no-scrollbar">
                      {selectedStudent.payments.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 dark:text-gray-500 font-medium italic text-sm">No transactions yet.</div>
                      ) : (
                        [...selectedStudent.payments].reverse().map(payment => (
                          <div key={payment.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                                <DollarSign size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base sm:text-lg font-black tracking-tight leading-none mb-1 truncate dark:text-gray-100">৳{payment.amountPaid}</p>
                                <p className="text-[8px] sm:text-[9px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest truncate">
                                  {format(parseISO(payment.month), 'MMM yyyy')} • {format(parseISO(payment.date), 'PP')}
                                </p>
                              </div>
                            </div>
                            {payment.note && (
                              <span className="hidden sm:inline-block text-[8px] sm:text-[9px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg uppercase tracking-widest truncate max-w-[100px]">
                                {payment.note}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'batches' && (
            <motion.div 
              key="batches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Layers size={22} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-[20px] sm:text-[23px] leading-[21px] font-black tracking-tight dark:text-gray-100">Batches</h2>
                </div>
                <button 
                  onClick={() => setView('add-batch')}
                  title="Create New Batch"
                  className="p-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  <Plus size={18} />
                </button>
              </div>

              {view === 'add-batch' ? (
                <Card className="p-6 sm:p-8 border-none shadow-xl rounded-[2.5rem] dark:bg-gray-900 dark:border dark:border-gray-800">
                  <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setView('main')} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                      <ArrowLeft size={20} />
                    </button>
                    <h3 className="text-xl font-black tracking-tight dark:text-gray-100">Create New Batch</h3>
                  </div>
                  <form className="space-y-6" onSubmit={(e) => {
                    e.preventDefault();
                    if (isSubmitting) return;
                    setIsSubmitting(true);

                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const className = formData.get('className') as string;
                    const monthlyFee = Number(formData.get('monthlyFee'));
                    const salaryType = formData.get('salaryType') as SalaryType;
                    const classDays = Array.from(formData.getAll('classDays')) as string[];

                    if (name && className) {
                      addBatch({ name, className, monthlyFee, salaryType, classDays });
                      setView('main');
                    }
                    setIsSubmitting(false);
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Batch Name</label>
                        <input name="name" required placeholder="e.g. Morning Batch" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Class/Subject</label>
                        <select name="className" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none dark:text-gray-100">
                          {classesToUse.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Monthly Fee (৳)</label>
                        <input name="monthlyFee" type="number" required placeholder="e.g. 2000" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Salary Type</label>
                        <select name="salaryType" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none dark:text-gray-100">
                          <option value="fixed">Fixed Monthly</option>
                          <option value="free">Free/Scholarship</option>
                          <option value="not-sure">Not Sure Yet</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Class Days</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <label key={day} className="cursor-pointer">
                            <input type="checkbox" name="classDays" value={day} className="hidden peer" />
                            <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 font-bold text-xs peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 peer-checked:text-white transition-all">
                              {day}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Batch'}
                    </button>
                  </form>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {batches.length === 0 ? (
                    <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-100 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-800/30 rounded-[2.5rem]">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-400 mb-4 shadow-sm dark:bg-gray-700 dark:text-gray-500">
                        <Layers size={32} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-700 dark:text-gray-300">No Batches Yet</h3>
                      <p className="text-gray-700 text-sm font-bold mt-2 dark:text-gray-400">Create a batch to group your students together.</p>
                    </Card>
                  ) : (
                    batches.map(batch => {
                      const batchStudents = students.filter(s => s.batchId === batch.id);
                      return (
                        <Card key={batch.id} className="p-6 sm:p-8 border-none shadow-sm hover:shadow-md transition-all rounded-[2.5rem] group dark:bg-gray-900 dark:border dark:border-gray-800">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-xl font-black tracking-tight group-hover:text-indigo-600 transition-colors dark:group-hover:text-indigo-400 dark:text-gray-100">{batch.name}</h3>
                              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mt-1 dark:text-gray-400">{batch.className} • {batch.classDays.join(', ')}</p>
                            </div>
                            <button 
                              onClick={() => deleteBatch(batch.id)}
                              className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                              <span>Students ({batchStudents.length})</span>
                              <span className="dark:text-gray-300">৳{batch.monthlyFee}/mo</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {batchStudents.map(s => (
                                <div key={s.id} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                  {s.name}
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  setSelectedStudentId(null);
                                  setSelectedBatchId(batch.id);
                                  setActiveTab('students');
                                  setView('add');
                                }}
                                title="Add Student to Batch"
                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                              >
                                <UserPlus size={14} />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-bold text-[10px] sm:text-sm uppercase tracking-widest shrink-0 dark:text-gray-400 dark:hover:text-gray-200">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <div className="flex items-center gap-3">
                  <BarChart3 size={24} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-[20px] sm:text-[23px] leading-[21px] font-black tracking-tight text-right sm:text-left truncate max-w-[150px] sm:max-w-none dark:text-gray-100">Financial Report</h2>
                </div>
              </div>

              <div className="space-y-8">
                {/* 4 Stats Cards at the top */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {[
                    { label: 'Lifetime Expected', value: `৳${students.reduce((acc, s) => acc + getStudentFinancials(s).totalExpected, 0).toLocaleString()}`, color: 'text-indigo-600', icon: <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> },
                    { label: 'Total Collected', value: `৳${students.reduce((acc, s) => acc + s.payments.reduce((pAcc, p) => pAcc + p.amountPaid, 0), 0).toLocaleString()}`, color: 'text-emerald-600', icon: <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> },
                    { label: 'Current Dues', value: `৳${students.reduce((acc, s) => acc + getStudentFinancials(s).dues, 0).toLocaleString()}`, color: 'text-rose-600', icon: <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> },
                    { label: 'Total Advance', value: `৳${students.reduce((acc, s) => acc + getStudentFinancials(s).advance, 0).toLocaleString()}`, color: 'text-amber-600', icon: <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> }
                  ].map((stat, i) => (
                    <Card key={i} className="p-2.5 sm:p-4 border-none shadow-sm hover:shadow-md transition-all rounded-[1.25rem] sm:rounded-[1.5rem] flex flex-col justify-between min-h-[80px] sm:min-h-[90px]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[8px] sm:text-[9px] text-gray-700 font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] dark:text-gray-400">{stat.label}</p>
                        <div className={cn("p-1 sm:p-1.5 rounded-lg", stat.color.replace('text-', 'bg-').replace('-600', '-50') + " " + stat.color + " dark:bg-gray-800")}>
                          {stat.icon}
                        </div>
                      </div>
                      <p className={cn("text-base sm:text-xl font-black tracking-tighter truncate", stat.color)}>{stat.value}</p>
                    </Card>
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden max-w-full border border-gray-100 dark:border-gray-800">
                  <div className="p-5 sm:p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-black tracking-tight text-base sm:text-lg dark:text-gray-100">Student Ledger</h3>
                  </div>
                  {/* Mobile: card list */}
                  <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800">
                    {students.map(s => {
                      const fin = getStudentFinancials(s);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
                          onClick={() => { setSelectedStudentId(s.id); setActiveTab('students'); setView('details'); }}
                        >
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate dark:text-gray-100">{s.name}</p>
                            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest dark:text-gray-400">{s.className}</p>
                          </div>
                          <div className="flex gap-3 shrink-0 ml-2">
                            <div className="text-right">
                              <p className="text-[9px] text-gray-600 font-bold uppercase flex items-center justify-end gap-1 dark:text-gray-500">
                                <Check size={8} />
                                Paid
                              </p>
                              <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">৳{fin.totalPaid.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-gray-600 font-bold uppercase flex items-center justify-end gap-1 dark:text-gray-500">
                                <AlertCircle size={8} />
                                Dues
                              </p>
                              <p className="font-black text-sm text-rose-600 dark:text-rose-400">৳{fin.dues.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block overflow-x-auto w-full no-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] text-gray-700 uppercase font-black tracking-[0.2em] border-b border-gray-50 dark:border-gray-800 dark:text-gray-400">
                          <th className="px-6 py-4 flex items-center gap-2">
                            <User size={12} />
                            Student
                          </th>
                          <th className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Check size={12} />
                              Paid
                            </div>
                          </th>
                          <th className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <AlertCircle size={12} />
                              Dues
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {students.map(s => {
                          const fin = getStudentFinancials(s);
                          return (
                            <tr
                              key={s.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                              onClick={() => { setSelectedStudentId(s.id); setActiveTab('students'); setView('details'); }}
                            >
                              <td className="px-6 py-4">
                                <p className="font-black text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors dark:text-gray-100">{s.name}</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest dark:text-gray-400">{s.className}</p>
                              </td>
                              <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap text-right">৳{fin.totalPaid.toLocaleString()}</td>
                              <td className="px-6 py-4 font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap text-right">৳{fin.dues.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <Card className="p-8 border-none shadow-sm rounded-[2.5rem] dark:bg-gray-900 dark:border dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-8">
                      <Layers size={14} className="text-gray-400 dark:text-gray-500" />
                      <h3 className="font-black text-[10px] text-gray-500 uppercase tracking-[0.2em] dark:text-gray-400">Batch Distribution (Active)</h3>
                    </div>
                    <div className="space-y-6">
                      {Array.from(new Set(students.filter(s => s.status === 'active').map(s => s.className))).map(className => {
                        const activeStudents = students.filter(s => s.status === 'active');
                        const count = activeStudents.filter(s => s.className === className).length;
                        const percentage = activeStudents.length > 0 ? (count / activeStudents.length) * 100 : 0;
                        return (
                          <div key={className} className="space-y-2">
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                              <span className="text-gray-900 dark:text-gray-100">{className}</span>
                              <span className="text-gray-500 dark:text-gray-400">{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-bold text-sm uppercase tracking-widest">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl sm:text-3xl font-black tracking-tight dark:text-gray-100">Profile Settings</h2>
                </div>
              </div>

                  <Card className="p-6 sm:p-10 border-none shadow-sm rounded-[2.5rem] bg-white dark:bg-gray-900 dark:border dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-10 text-center sm:text-left">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600 dark:bg-indigo-500 rounded-[2rem] flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-xl shadow-indigo-100 dark:shadow-none shrink-0">
                        {userProfile?.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight dark:text-gray-100">{userProfile?.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">{userProfile?.title}</p>
                      </div>
                    </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 ml-1">
                    <Layers size={14} className="text-gray-400 dark:text-gray-500" />
                    <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Batch Management</h3>
                  </div>
                  <Card className="p-4 sm:p-6 border-none shadow-sm bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {classesToUse.map((cls) => (
                        <div key={cls} className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-2 group">
                          <span className="text-xs font-bold dark:text-gray-100">{cls}</span>
                          <button 
                            onClick={() => handleSaveClasses(classesToUse.filter(c => c !== cls))}
                            className="text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('newClass') as HTMLInputElement;
                      if (input.value.trim()) {
                        handleSaveClasses([...classesToUse, input.value.trim()]);
                        input.value = '';
                      }
                    }}>
                      <input 
                        name="newClass"
                        placeholder="Add new batch..."
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 min-w-0 dark:text-gray-100"
                      />
                      <button type="submit" className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shrink-0">
                        Add
                      </button>
                    </form>
                  </Card>

                  <Card className="p-6 border-none shadow-sm rounded-[2.5rem] bg-white dark:bg-gray-900 dark:border dark:border-gray-800 mb-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Bell size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Notifications</h3>
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {notificationsEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!notificationsEnabled) {
                            const granted = await requestNotificationPermission();
                            if (granted) {
                              setNotificationsEnabled(true);
                              setNotificationPermission(true);
                              localStorage.setItem('tution_notifications_enabled', 'true');
                              await schedulePaymentReminders(students);
                            }
                          } else {
                            setNotificationsEnabled(false);
                            localStorage.setItem('tution_notifications_enabled', 'false');
                          }
                        }}
                        className={cn(
                          "w-14 h-8 rounded-full transition-all relative",
                          notificationsEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full absolute top-1 transition-all",
                          notificationsEnabled ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    
                    <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                      Get reminders for pending payments and daily summaries.
                    </p>
                    
                    <button
                      onClick={sendTestNotification}
                      disabled={!notificationsEnabled}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Bell size={16} />
                      <span className="font-black text-xs uppercase tracking-widest">Send Test Notification</span>
                    </button>
                  </Card>

                  <Card className="p-6 border-none shadow-sm rounded-[2.5rem] bg-white dark:bg-gray-900 dark:border dark:border-gray-800 mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 mb-6">Data Backup & Restore</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={handleExportData}
                        className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all group"
                      >
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Download size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-xs uppercase tracking-widest">Backup Data</p>
                          <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Download to file</p>
                        </div>
                      </button>

                      <label className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all group cursor-pointer">
                        <input 
                          type="file" 
                          accept=".json" 
                          onChange={handleImportData} 
                          className="hidden" 
                        />
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Upload size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-xs uppercase tracking-widest">Restore Data</p>
                          <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Upload from file</p>
                        </div>
                      </label>
                    </div>
                    
                    <p className="mt-4 text-[9px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                      Tip: Download a backup regularly to keep your data safe. You can restore it on any device.
                    </p>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <button 
                      onClick={() => setShowAppInfo(true)}
                      className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all group"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Info size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-xs uppercase tracking-widest">App Info</p>
                        <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Version 1.0.0</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowDevInfo(true)}
                      className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-500/10 rounded-2xl text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all group"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <User size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-xs uppercase tracking-widest">Developer</p>
                        <p className="text-[8px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Contact Info</p>
                      </div>
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="w-full flex items-center justify-between p-6 bg-indigo-600 dark:bg-indigo-500 rounded-3xl text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all group mb-4 shadow-lg shadow-indigo-100 dark:shadow-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Share2 size={20} />
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">Share App</span>
                    </div>
                    <ChevronRight size={20} />
                  </button>

                  <button 
                    onClick={() => setShowResetWarning(true)}
                    className="w-full flex items-center justify-between p-6 bg-rose-50 dark:bg-rose-500/10 rounded-3xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Trash2 size={20} />
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">Reset App Data</span>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-gray-100 md:hidden px-4 pt-3 bottom-nav-safe flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:bg-[#0F1115]/90 dark:border-gray-800">
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
          { id: 'students', icon: <Users size={20} />, label: 'Students' },
          { id: 'add', icon: <Plus size={24} />, label: 'Add', isSpecial: true },
          { id: 'reports', icon: <FileText size={20} />, label: 'Reports' },
          { id: 'settings', icon: <User size={20} />, label: 'Profile' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => {
              if (item.id === 'add') {
                setShowAddMenu(true);
              } else {
                setActiveTab(item.id as any);
                setView('main');
              }
            }} 
            className={cn(
              "flex flex-col items-center gap-1 transition-all", 
              item.isSpecial ? "bg-indigo-600 dark:bg-indigo-500 text-white w-12 h-12 rounded-2xl justify-center -mt-8 shadow-xl shadow-indigo-200 dark:shadow-none" : (activeTab === item.id ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100")
            )}
          >
            {item.icon}
            {!item.isSpecial && <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Add Menu Overlay */}
      <AnimatePresence>
        {showAddMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMenu(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-24 left-4 right-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] bg-white rounded-[2.5rem] p-6 z-[70] shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-700">Quick Actions</h3>
                <button onClick={() => setShowAddMenu(false)} className="text-gray-700 hover:text-gray-900">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setSelectedStudentId(null);
                    setSelectedBatchId(null);
                    setActiveTab('students');
                    setView('add');
                    setShowAddMenu(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-indigo-50 rounded-3xl text-indigo-600 hover:bg-indigo-100 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <UserPlus size={24} />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest">New Student</span>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('batches');
                    setView('add-batch');
                    setShowAddMenu(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-emerald-50 rounded-3xl text-emerald-600 hover:bg-emerald-100 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest">New Batch</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Modals */}
      <AnimatePresence>
        {/* Reset Warning Modal */}
        {showResetWarning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetWarning(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-xl font-black tracking-tight mb-2 dark:text-gray-100">Reset All Data?</h3>
              <p className="text-gray-700 dark:text-gray-400 font-bold text-sm mb-8 leading-relaxed">
                This action will permanently delete all students, batches, and payment history. This cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-rose-600 dark:bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 dark:hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
                >
                  Yes, Reset Everything
                </button>
                <button 
                  onClick={() => setShowResetWarning(false)}
                  className="w-full bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 sm:bottom-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:translate-y-1/2 w-full sm:max-w-[450px] bg-white dark:bg-gray-900 rounded-t-[3rem] sm:rounded-[3rem] p-8 z-[110] shadow-2xl border-t sm:border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight dark:text-gray-100">Share App</h3>
                <button onClick={() => setShowShareModal(false)} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">App Link</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">tutiontracker.vercel.app</span>
                    <button 
                      onClick={handleCopyLink}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0",
                        copySuccess ? "bg-emerald-500 text-white" : "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
                      )}
                    >
                      {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                      {copySuccess ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button 
                    onClick={() => handleShare('whatsapp')}
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => handleShare('messenger')}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Share2 size={24} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">Messenger</span>
                  </button>
                  <button 
                    onClick={() => handleShare('other')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Globe size={24} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">More</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* App Info Modal */}
        {showAppInfo && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAppInfo(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] bg-white dark:bg-gray-900 rounded-[3rem] p-8 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight dark:text-gray-100">TuitionTracker</h3>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Version 1.0.0</p>
                  </div>
                </div>
                <button onClick={() => setShowAppInfo(false)} className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-gray-700 dark:text-gray-400 font-bold text-sm leading-relaxed">
                  TuitionTracker is a comprehensive management tool designed specifically for private tutors and coaching centers. 
                  Keep track of your students, batches, and payments with ease.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Stable Release</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Platform</p>
                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Web / Mobile</p>
                  </div>
                </div>
                <div className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20">
                  <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Key Features</h4>
                  <ul className="space-y-2">
                    {[
                      'Student Management',
                      'Batch Scheduling',
                      'Payment Tracking',
                      'Financial Reports',
                      'Offline Data Storage'
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Dev Info Modal */}
        {showDevInfo && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDevInfo(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white dark:bg-gray-900 rounded-[3rem] p-8 z-[110] shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
            >
              <button onClick={() => setShowDevInfo(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <Plus size={20} className="rotate-45" />
              </button>
              
              <div className="w-24 h-24 bg-purple-600 dark:bg-purple-500 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-xl shadow-purple-100 dark:shadow-none">
                JD
              </div>
              
              <h3 className="text-2xl font-black tracking-tight mb-1 dark:text-gray-100">Joy Krishna</h3>
              <p className="text-purple-600 dark:text-purple-400 font-black text-[10px] uppercase tracking-widest mb-6">Lead Developer</p>
              
              <p className="text-gray-700 dark:text-gray-400 font-bold text-sm mb-8 leading-relaxed">
                Passionate about building tools that solve real-world problems. 
                Feel free to reach out for feedback or suggestions!
              </p>

              <div className="flex flex-col gap-3">
                <a 
                  href="mailto:joymkrishna@gmail.com"
                  className="w-full flex items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <FileText size={18} />
                  Email Me
                </a>
                <a 
                  href="#"
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 dark:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  <Globe size={18} />
                  Portfolio
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}