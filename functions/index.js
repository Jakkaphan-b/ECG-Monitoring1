const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

// Load environment variables
require("dotenv").config();

admin.initializeApp();

// กำหนดค่า LINE Messaging API
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  functions.config().line?.access_token;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ||
  functions.config().line?.secret;

// กำหนดค่า Email (Gmail)
const emailConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || functions.config().email?.user,
    pass: process.env.EMAIL_PASSWORD || functions.config().email?.password,
  },
};

// สร้าง transporter สำหรับส่งอีเมล
let transporter;
try {
  transporter = nodemailer.createTransporter(emailConfig);
} catch (error) {
  console.log("Email config not set");
}

// LINE Webhook สำหรับรับ User ID
exports.lineWebhook = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const events = req.body.events || [];
      
      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          const message = event.message.text.toLowerCase();
          const userId = event.source.userId;
          
          if (message === 'myid' || message === 'id') {
            // ส่ง User ID กลับไป
            await replyLineMessage(event.replyToken, 
              `🆔 LINE User ID ของคุณ:\n${userId}\n\nกรุณานำ ID นี้ไปกรอกในระบบเพื่อเชื่อมต่อการแจ้งเตือน`
            );
          } else if (message === 'help' || message === 'ช่วยเหลือ') {
            await replyLineMessage(event.replyToken,
              `📋 คำสั่งที่ใช้ได้:\n• พิมพ์ "myid" หรือ "id" เพื่อดู User ID\n• พิมพ์ "help" เพื่อดูความช่วยเหลือ`
            );
          }
        } else if (event.type === 'follow') {
          // เมื่อมีคนเพิ่มเพื่อน
          await replyLineMessage(event.replyToken,
            `🎉 ยินดีต้อนรับสู่ระบบแจ้งเตือน ECG Monitoring!\n\n📋 วิธีใช้งาน:\n1. พิมพ์ "myid" เพื่อดู LINE User ID\n2. นำ ID ไปกรอกในเว็บไซต์เพื่อเชื่อมต่อ\n3. รับการแจ้งเตือนเมื่อมีภาวะฉุกเฉิน`
          );
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('LINE Webhook Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
});

