import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

const collectionRef = collection(db, 'orders');

export const orderService = {
  async save(orderData) {
    await addDoc(collectionRef, {
      ...orderData,
      createdAt: serverTimestamp(),
      dateString: new Date().toLocaleDateString('pt-BR'),
      timestamp: Date.now()
    });
  },
  subscribeAll(callback) {
    const q = query(collectionRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
  },
  async fetchQueue() {
    const queueQuery = query(
      collectionRef,
      where('status', 'in', ['pending', 'preparing']),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(queueQuery);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  },
  subscribeRecent(callback) {
    const q = query(
      collectionRef,
      where('status', 'in', ['pending', 'preparing']),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
  },
  async updateStatus(id, status) {
    await updateDoc(doc(db, 'orders', id), { status });
  }
};
