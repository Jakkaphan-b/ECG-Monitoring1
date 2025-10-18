import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
// import { getFunctions, httpsCallable } from 'firebase/functions'; // พักไว้ก่อน

class NotificationService {
  constructor() {
    // this.functions = getFunctions(); // พักไว้ก่อน
    this.emailApiUrl = 'http://localhost:3003';
    this.isDebug = true; // เปิด debug mode
  }

  // ฟังก์ชันช่วยสำหรับ debug
  log(message, data = null) {
    if (this.isDebug) {
      console.log(`🔧 [NotificationService] ${message}`, data || '');
    }
  }

  // ตรวจสอบสถานะ Email Server
  async checkServerStatus() {
    try {
      this.log('Checking email server status...');
      const response = await fetch(`${this.emailApiUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        this.log('Email server is running', data);
        return { status: 'online', data };
      } else {
        this.log('Email server returned error', response.status);
        return { status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      this.log('Email server is offline', error.message);
      return { status: 'offline', error: error.message };
    }
  }

  // ส่งการแจ้งเตือนฉุกเฉินผ่าน Nodemailer
  async sendEmergencyNotification(patientId, alertData) {
    try {
      console.log('🚨 Sending emergency notification via Nodemailer for patient:', patientId);
      
      // ดึงข้อมูลทีมผู้ดูแล
      const careTeam = await this.getCareTeamWithNotifications(patientId);
      
      if (careTeam.length === 0) {
        throw new Error('ไม่พบทีมผู้ดูแลที่เปิดการแจ้งเตือน');
      }

      const recipients = careTeam.map(member => member.email);
      
      // เรียก Email API สำหรับฉุกเฉิน
      const response = await fetch(`${this.emailApiUrl}/api/send-emergency-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: recipients,
          alertData: {
            patientName: alertData.patientName || 'ผู้ป่วย',
            type: alertData.type || 'ภาวะฉุกเฉิน',
            heartRate: alertData.heartRate,
            bloodPressure: alertData.bloodPressure,
            timestamp: alertData.timestamp || Date.now(),
            message: alertData.message || 'พบความผิดปกติในสัญญาณชีพ'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Email API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('🚨 Emergency email sent successfully:', result);
      
      return {
        success: true,
        recipients: result.recipients,
        emailsSent: result.recipients,
        linesSent: 0,
        method: 'nodemailer',
        messageId: result.messageId,
        alertType: result.alertType
      };

    } catch (error) {
      console.error('❌ Error sending emergency notification:', error);
      
      // Fallback ไปใช้ mailto สำหรับฉุกเฉิน
      return await this.sendEmergencyNotificationViaMailto(patientId, alertData);
    }
  }

  // ส่งการแจ้งเตือนทดสอบ
  async sendTestNotification(patientId) {
    try {
      this.log('Starting test notification process', { patientId });
      
      // ตรวจสอบสถานะ server ก่อน
      const serverStatus = await this.checkServerStatus();
      if (serverStatus.status !== 'online') {
        this.log('Server offline, using fallback method');
        return await this.sendTestNotificationViaMailto(patientId);
      }
      
      // ดึงข้อมูลทีมผู้ดูแลที่เปิดการแจ้งเตือน
      const careTeam = await this.getCareTeamWithNotifications(patientId);
      
      if (careTeam.length === 0) {
        throw new Error('ไม่พบทีมผู้ดูแลที่เปิดการแจ้งเตือน กรุณาเพิ่มสมาชิกก่อน');
      }

      const recipients = careTeam.map(member => member.email);
      
      this.log('Sending test email via Nodemailer', { recipients });
      
      // เรียก Email API สำหรับทดสอบ
      const response = await fetch(`${this.emailApiUrl}/api/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: recipients,
          patientName: 'ผู้ป่วยทดสอบ'
        })
      });

      if (!response.ok) {
        throw new Error(`Email API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      this.log('Test email sent successfully via Nodemailer', result);
      
      return {
        success: true,
        recipients: result.recipients,
        emailsSent: result.recipients,
        linesSent: 0,
        method: 'nodemailer',
        messageId: result.messageId,
        careTeam: careTeam,
        recipientList: result.recipientList
      };

    } catch (error) {
      this.log('Error sending test notification', error.message);
      
      // Fallback ไปใช้ mailto
      return await this.sendTestNotificationViaMailto(patientId);
    }
  }

  // Fallback: ส่งทดสอบผ่าน mailto
  async sendTestNotificationViaMailto(patientId) {
    try {
      console.log('📧 Fallback: Using mailto for test notification');
      
      const careTeam = await this.getCareTeamWithNotifications(patientId);
      
      if (careTeam.length === 0) {
        throw new Error('ไม่พบทีมผู้ดูแลที่เปิดการแจ้งเตือน');
      }

      const emails = careTeam.map(member => member.email).join(';');
      const memberList = careTeam.map(member => `• ${member.name} (${member.email})`).join('\n');
      
      const subject = '🧪 ECG Monitoring - การทดสอบระบบแจ้งเตือน (Fallback)';
      const body = `สวัสดีครับ/ค่ะ,

นี่คือการทดสอบระบบแจ้งเตือนจาก ECG Monitoring System (โหมด Fallback)

📊 รายละเอียดการทดสอบ:
• วันที่: ${new Date().toLocaleDateString('th-TH')}
• เวลา: ${new Date().toLocaleTimeString('th-TH')}
• ประเภท: ทดสอบระบบ
• โหมด: Email Client (Fallback)

⚠️ หมายเหตุ: ระบบ Nodemailer ไม่สามารถเชื่อมต่อได้ จึงใช้โปรแกรมอีเมลเริ่มต้น

ขอบคุณครับ/ค่ะ
ECG Monitoring Team`;

      const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink);
      
      return {
        success: true,
        recipients: careTeam.length,
        emailsSent: careTeam.length,
        linesSent: 0,
        method: 'mailto-fallback',
        message: 'เปิดโปรแกรมอีเมลแล้ว (Fallback)',
        emailList: memberList,
        careTeam: careTeam
      };

    } catch (error) {
      console.error('Error in mailto fallback:', error);
      throw error;
    }
  }

  // Fallback: ส่งฉุกเฉินผ่าน mailto
  async sendEmergencyNotificationViaMailto(patientId, alertData) {
    try {
      console.log('🚨 Fallback: Using mailto for emergency notification');
      
      const careTeam = await this.getCareTeamWithNotifications(patientId);
      
      if (careTeam.length === 0) {
        throw new Error('ไม่พบทีมผู้ดูแลที่เปิดการแจ้งเตือน');
      }

      const emails = careTeam.map(member => member.email).join(';');
      const subject = `🚨 ECG EMERGENCY - ${alertData?.type || 'ภาวะฉุกเฉิน'}`;
      const body = `⚠️ การแจ้งเตือนฉุกเฉิน ⚠️

👤 ผู้ป่วย: ${alertData?.patientName || 'ไม่ระบุชื่อ'}
🚨 ประเภท: ${alertData?.type || 'ภาวะฉุกเฉิน'}
💓 อัตราการเต้นหัวใจ: ${alertData?.heartRate || 'ไม่ระบุ'} bpm
⏰ เวลา: ${new Date(alertData?.timestamp || Date.now()).toLocaleString('th-TH')}

📝 รายละเอียด: ${alertData?.message || 'พบความผิดปกติในสัญญาณชีพ'}

⚡ กรุณาดำเนินการตรวจสอบทันที ⚡
📞 โทร 1669 หากเป็นกรณีฉุกเฉิน

---
ECG Monitoring System - Emergency Alert`;

      const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink);
      
      return {
        success: true,
        recipients: careTeam.length,
        emailsSent: careTeam.length,
        linesSent: 0,
        method: 'mailto-fallback'
      };

    } catch (error) {
      console.error('Error in emergency mailto fallback:', error);
      throw error;
    }
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