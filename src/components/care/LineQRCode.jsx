import React, { useState } from 'react';

const LineQRCode = ({ 
  channelId = "2008296167",
  lineOfficialId = null, // เช่น "@ecgmonitoring" เมื่อสร้าง LINE Official Account แล้ว
  isReady = false // เปลี่ยนเป็น true เมื่อ Deploy Functions แล้ว
}) => {
  const [qrError, setQrError] = useState(false);
  
  // สร้าง URL สำหรับเพิ่มเพื่อน LINE (เมื่อมี LINE Official Account แล้ว)
  const lineAddFriendUrl = lineOfficialId 
    ? `https://line.me/R/ti/p/${lineOfficialId}`
    : `https://line.me/R/ti/p/@981xsbcm`; // LINE Official Account Basic ID จริง

  const qrCodeUrl = isReady 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lineAddFriendUrl)}`
    : null;

  const handleCopyLink = () => {
    if (isReady && lineAddFriendUrl) {
      navigator.clipboard.writeText(lineAddFriendUrl).then(() => {
        alert('คัดลอกลิงก์แล้ว!');
      });
    } else {
      alert('ยังไม่พร้อมใช้งาน กรุณารอให้ Admin ตั้งค่าเสร็จสิ้น');
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="text-center">
        <h4 className="font-semibold text-green-800 mb-3">เพิ่มเพื่อน LINE Official Account</h4>
        
        <div className="mb-4">
          {isReady && qrCodeUrl && !qrError ? (
            /* QR Code จริงเมื่อพร้อมใช้งาน */
            <img 
              src={qrCodeUrl} 
              alt="LINE Official Account QR Code"
              className="mx-auto border border-gray-300 rounded"
              onError={() => setQrError(true)}
            />
          ) : (
            /* QR Code Placeholder */
            <div className="w-48 h-48 mx-auto border-2 border-dashed border-green-300 rounded-lg flex items-center justify-center bg-white">
              <div className="text-center p-4">
                <svg className="w-16 h-16 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <div className="text-green-600 text-sm font-medium">QR Code</div>
                <div className="text-green-500 text-xs mt-1">
                  {isReady ? 'กำลังโหลด...' : 'จะแสดงเมื่อพร้อมใช้งาน'}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-3 text-sm text-green-700">
          <p><strong>วิธีการเชื่อมต่อ:</strong></p>
          <div className="bg-white border border-green-200 rounded p-3 text-left">
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>สแกน QR Code ด้านบน หรือคลิกปุ่มเพิ่มเพื่อน</li>
              <li>เพิ่มเป็นเพื่อนใน LINE</li>
              <li>ส่งข้อความ <code className="bg-gray-100 px-1 rounded">"myid"</code> ในแชท</li>
              <li>คัดลอก LINE User ID ที่ Bot ส่งกลับมา</li>
              <li>นำ User ID มากรอกในฟอร์มด้านล่าง</li>
            </ol>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">หรือค้นหาด้วย Basic ID:</p>
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">@981xsbcm</code>
            </div>
          </div>

          {isReady && (
            <button
              onClick={handleCopyLink}
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              📎 คัดลอกลิงก์เพิ่มเพื่อน
            </button>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded text-xs text-blue-800">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>สำคัญ:</strong> LINE User ID ไม่ใช่ LINE ID ปกติ แต่เป็น ID พิเศษจาก Bot</span>
          </div>
        </div>

        {!isReady && (
          <div className="mt-3 p-3 bg-amber-100 border border-amber-200 rounded text-xs text-amber-800">
            <div className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <strong>สถานะ:</strong> ยังไม่พร้อมใช้งาน<br/>
                ต้องอัปเกรด Firebase เป็น Blaze Plan และ Deploy Functions ก่อน
              </div>
            </div>
          </div>
        )}

        {isReady && (
          <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded text-xs text-green-800">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>พร้อมใช้งาน!</strong> สามารถเพิ่มเพื่อนและรับการแจ้งเตือนได้แล้ว</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineQRCode;