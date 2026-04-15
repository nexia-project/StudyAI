/**
 * Compatibility hook — wraps @clerk/react to provide the same interface
 * that the old @workspace/replit-auth-web `useAuth` hook provided.
 * This keeps changes to individual pages minimal.
 */
import { useAuth, useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";

export interface StudyUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export function useStudyAuth() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  const mappedUser: StudyUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profileImageUrl: user.imageUrl ?? undefined,
      }
    : null;

  function login() {
    // Save current path so we can return after login
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const current = window.location.pathname;
      const path = current.startsWith(base) ? current.slice(base.length) : current;
      sessionStorage.setItem("auth_return_to", path || "/app");
    } catch {
      // private browsing
    }
    navigate("/sign-in");
  }

  function logout() {
    signOut();
  }

  return {
    user: mappedUser,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
    login,
    logout,
  };
}
