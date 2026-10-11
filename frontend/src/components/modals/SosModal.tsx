import React from "react";
import { AlertTriangle, PhoneCall, X, ShieldAlert } from "lucide-react";
import { EmergencyContact } from "../../types";

interface SosModalProps {
  isOpen: boolean;
  sosCountdown: number;
  sosDispatched: boolean;
  contacts?: EmergencyContact[];
  onCancel: () => void;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  sosCountdown,
  sosDispatched,
  contacts = [],
  onCancel,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="bezel-outer bezel-outer-crimson modal-bezel-outer">
        <div className="bezel-inner bezel-inner-crimson" style={{ textAlign: "center" }}>
          <span className="eyebrow-badge badge-crimson">
            <AlertTriangle size={12} />
            <span>Emergency Multi-Tier Dispatch</span>
          </span>

          <h2 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>
            {sosDispatched ? "Emergency Help Dispatched!" : "Alerting Emergency Contacts"}
          </h2>

          <p style={{ color: "#fca5a5", fontSize: "1.1rem" }}>
            {sosDispatched
              ? "Family contacts have been alerted via phone and nearby volunteers have received your address."
              : "If this was pressed by accident, click Cancel within the countdown."}
          </p>

          {!sosDispatched && <div className="sos-countdown-giant">{sosCountdown}</div>}

          {sosDispatched ? (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.25rem", textAlign: "left", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--accent-amber)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <PhoneCall size={16} />
                  <span>Speed Dial Emergency Direct Calls</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {/* Real Emergency Contacts from PostgreSQL */}
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <a
                        key={contact.id}
                        href={`tel:${contact.phone}`}
                        className={`btn-island ${contact.priorityTier === 1 ? "btn-island-crimson" : "btn-island-amber"}`}
                        style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", padding: "0.85rem 1.15rem" }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                            Call {contact.name} {contact.relationship ? `(${contact.relationship})` : ""}
                          </div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                            {contact.phone} • Tier {contact.priorityTier} ({contact.priorityTier === 1 ? "Primary Emergency" : "Secondary Fallback"})
                          </div>
                        </div>
                        <div className="btn-island-tray">
                          <PhoneCall size={18} strokeWidth={2.5} />
                        </div>
                      </a>
                    ))
                  ) : null}

                  {/* 112 National Helpline (Always available) */}
                  <a
                    href="tel:112"
                    className="btn-island"
                    style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", background: "#b91c1c", color: "#fff", padding: "0.85rem 1.15rem", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>National Emergency Helpline</div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>Dial 112 • Police / Medical Ambulance Dispatch</div>
                    </div>
                    <div className="btn-island-tray">
                      <AlertTriangle size={18} strokeWidth={2.5} />
                    </div>
                  </a>

                  {contacts.length === 0 && (
                    <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(239, 68, 68, 0.4)", display: "flex", alignItems: "center", gap: "0.5rem", color: "#fca5a5", fontSize: "0.84rem" }}>
                      <ShieldAlert size={16} />
                      <span>Nearby community volunteers and NGO dispatch coordinators have been automatically notified.</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn-island btn-island-ghost"
                style={{ justifyContent: "center", width: "100%" }}
                onClick={onClose}
              >
                <span>Close Emergency Window</span>
              </button>
            </div>
          ) : (
            <div style={{ marginTop: "2rem" }}>
              <button
                className="btn-island btn-island-crimson"
                style={{ justifyContent: "center", width: "100%", padding: "1rem" }}
                onClick={onCancel}
              >
                <span>CANCEL EMERGENCY ALERT</span>
                <div className="btn-island-tray">
                  <X size={20} strokeWidth={3} />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
