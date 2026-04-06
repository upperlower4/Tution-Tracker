import { addMonths, differenceInMonths, format, isAfter, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { Student, Payment } from '../types';

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const calculateBillingMonths = (student: Student) => {
  const joinDate = parseISO(student.joinDate);
  const today = new Date();
  
  // If student is archived, we stop calculating dues at the archived date
  const endDate = student.status === 'inactive' && student.archivedDate 
    ? parseISO(student.archivedDate) 
    : today;
  
  // Calculate full months completed based on the actual day of joining
  // e.g., Feb 7 to March 6 is 0 months, March 7 is 1 month.
  const monthsCompleted = differenceInMonths(endDate, joinDate);
  
  const dueMonths = [];
  let monthCursor = startOfMonth(joinDate);
  for (let i = 0; i < monthsCompleted; i++) {
    dueMonths.push(new Date(monthCursor));
    monthCursor = addMonths(monthCursor, 1);
  }
  
  // allMonths provides options for payment (including current and next month for advance)
  const allMonths = [];
  let allMonthCursor = startOfMonth(joinDate);
  
  // For inactive students, we only show months up to their archive date
  const lastMonthToShow = student.status === 'inactive' && student.archivedDate
    ? startOfMonth(parseISO(student.archivedDate))
    : addMonths(startOfMonth(today), 1);
  
  while (allMonthCursor <= lastMonthToShow) {
    allMonths.push(new Date(allMonthCursor));
    allMonthCursor = addMonths(allMonthCursor, 1);
  }

  return { dueMonths, allMonths };
};

export const getStudentFinancials = (student: Student) => {
  const { dueMonths, allMonths } = calculateBillingMonths(student);
  let totalPaid = 0;
  let totalExpected = 0;
  
  // Calculate total expected based on fixed fee for all months that have passed
  if (student.salaryType === 'fixed') {
    totalExpected = (student.legacyExpected || 0) + (dueMonths.length * student.monthlyFee);
  }

  // Calculate total paid from history
  student.payments.forEach(p => {
    totalPaid += p.amountPaid;
  });

  const balance = totalPaid - totalExpected;
  const dues = balance < 0 ? Math.abs(balance) : 0;
  const advance = balance > 0 ? balance : 0;

  // Filter billingMonths to only show those not fully paid
  // A month is considered "paid" if the totalPaid covers the cumulative expected amount up to that month
  const filteredBillingMonths = allMonths.filter((m, index) => {
    if (student.salaryType !== 'fixed') return true;
    const cumulativeExpected = (student.legacyExpected || 0) + ((index + 1) * student.monthlyFee);
    return totalPaid < cumulativeExpected;
  });

  return {
    totalPaid,
    totalExpected,
    balance,
    dues,
    advance,
    billingMonths: filteredBillingMonths.length > 0 ? filteredBillingMonths : [allMonths[allMonths.length - 1]] // Fallback to last month if all paid
  };
};
