"use client";

/**
 * SignInPage  —  /(auth)/sign-in
 *
 * Route-level entry point for the admin sign-in flow.
 *
 * ── Design pattern: thin page + form component ───────────────────────
 * This file intentionally contains no UI or logic of its own.
 * All sign-in behaviour — email/password fields, form validation,
 * Firebase Auth call, error messages, and redirect — is encapsulated
 * in <SignInForm />.
 *
 * Keeping the page file thin makes it easy to:
 *   - Swap the form implementation without touching the route config.
 *   - Add page-level middleware (e.g. redirect if already authenticated)
 *     in one place without coupling it to the form component.
 *
 * ── Related files ─────────────────────────────────────────────────────
 *  components/auth/SignInForm.tsx  — full sign-in form implementation
 *  app/(auth)/sign-up/page.tsx     — sister page for new account creation
 */

import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  // Delegate all rendering to the reusable SignInForm component.
  return <SignInForm />;
}
