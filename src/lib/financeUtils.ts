import { addMonths, differenceInMonths, format, isAfter, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { Student, Payment } from '../types';

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const calculateBillingMonths = (student: Student) => {
  const joinDate = startOfMonth(parseISO(student.joinDate));
  const today = startOfMonth(new Date());
  
  // If student is archived, we stop calculating dues at the archived date
  const endDate = student.status === 'inactive' && student.archivedDate 
    ? startOfMonth(parseISO(student.archivedDate)) 
    : today;
  
  const dueMonths = [];
  let currentMonth = joinDate;

  // Loop through each month from joinDate until the end date (inclusive)
  // This ensures the current month is counted as a due month.
  while (currentMonth <= endDate) {
    dueMonths.push(new Date(currentMonth));
    currentMonth = addMonths(currentMonth, 1);
  }
  
  // We also want to provide the current and next months in the dropdown for advance payments
  const allMonths = [...dueMonths];
  let nextToPay = allMonths.length > 0 ? addMonths(allMonths[allMonths.length - 1], 1) : joinDate;
  
  // Add months until we cover at least one month ahead of today for advance payment options
  while (nextToPay <= addMonths(today, 1)) {
    allMonths.push(new Date(nextToPay));
    nextToPay = addMonths(nextToPay, 1);
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
