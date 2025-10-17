import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

class NotificationService {
  constructor() {
    this.functions = getFunctions();
  }

  // ส่งการแจ้งเตือนผ่านทุกช่องทาง
  async sendEmergencyNotification(patientId, alertData) {
    try {
      const sendNotification = httpsCallable(this.functions, 'sendEmergencyNotification');
      
      const result = await sendNotification({
        patientId,
        alertData: {
          type: alertData.type || 'emergency',
          heartRate: alertData.heartRate,
          timestamp: alertData.timestamp || Date.now(),
          message: alertData.message || 'ภาวะฉุกเฉิน'
        }
      });

      console.log('Emergency notification sent successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  }

  // ส่งการแจ้งเตือนทดสอบ
  async sendTestNotification(patientId) {
    return this.sendEmergencyNotification(patientId, {
      type: 'emergency',
      heartRate: 120,
      timestamp: Date.now(),
      message: 'การทดสอบระบบแจ้งเตือน - กรุณาไม่ต้องตกใจ นี่เป็นเพียงการทดสอบระบบ'
    });
  }

  // ดึงข้อมูลทีมผู้ดูแลที่เปิดการแจ้งเตือน
  async getCareTeamWithNotifications(patientId) {
    try {
      const careTeamQuery = query(
        collection(db, 'care_team'),
        where('patient_id', '==', patientId),
        where('notifications_enabled', '==', true)
      );
      
      const careTeamSnapshot = await getDocs(careTeamQuery);
      return careTeamSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting care team with notifications:', error);
      throw error;
    }
  }

  // ดึงประวัติการแจ้งเตือน
  async getNotificationHistory(patientId, limit = 10) {
    try {
      const notificationQuery = query(
        collection(db, 'notification_logs'),
        where('patient_id', '==', patientId)
        // orderBy('timestamp', 'desc'),
        // limit(limit)
      );
      
      const snapshot = await getDocs(notificationQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();