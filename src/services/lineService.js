import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

class LineService {
  // บันทึก LINE User ID
  async saveLineUserId(patientId, careTeamMemberId, lineUserId) {
    try {
      await addDoc(collection(db, 'line_users'), {
        patient_id: patientId,
        care_team_member_id: careTeamMemberId,
        line_user_id: lineUserId,
        connected_at: new Date(),
        is_active: true
      });
    } catch (error) {
      console.error('Error saving LINE user ID:', error);
      throw error;
    }
  }

  // ดึง LINE User IDs ของทีมผู้ดูแล
  async getLineUserIds(patientId) {
    try {
      const lineUsersQuery = query(
        collection(db, 'line_users'),
        where('patient_id', '==', patientId),
        where('is_active', '==', true)
      );
      
      const snapshot = await getDocs(lineUsersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting LINE user IDs:', error);
      throw error;
    }
  }

  // ตรวจสอบว่าสมาชิกได้เชื่อมต่อ LINE แล้วหรือไม่
  async checkLineConnection(patientId, careTeamMemberId) {
    try {
      const lineUsersQuery = query(
        collection(db, 'line_users'),
        where('patient_id', '==', patientId),
        where('care_team_member_id', '==', careTeamMemberId),
        where('is_active', '==', true)
      );
      
      const snapshot = await getDocs(lineUsersQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking LINE connection:', error);
      return false;
    }
  }
}

export const lineService = new LineService();