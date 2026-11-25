import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import { useNetworkState } from "@/hooks/useNetworkState";
import { useAuth } from "@/hooks/useAuth";
import { WifiOff, ShieldAlert, AlertTriangle } from "lucide-react";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import type { DashboardConfigOverride } from "@/types/dashboard.types";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Partial config overrides — deep-merged with defaults */
  config?: DashboardConfigOverride;
}

export default function DashboardLayout({ children, config }: DashboardLayoutProps) {
  const { isOnline } = useNetworkState();
  const { status, isAccessDenied, deniedEmail, error, logout, refreshSession } = useAuth();

  return (
    <DashboardProvider config={config}>
      <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
        {!isOnline && (
          <div className="bg-red-500/20 text-red-100 text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-b border-red-500/30 font-medium">
            <WifiOff size={14} className="animate-pulse" />
            System Offline — Dashboard is running on cached data. Reconnecting...
          </div>
        )}

        {status === "error" && !isAccessDenied && (
          <div
            role="status"
            className="bg-amber-500/15 text-amber-100 text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-b border-amber-500/30 font-medium"
          >
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>
              Central authentication unavailable — viewing read-only operational telemetry. Protected actions are disabled.
            </span>
          </div>
        )}

        <Header />

        {isAccessDenied ? (
          <main className="flex-1 flex items-center justify-center p-6">
            <section
              role="alert"
              aria-label="Application Access Denied"
              className="max-w-lg w-full rounded-lg border border-red-500/40 bg-slate-900/90 p-6 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold text-slate-100">
                  Access Denied to NIYANTRAN KENDRA
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {error?.message ||
                    "Your account is not authorized to access the niyantran application."}
                </p>
                {deniedEmail && (
                  <p className="text-xs font-mono text-slate-500">
                    Signed in as: {deniedEmail}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3.5 py-1.5 text-xs font-medium text-slate-100 transition-colors"
                >
                  Sign Out &amp; Return to Guest Mode
                </button>
                <button
                  type="button"
                  onClick={() => void refreshSession()}
                  className="rounded bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  Re-check Access
                </button>
              </div>
            </section>
          </main>
        ) : (
          <main className="flex-1 overflow-auto p-3">{children}</main>
        )}
      </div>
    </DashboardProvider>
  );
}
