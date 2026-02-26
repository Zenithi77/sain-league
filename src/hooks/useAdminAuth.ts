"use client";

/**
 * useAdminAuth.ts
 *
 * Client-side hook that checks whether the current user has admin privileges.
 * It reads both:
 *   1. Firebase custom claim `admin === true` (via getIdTokenResult)
 *   2. Firestore `users/{uid}.role === 'admin'` (via AuthContext)
 *
 * Returns `{ isAdmin, loading }`.
 * If the user is not admin and `redirectTo` is set, navigates away.
 *
 * Usage:
 *   const { isAdmin, loading } = useAdminAuth({ redirectTo: '/' });
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

interface UseAdminAuthOptions {
  /** Path to redirect non-admin users to. If omitted, no redirect occurs. */
  redirectTo?: string;
}

interface UseAdminAuthResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminAuth(
  options: UseAdminAuthOptions = {},
): UseAdminAuthResult {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [claimChecked, setClaimChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function checkAdmin() {
      let admin = false;

      // 1. Check Firestore role from AuthContext
      if (userData?.role === "admin") {
        admin = true;
      }

      // 2. Check Firebase custom claim (more authoritative)
      if (!admin && auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(
            /* forceRefresh */ false,
          );
          if (tokenResult.claims.admin === true) {
            admin = true;
          }
        } catch {
          // Token check failed — fall through to Firestore role
        }
      }

      setIsAdmin(admin);
      setClaimChecked(true);

      // Redirect non-admin users
      if (!admin && options.redirectTo) {
        router.push(options.redirectTo);
      }
    }

    if (user) {
      checkAdmin();
    } else {
      // Not logged in at all
      setIsAdmin(false);
      setClaimChecked(true);
      if (options.redirectTo) {
        router.push("/login");
      }
    }
  }, [user, userData, authLoading, options.redirectTo, router]);

  return {
    isAdmin,
    loading: authLoading || !claimChecked,
  };
}
