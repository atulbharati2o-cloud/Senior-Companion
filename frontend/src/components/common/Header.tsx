import React from "react";
import {
  Heart,
  Users,
  ShieldCheck,
  Activity,
  User,
  LogIn,
  LogOut,
  Home
} from "lucide-react";
import { AuthTokens, ActiveSession, PortalTab } from "../../types";

interface HeaderProps {
  activeTab: PortalTab;
  setActiveTab: (tab: PortalTab) => void;
  auth: AuthTokens;
  activeSession?: ActiveSession | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onGoToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  auth,
  activeSession,
  onOpenAuthModal,
  onLogout,
  onGoToLanding
}) => {
  // Determine current active display profile
  let activeProfileLabel = "Guest / Sign In";
  let activeRoleBadge = "Guest";
  if (activeSession) {
    activeProfileLabel = activeSession.userName;
    activeRoleBadge =
      activeSession.role === "SENIOR"
        ? "Senior"
        : activeSession.role === "FAMILY"
        ? "Caregiver"
        : activeSession.role === "VOLUNTEER"
        ? "Volunteer"
        : "Coordinator";
  } else if (auth.seniorName) {
    activeProfileLabel = auth.seniorName;
    activeRoleBadge = "Senior";
  }

  const hasAnyAuth = Boolean((activeSession && activeSession.token) || auth.seniorToken);

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Identity with Home Navigation */}
        <div
          className="brand-wrapper"
          onClick={onGoToLanding}
          style={{ cursor: onGoToLanding ? "pointer" : "default" }}
          title={onGoToLanding ? "Return to Landing Page" : undefined}
        >
          <div className="brand-badge">
            <Heart size={24} fill="#0b1120" strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-title">Community Companion</div>
            <div className="brand-tagline">Elder Care & Safety Network</div>
          </div>
        </div>

        {/* Floating Island Portal Tabs */}
        <nav className="view-tabs" role="tablist">
          <button
            className={`view-tab ${activeTab === "senior" ? "active senior-tab" : ""}`}
            onClick={() => setActiveTab("senior")}
          >
            <Heart size={16} strokeWidth={2} />
            <span>Senior Citizen</span>
          </button>
          <button
            className={`view-tab ${activeTab === "caregiver" ? "active caregiver-tab" : ""}`}
            onClick={() => setActiveTab("caregiver")}
          >
            <Users size={16} strokeWidth={2} />
            <span>Caregiver Hub</span>
          </button>
          <button
            className={`view-tab ${activeTab === "volunteer" ? "active volunteer-tab" : ""}`}
            onClick={() => setActiveTab("volunteer")}
          >
            <ShieldCheck size={16} strokeWidth={2} />
            <span>Volunteer Network</span>
          </button>
          <button
            className={`view-tab ${activeTab === "coordinator" ? "active coordinator-tab" : ""}`}
            onClick={() => setActiveTab("coordinator")}
          >
            <Activity size={16} strokeWidth={2} />
            <span>Coordinator Dispatch</span>
          </button>
        </nav>

        {/* Right Header Actions: Status, Account & Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {onGoToLanding && (
            <button
              className="btn-island btn-island-ghost"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", gap: "0.35rem" }}
              onClick={onGoToLanding}
              title="Return to Public Landing Page"
            >
              <Home size={14} />
              <span>Landing Page</span>
            </button>
          )}

          <div className="system-status-pill">
            <div className="status-dot-pulse" />
            <span>Network Online</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              className="btn-island btn-island-ghost"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem", gap: "0.45rem" }}
              onClick={onOpenAuthModal}
              title="Switch user or profile"
            >
              <User size={14} color="var(--accent-amber)" />
              <span style={{ fontWeight: 700, color: "#fff" }}>
                {activeProfileLabel}
              </span>
              <span className="eyebrow-badge badge-amber" style={{ margin: 0, padding: "0.15rem 0.45rem", fontSize: "0.62rem" }}>
                {activeRoleBadge}
              </span>
            </button>

            {hasAnyAuth ? (
              <button
                className="btn-island"
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.8rem",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  gap: "0.35rem"
                }}
                onClick={onLogout}
                title="Sign out of current profile"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                className="btn-island btn-island-amber"
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", gap: "0.45rem" }}
                onClick={onOpenAuthModal}
                title="Sign in with 4-digit pairing code or password"
              >
                <LogIn size={15} />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
