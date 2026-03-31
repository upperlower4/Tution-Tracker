import { Student } from '../types';
import { getStudentFinancials } from './financeUtils';

// Safe Capacitor plugin loader — won't crash in browser/web
async function getLocalNotifications() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return false;
    const result = await plugin.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return false;
    const result = await plugin.checkPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: any;
}): Promise<void> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return;
    await plugin.schedule({
      notifications: [{
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: { at: options.scheduleAt },
        extra: options.extra,
        sound: 'default',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      }],
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

export async function cancelNotification(id: number): Promise<void> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return;
    await plugin.cancel({ notifications: [{ id }] });
  } catch {}
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return;
    await plugin.cancel({ notifications: [] });
  } catch {}
}

export async function schedulePaymentReminders(students: Student[]): Promise<void> {
  await cancelAllNotifications();
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) return;

  let notificationId = 1;
  for (const student of students) {
    if (student.status !== 'active' || student.salaryType !== 'fixed') continue;
    const financials = getStudentFinancials(student);
    if (financials.dues > 0) {
      const tomorrow9AM = new Date();
      tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
      tomorrow9AM.setHours(9, 0, 0, 0);
      await scheduleNotification({
        id: notificationId++,
        title: `Payment Due: ${student.name}`,
        body: `${student.name} has outstanding dues of ৳${financials.dues.toLocaleString()}`,
        scheduleAt: tomorrow9AM,
        extra: { studentId: student.id, type: 'payment_due' },
      });
      if (financials.dues >= student.monthlyFee * 2) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0);
        await scheduleNotification({
          id: notificationId++,
          title: `High Dues Alert: ${student.name}`,
          body: `${student.name} has 2+ months dues: ৳${financials.dues.toLocaleString()}`,
          scheduleAt: nextWeek,
          extra: { studentId: student.id, type: 'high_dues' },
        });
      }
    }
  }
}

export async function scheduleDailySummary(students: Student[]): Promise<void> {
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) return;
  const activeStudents = students.filter(s => s.status === 'active');
  const totalDues = activeStudents.reduce((acc, s) => acc + getStudentFinancials(s).dues, 0);
  const studentsWithDues = activeStudents.filter(s => getStudentFinancials(s).dues > 0).length;
  const tomorrow8AM = new Date();
  tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
  tomorrow8AM.setHours(8, 0, 0, 0);
  await scheduleNotification({
    id: 9999,
    title: 'Daily Tuition Summary',
    body: `${studentsWithDues} students have dues. Total: ৳${totalDues.toLocaleString()}`,
    scheduleAt: tomorrow8AM,
    extra: { type: 'daily_summary' },
  });
}

export async function sendTestNotification(): Promise<void> {
  const permissionGranted = await checkNotificationPermission();
  if (!permissionGranted) return;
  const now = new Date();
  now.setSeconds(now.getSeconds() + 2);
  await scheduleNotification({
    id: 99999,
    title: 'TuitionTracker Test',
    body: 'Notifications are working correctly!',
    scheduleAt: now,
  });
}

export async function getPendingNotifications(): Promise<any[]> {
  try {
    const plugin = await getLocalNotifications();
    if (!plugin) return [];
    const result = await plugin.getPending();
    return result.notifications;
  } catch {
    return [];
  }
}
