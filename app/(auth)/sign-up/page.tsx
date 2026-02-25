"use client";

/**
 * SignUpPage  —  /(auth)/sign-up
 *
 * Route-level entry point for the admin account-creation flow.
 *
 * ── Design pattern: thin page + form component ───────────────────────
 * This file intentionally contains no UI or logic of its own.
 * All sign-up behaviour — display name, email, password + confirm fields,
 * password strength indicator, Firebase Auth `createUserWithEmailAndPassword`
 * call, Firestore user document creation, error handling, and redirect after
 * success — is fully encapsulated in <SignUpForm />.
 *
 * Keeping this page thin ensures:
 *   - The route definition remains separate from the UI implementation.
 *   - SignUpForm can be unit-tested independently of the route.
 *   - Any page-level concerns (e.g. pre-auth redirect, layout overrides)
 *     can be added here without touching the form logic.
 *
 * ── Related files ─────────────────────────────────────────────────────
 *  components/auth/SignUpForm.tsx          — full sign-up form implementation
 *  components/auth/PasswordStrengthBar.tsx — visual password strength indicator
 *  app/(auth)/sign-in/page.tsx             — sister page for existing users
 */

import SignUpForm from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  // Delegate all rendering to the reusable SignUpForm component.
  return <SignUpForm />;
}
