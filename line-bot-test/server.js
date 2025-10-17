const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// LINE Channel Configuration
const LINE_CHANNEL_ACCESS_TOKEN = 'hODJs62TAuiecxqstK4Kmp/0/REW/1Nu+x4C4mgcGZOJ0b4ZrUQe4xI1Ncjc5hHbb7LzDLHTOJbEQh6OMgILdBS5rdiUZiErcdd06pEzvBlWjnw/QqFgeGpsE9Pu+jQCKSPFRmGHBtz4y21w6oO6IQdB04t89/1O/w1cDnyilFU=';
const LINE_CHANNEL_SECRET = '4ff6439c509cac60341e8c678683395f';

// Webhook endpoint สำหรับ LINE
app.post('/webhook', (req, res) => {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));
    
    const events = req.body.events;
    
    if (events && events.length > 0) {
        events.forEach(event => {
            if (event.type === 'message' && event.message.type === 'text') {
                const userId = event.source.userId;
                const messageText = event.message.text.toLowerCase();
                
                console.log(`User ${userId} sent: ${messageText}`);
                
                if (messageText === 'myid') {
                    // ส่งข้อความตอบกลับด้วย User ID
                    replyMessage(event.replyToken, [
                        {
                            type: 'text',
                            text: `🆔 LINE User ID ของคุณ:\n${userId}\n\n📋 กดยาวเพื่อคัดลอก`
                        }
                    ]);
                } else {
                    // ส่งข้อความตอบกลับทั่วไป
                    replyMessage(event.replyToken, [
                        {
                            type: 'text',
                            text: `สวัสดีครับ! 👋\n\nพิมพ์ "myid" เพื่อดู LINE User ID ของคุณ\n\nหรือติดต่อทีมดูแลสุขภาพ 👨‍⚕️`
                        }
                    ]);
                }
            }
        });
    }
    
    res.status(200).send('OK');
});

// ฟังก์ชันส่งข้อความตอบกลับ
async function replyMessage(replyToken, messages) {
    if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === 'YOUR_CHANNEL_ACCESS_TOKEN') {
        console.log('⚠️ ยังไม่ได้ตั้งค่า Channel Access Token');
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
                replyToken: replyToken,
                messages: messages
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('LINE API Error:', error);
        } else {
            console.log('✅ ส่งข้อความสำเร็จ');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'LINE Bot Server is running',
        timestamp: new Date().toISOString()
    });
});

// Home page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LINE Bot Test Server</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                h1 { color: #00c300; text-align: center; }
                .status { 
                    background: #e8f5e8; 
                    padding: 15px; 
                    border-radius: 8px;
                    border-left: 4px solid #00c300;
                    margin: 20px 0;
                }
                .warning {
                    background: #fff3e0;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #ff9800;
                    margin: 20px 0;
                }
                code { 
                    background: #f5f5f5; 
                    padding: 2px 6px; 
                    border-radius: 4px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 LINE Bot Test Server</h1>
                
                <div class="status">
                    <h3>✅ Server Status: Running</h3>
                    <p>Port: ${port}</p>
                    <p>Webhook: <code>/webhook</code></p>
                    <p>Health Check: <code>/health</code></p>
                </div>
                
                <div class="warning">
                    <h3>⚠️ การตั้งค่า</h3>
                    <p>1. ต้องได้ Channel Access Token จาก LINE Developers Console</p>
                    <p>2. ตั้งค่า Webhook URL ใน LINE Console เป็น:</p>
                    <code>https://yourdomain.com/webhook</code>
                    <p>3. ทดสอบส่ง "myid" ผ่าน LINE Official Account</p>
                </div>

                <h3>📱 LINE Official Account</h3>
                <p>Basic ID: <code>@981xsbcm</code></p>
                <p>Channel ID: <code>2008296167</code></p>
                
                <h3>🧪 การทดสอบ</h3>
                <p>1. เพิ่มเพื่อน @981xsbcm</p>
                <p>2. ส่งข้อความ "myid"</p>
                <p>3. Bot จะตอบกลับด้วย LINE User ID</p>
            </div>
        </body>
        </html>
    `);
});

// Start server
app.listen(port, () => {
    console.log(`🚀 LINE Bot Test Server running at http://localhost:${port}`);
    console.log(`📱 LINE Official Account: @981xsbcm`);
    console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhook`);
    console.log(`⚠️  ต้องตั้งค่า Channel Access Token ก่อนใช้งาน`);
});