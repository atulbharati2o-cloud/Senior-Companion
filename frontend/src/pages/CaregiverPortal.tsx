import React from "react";
import {
  Users,
  ArrowRight,
  Copy,
  CheckCircle2,
  PhoneCall
} from "lucide-react";
import { MasterSchedule } from "../types";

interface CaregiverPortalProps {
  parentName: string;
  setParentName: (val: string) => void;
  parentPhone: string;
  setParentPhone: (val: string) => void;
  isInviting: boolean;
  inviteResult: { pairingCode: string; smsInviteText: string } | null;
  copiedInvite: boolean;
  onGenerateInvite: (e: React.FormEvent) => void;
  onCopyInvite: () => void;
  adherenceRate: number;
  takenCount: number;
  totalDoses: number;
  masterSchedules: MasterSchedule[];
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
  masterSchedules
}) => {
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
          Monitor adherence from anywhere, invite parents with a simple SMS code, and manage emergency multi-tier contacts.
        </p>
      </div>

      <div className="portal-grid-2col">
        {/* Left Column: Parent Invite Generator */}
        <div className="bezel-outer">
          <div className="bezel-inner">
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.5rem" }}>
              Send Parent Invitation Code
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Enter your parent's phone number to generate a passwordless 4-digit pairing code sent via SMS.
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
                <span>{isInviting ? "Generating Code..." : "Create 4-Digit Pairing Invite"}</span>
                <div className="btn-island-tray">
                  <ArrowRight size={18} strokeWidth={2.5} />
                </div>
              </button>
            </form>

            {inviteResult && (
              <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "rgba(245, 158, 11, 0.08)", borderRadius: "1rem", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>Pairing Code Generated</span>
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.2em", color: "#fff" }}>
                    {inviteResult.pairingCode}
                  </span>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                  "{inviteResult.smsInviteText}"
                </p>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ width: "100%", justifyContent: "center", padding: "0.5rem" }}
                  onClick={onCopyInvite}
                >
                  <Copy size={16} />
                  <span>{copiedInvite ? "Copied to Clipboard!" : "Copy SMS Text"}</span>
                </button>
              </div>
            )}
          </div>
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
