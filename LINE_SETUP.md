# การตั้งค่า LINE Messaging API สำหรับ ECG Monitoring

## ข้อมูลที่มี
- **Channel ID:** 2008296167
- **Channel Secret:** 4ff6439c509cac60341e8c678683395f
- **LINE Official Account Basic ID:** @981xsbcm ✅
- **สถานะ:** พร้อมใช้งาน

## ขั้นตอนการตั้งค่า

### 1. อัปเกรด Firebase Project เป็น Blaze Plan
- ไปที่ [Firebase Console](https://console.firebase.google.com/project/ecg-monitor-f1fcb/usage/details)
- อัปเกรดเป็น Blaze (Pay-as-you-go) plan
- จำเป็นสำหรับใช้ Cloud Functions

### 2. สร้าง LINE Official Account
- ไปที่ [LINE Developers Console](https://developers.line.biz/)
- สร้าง Provider และ Messaging API Channel
- ใช้ Channel ID: 2008296167

### 3. ตั้งค่า Channel Access Token
- ไปที่ Channel Settings > Basic Settings
- Issue Channel Access Token
- คัดลอก Access Token

### 4. อัปเดต Environment Variables
```bash
# ใน functions/.env
LINE_CHANNEL_ACCESS_TOKEN=hODJs62TAuiecxqstK4Kmp/0/REW/1Nu+x4C4mgcGZOJ0b4ZrUQe4xI1Ncjc5hHbb7LzDLHTOJbEQh6OMgILdBS5rdiUZiErcdd06pEzvBlWjnw/QqFgeGpsE9Pu+jQCKSPFRmGHBtz4y21w6oO6IQdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=4ff6439c509cac60341e8c678683395f
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 5. Deploy Firebase Functions
```bash
firebase deploy --only functions
```

### 6. ตั้งค่า Webhook URL
- ไปที่ LINE Developers Console
- Messaging API Settings > Webhook Settings
- Webhook URL: `https://your-region-your-project.cloudfunctions.net/lineWebhook`
- เปิดใช้งาน Webhook

### 7. การใช้งาน
1. ผู้ใช้เพิ่มเพื่อน LINE Official Account ด้วย Basic ID: @981xsbcm
2. สแกน QR Code หรือค้นหา @981xsbcm ใน LINE
3. ส่งข้อความ "myid" เพื่อขอ User ID
4. นำ User ID ไปกรอกในเว็บไซต์ CareTeam
5. เปิดใช้งานการแจ้งเตือนทาง LINE

## โครงสร้างไฟล์ที่สร้าง

### Frontend (React)
- `src/services/lineService.js` - จัดการ LINE User ID
- `src/services/notificationService.js` - ส่งการแจ้งเตือน
- `src/components/care/CareTeam.jsx` - UI สำหรับเชื่อมต่อ LINE

### Backend (Firebase Functions)
- `functions/index.js` - LINE Webhook และส่งการแจ้งเตือน
- `functions/.env` - Environment variables
- `functions/package.json` - Dependencies

## การทดสอบ
1. ใช้ปุ่ม "ทดสอบการแจ้งเตือน" ใน CareTeam
2. ตรวจสอบการส่งอีเมลและ LINE message
3. ดู Firebase Functions logs

## Database Schema

### Collection: care_team
```javascript
{
  patient_id: string,
  name: string,
  email: string,
  phone: string,
  role: string,
  notifications_enabled: boolean,
  line_notifications: boolean, // เพิ่มใหม่
  created_at: timestamp
}
```

### Collection: line_users
```javascript
{
  patient_id: string,
  care_team_member_id: string,
  line_user_id: string,
  connected_at: timestamp,
  is_active: boolean
}
```

### Collection: notification_logs
```javascript
{
  patient_id: string,
  alert_type: string,
  timestamp: timestamp,
  recipients_count: number,
  alert_data: object
}
```

## Security และ Best Practices
- ใช้ Environment Variables สำหรับ credentials
- ตรวจสอบ Authentication ใน Cloud Functions
- Rate limiting สำหรับ API calls
- Error handling และ logging

## ข้อจำกัดและข้อควรระวัง
- Firebase Blaze Plan มีค่าใช้จ่ายตาม usage
- LINE Messaging API มี rate limits
- ต้องได้รับ consent จากผู้ใช้ก่อนส่งการแจ้งเตือน
- เก็บ personal data ตาม PDPA guidelines