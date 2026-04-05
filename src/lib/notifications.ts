import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  console.log('Notifications: Requesting permission...');
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      console.log('Notifications: Native permission result:', permission.display);
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  } else {
    // Web Fallback
    if (!('Notification' in window)) {
      console.warn('Notifications: This browser does not support desktop notifications.');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      console.log('Notifications: Web permission result:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting web notification permissions:', error);
      return false;
    }
  }
};

/**
 * Check the current notification permission status.
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  } else {
    // Web Fallback
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }
};

/**
 * Schedule payment reminders for active students.
 * This is a placeholder implementation that can be expanded with real logic.
 */
export const schedulePaymentReminders = async (students: any[]): Promise<void> => {
  console.log('Notifications: Scheduling reminders for', students.length, 'students');
  if (!Capacitor.isNativePlatform()) {
    console.log('Notifications: Scheduling is only supported on native platforms.');
    return;
  }

  try {
    // Cancel all existing pending notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const activeStudents = students.filter(s => s.status === 'active');
    
    // Example: Schedule a reminder for each student for the next month
    // In a real app, you'd calculate the exact due date.
    const notifications = activeStudents.slice(0, 10).map((student, index) => ({
      title: 'Payment Reminder',
      body: `Monthly tuition fee for ${student.name} is due soon.`,
      id: index + 100,
      schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * (index + 1)) }, // Staggered reminders
      sound: 'beep.wav',
    }));

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log('Notifications: Scheduled', notifications.length, 'reminders');
    }
  } catch (error) {
    console.error('Error scheduling payment reminders:', error);
  }
};

/**
 * Send a test notification immediately.
 */
export const sendTestNotification = async (): Promise<void> => {
  console.log('Notifications: Sending test notification...');
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Tution Pro Test',
            body: 'Your notification system is working perfectly!',
            id: 1,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            sound: 'beep.wav',
          }
        ]
      });
      console.log('Notifications: Test notification scheduled on native platform');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Please check permissions.');
    }
  } else {
    // Web Fallback
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('Tution Pro Test', {
        body: 'Your web notification system is working perfectly!',
        icon: '/logo.png'
      });
      console.log('Notifications: Test notification sent on web');
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Tution Pro Test', {
          body: 'Your web notification system is working perfectly!',
          icon: '/logo.png'
        });
      } else {
        alert('Notification permission denied. Please enable it in your browser settings.');
      }
    }
  }
};
