"use client";
import { useState, useEffect, useRef } from "react";
import { Wordmark } from "@/components/wordmark";
import type { SessionUser } from "@/lib/auth";

type Props = {
  initialUser?: SessionUser | null;
  onFilterUserThrones?: (handle: string) => void;
};

export function SiteHeader({ initialUser, onFilterUserThrones }: Props) {
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for auth_error in query string
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("auth_error");
      if (errorParam) {
        setAuthError(errorParam);
        // Clean URL query param without full reload
        params.delete("auth_error");
        const newSearch = params.toString() ? `?${params.toString()}` : "";
        window.history.replaceState({}, "", `${window.location.pathname}${newSearch}`);
      }
    }

    // Fetch latest user session
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
        else setUser(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleSignIn = () => {
    setSigningIn(true);
    const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    window.location.assign(`/api/auth/x/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMenuOpen(false);
      window.location.reload();
    } catch {
      window.location.assign("/api/auth/logout");
    }
  };

  return (
    <header className="site-header">
      <div className="header-row">
        <Wordmark />

        <nav className="nav" aria-label="Primary">
          <a href="/rules">Rules</a>
          <span>·</span>
          <a href="/how">How it works</a>
          <span>·</span>

          {user ? (
            <div className="user-menu-container" ref={menuRef}>
              <button
                type="button"
                className="user-profile-button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {user.xAvatarUrl ? (
                  <img
                    src={user.xAvatarUrl}
                    alt={`@${user.xHandle}`}
                    className="user-avatar-img"
                    width={20}
                    height={20}
                  />
                ) : (
                  <span className="user-avatar-fallback">
                    {user.xHandle.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="user-handle-text">@{user.xHandle}</span>
                <span className="user-menu-chevron" aria-hidden="true">▾</span>
              </button>

              {menuOpen && (
                <div className="user-dropdown-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      if (onFilterUserThrones) {
                        onFilterUserThrones(user.xHandle);
                      } else {
                        window.location.assign(`/?filter=${encodeURIComponent(user.xHandle)}`);
                      }
                    }}
                  >
                    Your thrones
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-item dropdown-item-signout"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="x-signin-link"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? "Connecting..." : "Sign in with X"}
            </button>
          )}
        </nav>
      </div>
      {authError && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.5rem 0.75rem",
          background: "#fee2e2",
          border: "1px solid #f87171",
          borderRadius: "6px",
          color: "#991b1b",
          fontSize: "0.825rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem"
        }}>
          <span>
            <strong>Twitter sign-in notice:</strong> {
              authError === "missing_client_id" ? "X_CLIENT_ID is not configured in Vercel." :
              authError === "token_exchange_failed" ? "Twitter token exchange failed. Check that callback URL is set to https://unpaidking.lol/api/auth/x/callback in Twitter Developer portal." :
              authError === "cancelled" ? "Sign in was cancelled." :
              authError === "state_mismatch" ? "Session verification failed. Please try signing in again." :
              authError === "missing_code_or_state" ? "Twitter did not complete the sign-in. Please try again." :
              authError === "profile_fetch_failed" ? "Couldn't load your Twitter profile. Please try again." :
              authError === "server_exception" ? "An unexpected error occurred. Please try again." :
              `Authentication error (${authError}).`
            }
          </span>

          <button
            type="button"
            onClick={() => setAuthError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: "bold" }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <p className="tagline">They already sit on the throne. They never paid.</p>
    </header>
  );
}
