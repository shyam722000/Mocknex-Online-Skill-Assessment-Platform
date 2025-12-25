import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // 🔒 Ensure displayName exists (fallback)
  if (user && !user.displayName && user.email) {
    await updateProfile(user, {
      displayName: user.email.split("@")[0],
    });
  }

  // ✅ Store minimal user info in localStorage
  if (typeof window !== "undefined" && user) {
    const userData = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    };

    localStorage.setItem("firebase_user", JSON.stringify(userData));
  }

  return user;
};

export const logout = async () => {
  await signOut(auth);

  // 🧹 Clear stored user
  if (typeof window !== "undefined") {
    localStorage.removeItem("firebase_user");
  }
};
