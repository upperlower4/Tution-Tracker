import { LocalNotifications } from '@capacitor/local-notifications';
import { Student } from '../types';
import { getStudentFinancials } from './financeUtils';

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

// Check if notifications are enabled
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return false;
  }
}

// Schedule a notification
export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: any;
}): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: { at: options.scheduleAt },
          extra: options.extra,
          sound: 'default',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
        },
      ],
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

// Cancel a specific notification
export async function cancelNotification(id: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [] });
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

// Schedule payment due reminders
export async function schedulePaymentReminders(students: Student[]): Promise<void> {
  // Cancel existing notifications first
  await cancelAllNotifications();

  const now = new Date();
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) {
    console.log('Notification permission not granted');
    return;
  }

  let notificationId = 1;

  for (const student of students) {
    if (student.status !== 'active' || student.salaryType !== 'fixed') {
      continue;
    }

    const financials = getStudentFinancials(student);
    
    if (financials.dues > 0) {
      // Schedule reminder for tomorrow at 9 AM
      const tomorrow9AM = new Date();
      tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
      tomorrow9AM.setHours(9, 0, 0, 0);

      await scheduleNotification({
        id: notificationId++,
        title: `💰 Payment Due: ${student.name}`,
        body: `${student.name} has outstanding dues of ৳${financials.dues.toLocaleString()}`,
        scheduleAt: tomorrow9AM,
        extra: { studentId: student.id, type: 'payment_due' },
      });

      // Schedule weekly reminder if dues are high
      if (financials.dues >= student.monthlyFee * 2) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0);

        await scheduleNotification({
          id: notificationId++,
          title: `⚠️ High Dues Alert: ${student.name}`,
          body: `${student.name} has 2+ months dues: ৳${financials.dues.toLocaleString()}`,
          scheduleAt: nextWeek,
          extra: { studentId: student.id, type: 'high_dues' },
        });
      }
    }
  }
}

// Schedule daily summary notification
export async function scheduleDailySummary(students: Student[]): Promise<void> {
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) return;

  const activeStudents = students.filter(s => s.status === 'active');
  const totalDues = activeStudents.reduce((acc, s) => {
    const fin = getStudentFinancials(s);
    return acc + fin.dues;
  }, 0);

  const studentsWithDues = activeStudents.filter(s => {
    const fin = getStudentFinancials(s);
    return fin.dues > 0;
  }).length;

  // Schedule for tomorrow 8 AM
  const tomorrow8AM = new Date();
  tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
  tomorrow8AM.setHours(8, 0, 0, 0);

  await scheduleNotification({
    id: 9999,
    title: '📊 Daily Tuition Summary',
    body: `${studentsWithDues} students have dues. Total pending: ৳${totalDues.toLocaleString()}`,
    scheduleAt: tomorrow8AM,
    extra: { type: 'daily_summary' },
  });
}

// Get pending notifications
export async function getPendingNotifications(): Promise<any[]> {
  try {
    const result = await LocalNotifications.getPending();
    return result.notifications;
  } catch (error) {
    console.error('Failed to get pending notifications:', error);
    return [];
  }
}

// Trigger immediate test notification
export async function sendTestNotification(): Promise<void> {
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) {
    console.log('Notification permission not granted');
    return;
  }

  const now = new Date();
  now.setSeconds(now.getSeconds() + 2);

  await scheduleNotification({
    id: 99999,
    title: '✅ TuitionTracker Test',
    body: 'Notifications are working correctly!',
    scheduleAt: now,
  });
}
