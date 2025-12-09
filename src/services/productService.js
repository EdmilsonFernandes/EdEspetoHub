import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const collectionRef = collection(db, 'products');

export const productService = {
  async save(product) {
    if (product.id) {
      const ref = doc(db, 'products', product.id);
      await updateDoc(ref, { ...product });
    } else {
      await addDoc(collectionRef, {
        ...product,
        active: true,
        createdAt: serverTimestamp()
      });
    }
  },
  async delete(id) {
    await deleteDoc(doc(db, 'products', id));
  },
  subscribe(callback) {
    const q = query(collectionRef, orderBy('category'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      callback(data);
    });
  }
};
