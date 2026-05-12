import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from './config';

const SESSION_COOKIE_ERROR_CODE = 'auth/session-cookie-failed';

function createAuthError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

async function createSessionCookie(idToken: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (error) {
    throw createAuthError(
      SESSION_COOKIE_ERROR_CODE,
      error instanceof Error ? error.message : 'Failed to reach session endpoint'
    );
  }

  if (!response.ok) {
    throw createAuthError(
      SESSION_COOKIE_ERROR_CODE,
      `Session endpoint responded with ${response.status}`
    );
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();

  try {
    await createSessionCookie(idToken);
  } catch (error) {
    await firebaseSignOut(auth);
    throw error;
  }

  return credential.user;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  photoURL?: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName, photoURL: photoURL || null });
  const idToken = await credential.user.getIdToken();

  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, displayName, photoURL }),
  });

  try {
    await createSessionCookie(idToken);
  } catch (error) {
    await firebaseSignOut(auth);
    throw error;
  }

  return credential.user;
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' });
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function getFriendlyAuthError(code: string): string {
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/insufficient-role': 'Access denied. Admin privileges required.',
    [SESSION_COOKIE_ERROR_CODE]:
      'Signed in with Firebase, but the server session could not be created. Check the Vercel Firebase Admin environment variables and redeploy.',
  };
  return errorMap[code] || 'An unexpected error occurred. Please try again.';
}
