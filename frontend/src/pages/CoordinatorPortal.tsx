import React, { useState } from "react";
import {
  Radio,
  RefreshCw,
  ShieldCheck,
  Check,
  CheckCircle2
} from "lucide-react";
import { ActiveSosAlert, PendingVolunteer } from "../types";

interface CoordinatorPortalProps {
  activeSosAlerts: ActiveSosAlert[];
  pendingVolunteers: PendingVolunteer[];
  onRefreshCoordinatorData: () => void;
  onAcknowledgeSos: (id: string) => Promise<void>;
  onResolveSos: (alert: ActiveSosAlert, resolutionNotes: string) => Promise<void>;
  onVerifyVolunteer: (userId: string) => Promise<void>;
}

export const CoordinatorPortal: React.FC<CoordinatorPortalProps> = ({
  activeSosAlerts,
  pendingVolunteers,
  onRefreshCoordinatorData,
  onAcknowledgeSos,
  onResolveSos,
  onVerifyVolunteer
}) => {
  const [resolveModalAlert, setResolveModalAlert] = useState<ActiveSosAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalAlert || !resolutionNotes) return;

    setIsResolving(true);
    try {
      await onResolveSos(resolveModalAlert, resolutionNotes);
      setResolveModalAlert(null);
      setResolutionNotes("");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span className="eyebrow-badge badge-crimson">
          <Radio size={12} />
          <span>Command & Emergency Dispatch</span>
        </span>
        <h1 className="portal-heading">
          Real-Time Crisis & Vetting Center
        </h1>
        <p className="portal-subtitle">
          Direct integration with RabbitMQ emergency queues, automated multi-tier escalation, and volunteer vetting.
        </p>
      </div>

      {/* Active SOS Incidents */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="section-title" style={{ color: "var(--accent-crimson)" }}>
          Active SOS Emergency Alerts ({activeSosAlerts.length})
        </h2>
        <button
          className="btn-island btn-island-ghost"
          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          onClick={onRefreshCoordinatorData}
          title="Refresh from PostgreSQL"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {activeSosAlerts.length === 0 ? (
        <div className="bezel-outer" style={{ marginBottom: "2.5rem" }}>
          <div className="bezel-inner" style={{ textAlign: "center", padding: "2.5rem" }}>
            <ShieldCheck size={48} color="var(--accent-emerald)" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ color: "#fff", fontSize: "1.3rem" }}>All Clear - No Active Emergencies</h3>
            <p style={{ color: "var(--text-muted)" }}>
              RabbitMQ queue <code>sos_queue</code> is clear. Automated multi-tier escalation stands by.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: "2.5rem" }}>
          {activeSosAlerts.map((alert) => (
            <div key={alert.id} className="sos-feed-item">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.3rem", color: "#fff" }}>{alert.seniorName}</span>
                  <span className="eyebrow-badge badge-crimson" style={{ margin: 0 }}>
                    Status: {alert.status} | Tier {alert.currentEscalationTier}
                  </span>
                </div>
                <div style={{ color: "#fca5a5", fontSize: "1.05rem", fontWeight: 600 }}>
                  Reason: {alert.reason}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  Phone: {alert.phone} | Address: {alert.address || "On profile"} | Triggered: {new Date(alert.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {alert.status === "TRIGGERED" && (
                  <button
                    className="btn-island btn-island-amber"
                    onClick={() => onAcknowledgeSos(alert.id)}
                  >
                    <span>Acknowledge</span>
                    <div className="btn-island-tray">
                      <Check size={18} />
                    </div>
                  </button>
                )}
                <button
                  className="btn-island btn-island-emerald"
                  onClick={() => setResolveModalAlert(alert)}
                >
                  <span>Resolve Incident</span>
                  <div className="btn-island-tray">
                    <CheckCircle2 size={18} />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Volunteer Vetting Queue */}
      <h2 className="section-title" style={{ marginBottom: "1rem" }}>
        Pending Volunteer Vetting ({pendingVolunteers.length})
      </h2>

      {pendingVolunteers.length === 0 ? (
        <div className="bezel-outer">
          <div className="bezel-inner" style={{ textAlign: "center", padding: "2.5rem" }}>
            <p style={{ color: "var(--text-muted)" }}>No unverified volunteer applications awaiting approval.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {pendingVolunteers.map((vol) => (
            <div key={vol.userId} className="volunteer-task-card">
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{vol.fullName}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Email: {vol.email} | Phone: {vol.phone} | Pincode: {vol.pincode}
                </div>
                <div style={{ color: "var(--accent-amber)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Languages Spoken: {vol.languagesSpoken || "English, Hindi"}
                </div>
              </div>

              <button
                className="btn-island btn-island-emerald"
                onClick={() => onVerifyVolunteer(vol.userId)}
              >
                <span>Approve & Verify</span>
                <div className="btn-island-tray">
                  <Check size={18} strokeWidth={2.5} />
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Resolve SOS Alert */}
      {resolveModalAlert && (
        <div className="modal-backdrop">
          <div className="bezel-outer modal-bezel-outer">
            <div className="bezel-inner">
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.5rem" }}>
                Resolve Emergency: {resolveModalAlert.seniorName}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Safety protocol requires logging resolution notes before closing an active incident.
              </p>

              <form onSubmit={handleConfirmResolve}>
                <div className="form-group-custom">
                  <label className="form-label-custom">Resolution Summary & Outcome</label>
                  <textarea
                    className="form-input-custom"
                    rows={4}
                    placeholder="e.g. Volunteer reached senior within 6 minutes. Family member Vikram informed. Senior is safe."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions-2col">
                  <button
                    type="button"
                    className="btn-island btn-island-ghost"
                    style={{ justifyContent: "center" }}
                    onClick={() => setResolveModalAlert(null)}
                    disabled={isResolving}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className="btn-island btn-island-emerald"
                    style={{ justifyContent: "center" }}
                    disabled={isResolving}
                  >
                    <span>{isResolving ? "Resolving..." : "Confirm Resolved"}</span>
                    <div className="btn-island-tray">
                      <Check size={18} strokeWidth={2.5} />
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
