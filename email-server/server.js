const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
// Load environment variables
require("dotenv").config({ path: __dirname + '/.env' });

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
  ]
}));
app.use(express.json());

// สร้าง Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASSWORD || '').replace(/\s/g, '') // ลบช่องว่างออก
  }
});

// ตรวจสอบการเชื่อมต่อ Gmail
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Gmail connection failed:', error);
  } else {
    console.log('✅ Gmail connection successful');
  }
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'ECG Email Server',
    timestamp: new Date().toISOString()
  });
});

// API Endpoint ส่งอีเมลทดสอบ
app.post('/api/send-test-email', async (req, res) => {
  try {
    const { recipients, patientName = 'ผู้ป่วย' } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    console.log('📧 Sending test email to:', recipients);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ECG Monitoring Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🧪 ECG Monitoring</h1>
            <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">การทดสอบระบบแจ้งเตือน</p>
          </div>

          <!-- Success Badge -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 25px; border-radius: 50px; text-align: center; margin-bottom: 30px;">
            <span style="font-size: 18px; font-weight: bold;">✅ ทดสอบระบบสำเร็จ</span>
          </div>

          <!-- Content -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">📊 รายละเอียดการทดสอบ</h2>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 8px 0;"><strong>👤 ผู้ป่วย:</strong> ${patientName}</p>
              <p style="margin: 8px 0;"><strong>📅 วันที่:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
              <p style="margin: 8px 0;"><strong>⏰ เวลา:</strong> ${new Date().toLocaleTimeString('th-TH')}</p>
              <p style="margin: 8px 0;"><strong>🔄 ประเภท:</strong> ทดสอบระบบแจ้งเตือน</p>
              <p style="margin: 8px 0;"><strong>✅ สถานะ:</strong> ระบบทำงานปกติ</p>
            </div>
          </div>

          <!-- Success Message -->
          <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #166534; margin: 0 0 10px 0;">🎉 การทดสอบสำเร็จ!</h3>
            <p style="color: #166534; margin: 0; line-height: 1.6;">
              หากท่านได้รับอีเมลนี้ แสดงว่าระบบแจ้งเตือน ECG Monitoring ทำงานได้ถูกต้อง 
              ในกรณีที่มีภาวะฉุกเฉิน ระบบจะส่งการแจ้งเตือนโดยอัตโนมัติ
            </p>
          </div>

          <!-- Emergency Info -->
          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #92400e; margin: 0 0 15px 0;">⚠️ เมื่อมีภาวะฉุกเฉิน</h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>ระบบจะส่งการแจ้งเตือนทันที</li>
              <li>กรุณาตรวจสอบและดำเนินการโดยเร็ว</li>
              <li>ติดต่อหน่วยแพทย์ฉุกเฉินหากจำเป็น</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
              📧 Email นี้ส่งโดยระบบอัตโนมัติ<br>
              🏥 ECG Monitoring System | 📞 Support: 02-xxx-xxxx<br>
              ⏰ ${new Date().toLocaleString('th-TH')}
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'ECG Monitoring System',
        address: process.env.EMAIL_USER
      },
      to: recipients.join(','),
      subject: '🧪 ECG Monitoring - การทดสอบระบบแจ้งเตือน',
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      messageId: result.messageId,
      recipients: recipients.length,
      recipientList: recipients,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// API Endpoint ส่งอีเมลฉุกเฉิน
app.post('/api/send-emergency-email', async (req, res) => {
  try {
    const { recipients, alertData } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required'
      });
    }

    console.log('🚨 Sending emergency email to:', recipients);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>🚨 ECG Emergency Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; background: #fee2e2; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border: 3px solid #dc2626; border-radius: 10px; padding: 30px;">
          
          <!-- Emergency Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; font-size: 32px; margin: 0; animation: blink 1s linear infinite;">🚨 ภาวะฉุกเฉิน</h1>
            <p style="color: #991b1b; font-size: 18px; margin: 10px 0; font-weight: bold;">ECG Monitoring Alert</p>
          </div>
          
          <!-- Alert Details -->
          <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #991b1b; margin: 0 0 15px 0;">⚠️ รายละเอียดการแจ้งเตือน</h2>
            <p style="margin: 8px 0; font-size: 16px;"><strong>👤 ผู้ป่วย:</strong> ${alertData?.patientName || 'ไม่ระบุชื่อ'}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>🚨 ประเภท:</strong> ${alertData?.type || 'ภาวะฉุกเฉิน'}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>💓 อัตราการเต้นหัวใจ:</strong> ${alertData?.heartRate || 'ไม่ระบุ'} bpm</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>🩺 ความดันโลหิต:</strong> ${alertData?.bloodPressure || 'ไม่ระบุ'}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>⏰ เวลา:</strong> ${new Date(alertData?.timestamp || Date.now()).toLocaleString('th-TH')}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>📝 รายละเอียด:</strong> ${alertData?.message || 'พบความผิดปกติในสัญญาณชีพ'}</p>
          </div>
          
          <!-- Emergency Action -->
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 20px;">⚡ กรุณาดำเนินการตรวจสอบทันที ⚡</h3>
            <p style="margin: 10px 0 0 0; font-size: 16px;">โทร 1669 หากเป็นกรณีฉุกเฉิน</p>
          </div>

          <!-- Contact Info -->
          <div style="text-align: center; border-top: 2px solid #dc2626; padding-top: 20px;">
            <p style="color: #991b1b; margin: 0; font-size: 14px; font-weight: bold;">
              🏥 ECG Monitoring System - Emergency Alert<br>
              📞 ฉุกเฉิน: 1669 | โรงพยาบาล: 02-xxx-xxxx<br>
              ⏰ ${new Date().toLocaleString('th-TH')}
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'ECG Emergency System',
        address: process.env.EMAIL_USER
      },
      to: recipients.join(','),
      subject: `🚨 ECG EMERGENCY - ${alertData?.type || 'ภาวะฉุกเฉิน'} - ${alertData?.patientName || 'ผู้ป่วย'}`,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('🚨 Emergency email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      messageId: result.messageId,
      recipients: recipients.length,
      recipientList: recipients,
      alertType: alertData?.type || 'emergency',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending emergency email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ECG Email Server running on port ${PORT}`);
  console.log(`✅ Email service: ${process.env.EMAIL_USER}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;