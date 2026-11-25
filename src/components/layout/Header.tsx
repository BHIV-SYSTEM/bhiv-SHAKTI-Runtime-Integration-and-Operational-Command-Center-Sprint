import { useState, useEffect } from "react";
import { Bell, Activity, LogIn, LogOut, RefreshCw } from "lucide-react";
import { useDashboardConfig } from "@/components/dashboard/DashboardProvider";
import { useAuth } from "@/hooks/useAuth";

function deriveUserInitials(email: string | null, userId: string): string {
  const source = email ? email.split("@")[0] : userId;
  const cleaned = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 2) || "AU";
}

export default function Header() {
  const { branding, features } = useDashboardConfig();
  const {
    status,
    user,
    isAuthenticated,
    isGuest,
    isAccessDenied,
    login,
    logout,
    refreshSession,
  } = useAuth();

  const [time, setTime] = useState(new Date());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const LogoIcon = branding.logoIcon ?? Activity;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  let avatarInitials: string;
  let avatarClass: string;
  let primaryLabel: string;
  let secondaryLabel: string;

  if (status === "loading") {
    avatarInitials = "…";
    avatarClass = "bg-slate-800 text-slate-400 animate-pulse";
    primaryLabel = "Verifying Session";
    secondaryLabel = "Loading…";
  } else if (isAccessDenied) {
    avatarInitials = "403";
    avatarClass = "bg-red-600/80 text-white";
    primaryLabel = "Access Denied";
    secondaryLabel = "Unauthorized App";
  } else if (isAuthenticated && user && !user.isGuest) {
    avatarInitials = deriveUserInitials(user.email, user.user_id);
    avatarClass = "bg-indigo-600 text-white";
    primaryLabel = user.email ?? user.user_id;
    secondaryLabel =
      user.roles.length > 0
        ? user.roles.join(", ").toUpperCase()
        : "AUTHENTICATED";
  } else if (isGuest) {
    avatarInitials = branding.operatorInitials || "GU";
    avatarClass = "bg-slate-700 text-amber-300 border border-amber-500/30";
    primaryLabel = branding.operatorLabel || "Guest";
    secondaryLabel = branding.roleLabel || "Read-Only";
  } else if (status === "error") {
    avatarInitials = "!";
    avatarClass = "bg-amber-600/80 text-white";
    primaryLabel = "Auth Unavailable";
    secondaryLabel = "Read-Only";
  } else {
    avatarInitials = "SO";
    avatarClass = "bg-slate-700 text-slate-300";
    primaryLabel = "Signed Out";
    secondaryLabel = "Read-Only";
  }

  return (
    <header className="bg-slate-900 border-b border-slate-700/60 px-4 py-2.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <LogoIcon size={18} className="text-amber-400" />
          <span className="text-[21px] font-bold text-slate-100 tracking-tight">
            {branding.systemName}
          </span>
        </div>
        <span className="text-slate-600 text-sm hidden sm:block">|</span>
        <span className="text-[13px] text-slate-400 hidden sm:block">
          {branding.subtitle}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {features.liveBadge && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold">LIVE</span>
          </div>
        )}

        {features.clock && (
          <div className="text-right hidden md:block">
            <p className="text-xs font-mono text-slate-300">
              {time.toLocaleTimeString("en-IN")}
            </p>
            <p className="text-xs text-slate-600">
              {time.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        {features.notifications && (
          <button
            className="relative text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        )}

        {features.userMenu && (
          <div className="flex items-center gap-2.5" data-testid="auth-session-badge">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${avatarClass}`}
              title={
                isAuthenticated && user?.tenant_id
                  ? `Tenant: ${user.tenant_id}`
                  : secondaryLabel
              }
            >
              <span className="text-[10px] font-bold">{avatarInitials}</span>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-300 max-w-[180px] truncate">
                {primaryLabel}
              </p>
              <p className="text-xs text-slate-500">{secondaryLabel}</p>
            </div>

            {status === "loading" ? null : isAuthenticated || isAccessDenied ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="ml-1 inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                aria-label="Logout"
              >
                <LogOut size={12} />
                <span>{isLoggingOut ? "Signing out…" : "Logout"}</span>
              </button>
            ) : status === "error" ? (
              <button
                type="button"
                onClick={() => void refreshSession()}
                className="ml-1 inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors"
                aria-label="Retry session check"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  login();
                }}
                className="ml-1 inline-flex items-center gap-1 rounded border border-indigo-500/40 bg-indigo-600/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                aria-label="Sign in with BHIV Core"
              >
                <LogIn size={12} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
