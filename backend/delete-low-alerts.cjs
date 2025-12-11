const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ecg-monitor-f1fcb-default-rtdb.firebaseio.com',
});
const db = admin.firestore();

(async () => {
  const userCollections = await db.collection('ecg_status').listDocuments();
  for (const userDoc of userCollections) {
    const deviceCollections = await userDoc.listCollections();
    for (const deviceCol of deviceCollections) {
      const eventsSnap = await deviceCol.get();
      for (const doc of eventsSnap.docs) {
        if (doc.data().alert_level === 'low') {
          await doc.ref.delete();
          console.log(`Deleted: ecg_status/${userDoc.id}/${deviceCol.id}/${doc.id}`);
        }
      }
    }
  }
  console.log('Done.');
  process.exit(0);
})();