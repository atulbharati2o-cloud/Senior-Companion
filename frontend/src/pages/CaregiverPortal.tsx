import React, { useState } from "react";
import {
  Users,
  ArrowRight,
  Copy,
  CheckCircle2,
  PhoneCall,
  Heart,
  Share2,
  Check,
  UserPlus
} from "lucide-react";
import { MasterSchedule, LinkedSenior } from "../types";

interface CaregiverPortalProps {
  parentName: string;
  setParentName: (val: string) => void;
  parentPhone: string;
  setParentPhone: (val: string) => void;
  isInviting: boolean;
  inviteResult: { pairingCode: string; smsInviteText: string; parentName?: string } | null;
  copiedInvite: boolean;
  onGenerateInvite: (e: React.FormEvent) => void;
  onCopyInvite: () => void;
  adherenceRate: number;
  takenCount: number;
  totalDoses: number;
  masterSchedules: MasterSchedule[];
  linkedSenior?: LinkedSenior | null;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({
  parentName,
  setParentName,
  parentPhone,
  setParentPhone,
  isInviting,
  inviteResult,
  copiedInvite,
  onGenerateInvite,
  onCopyInvite,
  adherenceRate,
  takenCount,
  totalDoses,
  masterSchedules,
  linkedSenior
}) => {
  const [copiedPin, setCopiedPin] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Active senior parent and pairing code
  const activePin = inviteResult?.pairingCode || linkedSenior?.pairingCode || "8421";
  const activeParentName = inviteResult?.parentName || linkedSenior?.fullName || "Mrs. Shanti Devi";
  const activeParentPhone = parentPhone || linkedSenior?.phone || "+91 98200 11223";

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! I set up Community Companion for you. Open the app on your phone or tablet and enter your 4-digit code: ${activePin} to start.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const pinDigits = activePin.padStart(4, "0").slice(0, 4).split("");

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span className="eyebrow-badge badge-indigo">
          <Users size={12} />
          <span>Family Caregiver Command</span>
        </span>
        <h1 className="portal-heading">
          Keep Your Parents Safe & Connected
        </h1>
        <p className="portal-subtitle">
          Monitor your parent's live medication adherence, share their passwordless 4-digit PIN, and oversee emergency safety contacts.
        </p>
      </div>

      <div className="portal-grid-2col">
        {/* Left Column: Senior Parent Connection & PIN Hub */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 1: Live Parent Pairing PIN Card */}
          <div className="bezel-outer" style={{ borderColor: "rgba(245, 158, 11, 0.35)" }}>
            <div className="bezel-inner" style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(99, 102, 241, 0.05))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                    <Heart size={16} color="var(--accent-amber)" fill="currentColor" />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-amber)" }}>
                      Connected Senior Parent
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.45rem", color: "#fff", fontWeight: 800 }}>
                    {activeParentName}
                  </h2>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    Phone: {activeParentPhone} • {linkedSenior?.preferredLanguage || "Hindi"} Voice Profile
                  </div>
                </div>

                <span className="eyebrow-badge badge-emerald" style={{ margin: 0, padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}>
                  <CheckCircle2 size={12} />
                  <span>Linked & Active</span>
                </span>
              </div>

              {/* 4-Digit Numeric PIN Highlight */}
              <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(245, 158, 11, 0.25)", marginBottom: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem", fontWeight: 600 }}>
                  Senior 4-Digit Login Pairing Code
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                  {pinDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: "56px",
                        height: "64px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        fontWeight: 900,
                        color: "var(--accent-amber)",
                        background: "rgba(245, 158, 11, 0.12)",
                        border: "2px solid rgba(245, 158, 11, 0.4)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)"
                      }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", maxWidth: "380px", margin: "0 auto 1rem auto" }}>
                  Your parent simply enters this <strong>4-digit code</strong> on their phone or tablet to log in with zero passwords.
                </p>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn-island btn-island-amber"
                    style={{ fontSize: "0.84rem", padding: "0.5rem 1rem", fontWeight: 700 }}
                    onClick={() => handleCopyPin(activePin)}
                  >
                    {copiedPin ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedPin ? "PIN Copied!" : `Copy PIN: ${activePin}`}</span>
                  </button>

                  <button
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.84rem", padding: "0.5rem 1rem", borderColor: "rgba(37, 211, 102, 0.4)", color: "#86efac" }}
                    onClick={handleShareWhatsApp}
                  >
                    <Share2 size={15} />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Toggle to Generate New Parent PIN */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
                <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  Need to connect another parent or change phone?
                </span>
                <button
                  type="button"
                  className="btn-island btn-island-ghost"
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                  onClick={() => setShowInviteForm(!showInviteForm)}
                >
                  <UserPlus size={14} />
                  <span>{showInviteForm ? "Hide Generator" : "Generate New PIN"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Generate New PIN / Invite Form (shown on toggle or if no parent) */}
          {(showInviteForm || !activePin) && (
            <div className="bezel-outer">
              <div className="bezel-inner">
                <h3 style={{ fontSize: "1.25rem", color: "#fff", marginBottom: "0.4rem" }}>
                  Generate New Parent Pairing PIN
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                  Enter your parent's phone number to generate a fresh 4-digit code and SMS invite.
                </p>

                <form onSubmit={onGenerateInvite}>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Senior Parent's Name</label>
                    <input
                      className="form-input-custom"
                      type="text"
                      placeholder="e.g. Mrs. Sunita Rao"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Parent's Mobile Number</label>
                    <input
                      className="form-input-custom"
                      type="tel"
                      placeholder="e.g. +91 98200 12345"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-island btn-island-amber"
                    style={{ width: "100%", justifyContent: "center" }}
                    disabled={isInviting}
                    type="submit"
                  >
                    <span>{isInviting ? "Generating PIN..." : "Create 4-Digit Pairing Invite"}</span>
                    <div className="btn-island-tray">
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </div>
                  </button>
                </form>

                {inviteResult && (
                  <div style={{ marginTop: "1.25rem", padding: "1.1rem", background: "rgba(245, 158, 11, 0.08)", borderRadius: "1rem", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: "0.88rem" }}>New PIN Generated</span>
                      <span style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.2em", color: "#fff" }}>
                        {inviteResult.pairingCode}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      "{inviteResult.smsInviteText}"
                    </p>
                    <button
                      className="btn-island btn-island-ghost"
                      style={{ width: "100%", justifyContent: "center", padding: "0.5rem", fontSize: "0.82rem" }}
                      onClick={onCopyInvite}
                    >
                      <Copy size={15} />
                      <span>{copiedInvite ? "Copied to Clipboard!" : "Copy SMS Text"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Senior Adherence & Emergency Tiers */}
        <div className="bezel-outer">
          <div className="bezel-inner">
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.5rem" }}>
              Adherence & Safety Status
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Live oversight of medications and emergency contacts configured in PostgreSQL.
            </p>

            <div className="adherence-score-box">
              <div className="score-big-number">{adherenceRate}%</div>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "1.1rem" }}>
                  {adherenceRate >= 80 ? "Doses On Schedule" : "Attention Recommended"}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {takenCount} of {totalDoses} doses acknowledged today. Escalation engine stands by.
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "1.15rem", color: "#fff", marginBottom: "0.85rem" }}>
              Master Prescriptions Roster ({masterSchedules.length})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", maxHeight: "280px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {masterSchedules.length === 0 ? (
                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
                  No medication reminders configured yet.
                </div>
              ) : (
                masterSchedules.map((m) => (
                  <div key={m.id} style={{ padding: "0.85rem 1rem", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff" }}>{m.medicineName} ({m.dosage})</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Times: {m.targetTimes?.join(", ")} | {m.mealRelation.replace("_", " ")}</div>
                    </div>
                    <CheckCircle2 size={18} color="var(--accent-emerald)" />
                  </div>
                ))
              )}
            </div>

            <h3 style={{ fontSize: "1.15rem", color: "#fff", marginBottom: "0.85rem" }}>Emergency Contact Roster</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow-badge badge-crimson" style={{ marginBottom: "0.25rem" }}>Tier 1 (Instant Call + SMS)</span>
                  <div style={{ fontWeight: 700, color: "#fff" }}>Priya Rao (Daughter)</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>+91 98111 22233</div>
                </div>
                <PhoneCall size={20} color="var(--accent-crimson)" />
              </div>

              <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow-badge badge-amber" style={{ marginBottom: "0.25rem" }}>Tier 2 (Fallback + Missed Dose)</span>
                  <div style={{ fontWeight: 700, color: "#fff" }}>Vikram Rao (Son)</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>+91 98444 55566</div>
                </div>
                <PhoneCall size={20} color="var(--accent-amber)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
