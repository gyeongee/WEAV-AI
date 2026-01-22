import { getFirestore, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { app } from './firebase'; // Need to export app from firebase.ts

const db = getFirestore(app);

export const userService = {
    /**
     * Syncs the Firebase Auth user to Firestore 'users' collection.
     * Creates the document if it doesn't exist.
     */
    syncUserToFirestore: async (user: User) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New User
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                plan: 'free', // Default plan
            });
            console.log(`[UserService] Created new user profile for ${user.email}`);
        } else {
            // Existing User - Update login time
            await updateDoc(userRef, {
                lastLoginAt: serverTimestamp(),
                photoURL: user.photoURL, // Sync latest photo
                displayName: user.displayName // Sync latest name
            });
            console.log(`[UserService] Updated user profile for ${user.email}`);
        }
    }
};