// ฟังก์ชันส่งการแจ้งเตือนฉุกเฉิน
exports.sendEmergencyNotification = functions.https.onCall(async (data, context) => {
  try {
    // ตรวจสอบการยืนยันตัวตน
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { patientId, alertData } = data;
    
    // ดึงข้อมูลทีมผู้ดูแล
    const careTeamSnapshot = await admin.firestore()
      .collection('care_team')
      .where('patient_id', '==', patientId)
      .where('notifications_enabled', '==', true)
      .get();

    const careTeamMembers = careTeamSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ดึงข้อมูลผู้ป่วย
    const patientDoc = await admin.firestore()
      .collection('users')
      .doc(patientId)
      .get();
    
    const patientData = patientDoc.data();
    const patientName = patientData?.displayName || patientData?.email || 'ผู้ป่วย';

    // ส่งอีเมลแจ้งเตือน
    const emailPromises = careTeamMembers.map(member => 
      sendEmailNotification(member, patientName, alertData)
    );

    // ส่ง LINE แจ้งเตือน
    const linePromises = await sendLineNotifications(patientId, patientName, alertData);

    // รอให้การส่งทั้งหมดเสร็จสิ้น
    await Promise.allSettled([...emailPromises, ...linePromises]);

    // บันทึกประวัติการแจ้งเตือน
    await admin.firestore().collection('notification_logs').add({
      patient_id: patientId,
      alert_type: alertData.type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      recipients_count: careTeamMembers.length,
      alert_data: alertData
    });

    return { success: true, recipients: careTeamMembers.length };
  } catch (error) {
    console.error('Emergency notification error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ฟังก์ชันส่งอีเมล
async function sendEmailNotification(member, patientName, alertData) {
  if (!transporter) {
    console.log('Email transporter not configured');
    return;
  }

  try {
    const alertTypeText = getAlertTypeText(alertData.type);
    const timestamp = new Date(alertData.timestamp).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok'
    });

    const mailOptions = {
      from: `"ECG Monitoring System" <${process.env.EMAIL_USER || functions.config().email?.user}>`,
      to: member.email,
      subject: `🚨 การแจ้งเตือนฉุกเฉิน - ${patientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 การแจ้งเตือนฉุกเฉิน</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">รายละเอียดการแจ้งเตือน</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">ผู้ป่วย:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${patientName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">ประเภทการแจ้งเตือน:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${alertTypeText}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">เวลาที่เกิด:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${timestamp}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">ผู้รับแจ้งเตือน:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;">${member.name} (${getRoleLabel(member.role)})</td>
                </tr>
              </table>

              ${alertData.heartRate ? `
                <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                  <h3 style="margin: 0 0 10px 0; color: #856404;">ข้อมูลหัวใจ</h3>
                  <p style="margin: 0; color: #856404;">อัตราการเต้นของหัวใจ: <strong>${alertData.heartRate} bpm</strong></p>
                </div>
              ` : ''}

              <div style="margin: 20px 0; padding: 15px; background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #721c24;">คำแนะนำ</h3>
                <p style="margin: 0; color: #721c24;">กรุณาติดต่อผู้ป่วยหรือเข้าตรวจสอบสถานการณ์โดยทันที หากเป็นภาวะฉุกเฉินกรุณาโทรหาหน่วยฉุกเฉิน</p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${getWebsiteUrl()}/dashboard" 
                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   ดูข้อมูลเพิ่มเติมในระบบ
                </a>
              </div>
            </div>
          </div>

          <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">ข้อความนี้ส่งโดยอัตโนมัติจากระบบ ECG Monitoring</p>
            <p style="margin: 5px 0 0 0;">หากไม่ต้องการรับการแจ้งเตือน กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${member.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${member.email}:`, error);
  }
}

// ฟังก์ชันส่ง LINE แจ้งเตือน
async function sendLineNotifications(patientId, patientName, alertData) {
  try {
    // ดึง LINE User IDs
    const lineUsersSnapshot = await admin.firestore()
      .collection('line_users')
      .where('patient_id', '==', patientId)
      .where('is_active', '==', true)
      .get();

    const lineUsers = lineUsersSnapshot.docs.map(doc => doc.data());
    
    const promises = lineUsers.map(lineUser => 
      sendLineEmergencyAlert(lineUser.line_user_id, patientName, alertData)
    );

    return promises;
  } catch (error) {
    console.error('Error getting LINE users:', error);
    return [];
  }
}

// ฟังก์ชันส่ง LINE Emergency Alert
async function sendLineEmergencyAlert(userId, patientName, alertData) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.log('LINE access token not configured');
    return;
  }

  try {
    const flexMessage = {
      type: 'flex',
      altText: `🚨 การแจ้งเตือนฉุกเฉิน - ${patientName}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚨 การแจ้งเตือนฉุกเฉิน',
              weight: 'bold',
              color: '#ffffff',
              size: 'lg',
              align: 'center'
            }
          ],
          backgroundColor: '#FF4444',
          paddingAll: 'lg'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `ผู้ป่วย: ${patientName}`,
              weight: 'bold',
              size: 'lg',
              color: '#333333'
            },
            {
              type: 'text',
              text: `ประเภท: ${getAlertTypeText(alertData.type)}`,
              size: 'md',
              color: '#666666',
              margin: 'sm'
            },
            {
              type: 'text',
              text: `เวลา: ${new Date(alertData.timestamp).toLocaleString('th-TH')}`,
              size: 'sm',
              color: '#999999',
              margin: 'sm'
            }
          ],
          spacing: 'sm',
          paddingAll: 'lg'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#007bff',
              action: {
                type: 'uri',
                label: 'ดูข้อมูลเพิ่มเติม',
                uri: `${getWebsiteUrl()}/dashboard`
              }
            }
          ],
          paddingAll: 'lg'
        }
      }
    };

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage]
      })
    });

    if (!response.ok) {
      throw new Error(`LINE API Error: ${response.status}`);
    }

    console.log(`LINE message sent to: ${userId}`);
  } catch (error) {
    console.error(`Failed to send LINE message to ${userId}:`, error);
  }
}

// ฟังก์ชันตอบกลับ LINE
async function replyLineMessage(replyToken, text) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.log('LINE access token not configured');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{
          type: 'text',
          text
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`LINE Reply API Error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error replying LINE message:', error);
  }
}

// Helper functions
function getAlertTypeText(alertType) {
  const types = {
    'heart_rate_high': 'อัตราการเต้นของหัวใจสูงเกินปกติ',
    'heart_rate_low': 'อัตราการเต้นของหัวใจต่ำกว่าปกติ',
    'irregular_rhythm': 'จังหวะการเต้นของหัวใจผิดปกติ',
    'emergency': 'ภาวะฉุกเฉิน',
    'abnormal': 'ภาวะผิดปกติ'
  };
  return types[alertType] || 'ภาวะผิดปกติที่ไม่ทราบสาเหตุ';
}

function getRoleLabel(role) {
  const roles = {
    'family': 'ครอบครัว',
    'doctor': 'แพทย์',
    'nurse': 'พยาบาล',
    'caregiver': 'ผู้ดูแล'
  };
  return roles[role] || 'อื่นๆ';
}

function getWebsiteUrl() {
  // เปลี่ยนเป็น URL ของเว็บไซต์จริง
  return 'https://your-domain.com';
}
