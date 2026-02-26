"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    signUp,
    signInWithGoogle,
    needsOnboarding,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  // After successful auth, redirect based on onboarding status
  useEffect(() => {
    if (!authLoading && needsOnboarding) {
      router.push("/onboarding");
    }
  }, [needsOnboarding, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      return;
    }

    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }

    setSubmitting(true);

    try {
      await signUp(email, password, displayName);
      // Redirect handled in useEffect below after userData loads
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Энэ и-мэйл хаяг бүртгэлтэй байна");
      } else if (err.code === "auth/invalid-email") {
        setError("И-мэйл хаяг буруу байна");
      } else if (err.code === "auth/weak-password") {
        setError("Нууц үг хэт богино байна");
      } else {
        setError("Бүртгүүлэхэд алдаа гарлаа");
      }
    }

    setSubmitting(false);
  }

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);

    try {
      await signInWithGoogle();
      // Redirect handled in useEffect below after userData loads
    } catch (err: any) {
      console.error(err);
      setError("Google-ээр бүртгүүлэхэд алдаа гарлаа");
    }

    setSubmitting(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🏀</div>
          <h1>Бүртгүүлэх</h1>
          <p>SAIN Girls League-д нэгдээрэй</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Google Sign Up - Голд */}
        <button
          type="button"
          className="auth-btn google-main"
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google-ээр бүртгүүлэх
        </button>

        <div className="auth-divider">
          <span>эсвэл и-мэйлээр</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">Нэр</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Таны нэр"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">И-мэйл</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Нууц үг</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Нууц үг баталгаажуулах</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn primary"
            disabled={submitting}
          >
            {submitting ? "Бүртгүүлж байна..." : "Бүртгүүлэх"}
          </button>
        </form>

        <p className="auth-footer">
          Бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
