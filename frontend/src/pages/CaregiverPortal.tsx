import React, { useState } from "react";
import {
  Users,
  ArrowRight,
  Copy,
  CheckCircle2,
  Heart,
  Share2,
  Check,
  UserPlus,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Bell,
  Clock,
  Plus,
  AlertTriangle
} from "lucide-react";
import { MasterSchedule, LinkedSenior, DoseOccurrence } from "../types";

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
  doses: DoseOccurrence[];
  masterSchedules: MasterSchedule[];
  linkedSenior?: LinkedSenior | null;
  onPairWithCode: (code: string) => Promise<void>;
  isPairing: boolean;
  onScheduleMedicine: (payload: {
    medicineName: string;
    dosage: string;
    targetTimes: string[];
    mealRelation: string;
    instructions?: string;
  }) => Promise<void>;
  isScheduling: boolean;
  notifPermission: NotificationPermission;
  onRequestNotifPermission: () => void;
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
  doses,
  masterSchedules,
  linkedSenior,
  onPairWithCode,
  isPairing,
  onScheduleMedicine,
  isScheduling,
  notifPermission,
  onRequestNotifPermission
}) => {
  const [copiedPin, setCopiedPin] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [connectTab, setConnectTab] = useState<"code" | "invite">("code");
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [targetTime, setTargetTime] = useState("09:00");
  const [mealRelation, setMealRelation] = useState("AFTER_MEAL");
  const [instructions, setInstructions] = useState("");

  const isConnected = Boolean(linkedSenior || inviteResult);
  const activePin = inviteResult?.pairingCode || linkedSenior?.pairingCode;
  const activeParentName = inviteResult?.parentName || linkedSenior?.fullName;
  const activeParentPhone = parentPhone || linkedSenior?.phone;

  const missedDoses = doses.filter((d) => {
    if (d.status === "ACKNOWLEDGED") return false;
    if (!d.scheduledTimestamp) return false;
    return d.scheduledTimestamp < Date.now();
  });
  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleShareWhatsApp = (pin: string) => {
    const text = encodeURIComponent(
      `Hello! I set up Community Companion for you. Open the app on your phone or tablet and enter your 4-digit code: ${pin} to start.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairCodeInput.trim().length === 4) {
      await onPairWithCode(pairCodeInput.trim());
      setPairCodeInput("");
      setShowPairModal(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim() || !dosage.trim() || !targetTime) return;
    await onScheduleMedicine({
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      targetTimes: [targetTime],
      mealRelation,
      instructions: instructions.trim() || undefined
    });
    setMedicineName("");
    setDosage("");
    setInstructions("");
  };

  const pinDigits = activePin ? activePin.padStart(4, "0").slice(0, 4).split("") : [];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span className="eyebrow-badge badge-indigo">
          <Users size={12} />
          <span>Family Caregiver</span>
        </span>
        <h1 className="portal-heading">
          Schedule Medicines for Your Parent
        </h1>
        <p className="portal-subtitle">
          Add the times your parent should take medicine. You will be notified here if they miss the alarm or do not confirm they took it.
        </p>
      </div>

      {missedDoses.length > 0 && (
        <div className="bezel-outer bezel-outer-amber" style={{ marginBottom: "1.5rem" }}>
          <div
            className="bezel-inner bezel-inner-amber"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "1.15rem 1.4rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <AlertTriangle size={22} color="var(--accent-amber)" />
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                  {missedDoses.length} missed dose{missedDoses.length > 1 ? "s" : ""} — parent has not confirmed
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  {missedDoses.map((d) => `${d.medicineName} at ${d.time}`).join(" · ")}. Please check in with {activeParentName || "your parent"}.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portal-grid-2col">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {isConnected ? (
            <div className="bezel-outer" style={{ borderColor: "rgba(245, 158, 11, 0.35)" }}>
              <div className="bezel-inner" style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(99, 102, 241, 0.05))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                      <Heart size={16} color="var(--accent-amber)" fill="currentColor" />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-amber)" }}>
                        Connected Parent
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.45rem", color: "#fff", fontWeight: 800 }}>
                      {activeParentName || "Senior Parent"}
                    </h2>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                      {activeParentPhone || "Phone not specified"}
                    </div>
                  </div>

                  <span className={`eyebrow-badge ${linkedSenior?.isPaired ? "badge-emerald" : "badge-amber"}`} style={{ margin: 0, padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}>
                    <CheckCircle2 size={12} />
                    <span>{linkedSenior?.isPaired ? "Linked" : "Waiting to pair"}</span>
                  </span>
                </div>

                {activePin && (
                  <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(245, 158, 11, 0.25)", marginBottom: "1.25rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem", fontWeight: 600 }}>
                      Parent 4-digit login code
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
                            borderRadius: "12px"
                          }}
                        >
                          {digit}
                        </div>
                      ))}
                    </div>

                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", maxWidth: "380px", margin: "0 auto 1rem auto" }}>
                      Share this code so your parent can open their own reminder screen.
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
                        onClick={() => handleShareWhatsApp(activePin)}
                      >
                        <Share2 size={15} />
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border-hairline)" }}>
                  <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    Connect a different parent?
                  </span>
                  <button
                    type="button"
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                    onClick={() => setShowPairModal(!showPairModal)}
                  >
                    <UserPlus size={14} />
                    <span>{showPairModal ? "Close" : "Pair another"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bezel-outer" style={{ borderColor: "rgba(245, 158, 11, 0.4)" }}>
              <div className="bezel-inner" style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(99, 102, 241, 0.04))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <AlertCircle size={18} color="var(--accent-amber)" />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-amber)" }}>
                    Connect your parent first
                  </span>
                </div>
                <h2 style={{ fontSize: "1.4rem", color: "#fff", fontWeight: 800, marginBottom: "0.4rem" }}>
                  Link a senior account
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                  Pair with your parent's 4-digit code, then schedule their medicines from this hub.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <button
                    type="button"
                    className={`btn-island ${connectTab === "code" ? "btn-island-amber" : "btn-island-ghost"}`}
                    style={{ justifyContent: "center", fontSize: "0.82rem", padding: "0.6rem" }}
                    onClick={() => setConnectTab("code")}
                  >
                    <KeyRound size={15} />
                    <span>Enter PIN</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-island ${connectTab === "invite" ? "btn-island-amber" : "btn-island-ghost"}`}
                    style={{ justifyContent: "center", fontSize: "0.82rem", padding: "0.6rem" }}
                    onClick={() => setConnectTab("invite")}
                  >
                    <UserPlus size={15} />
                    <span>Create invite</span>
                  </button>
                </div>

                {connectTab === "code" ? (
                  <form onSubmit={handlePairSubmit}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      Enter the 4-digit code from your parent's Community Companion screen:
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                      <input
                        className="form-input-custom"
                        type="text"
                        maxLength={4}
                        placeholder="4-digit code"
                        style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.25em", fontWeight: 800 }}
                        value={pairCodeInput}
                        onChange={(e) => setPairCodeInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      className="btn-island btn-island-amber"
                      style={{ width: "100%", justifyContent: "center", padding: "0.8rem" }}
                      disabled={isPairing || pairCodeInput.length !== 4}
                      type="submit"
                    >
                      <span>{isPairing ? "Connecting..." : "Pair with parent"}</span>
                      <div className="btn-island-tray">
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </div>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={onGenerateInvite}>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Parent's name</label>
                      <input
                        className="form-input-custom"
                        type="text"
                        placeholder="Parent full name"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group-custom">
                      <label className="form-label-custom">Parent's mobile number</label>
                      <input
                        className="form-input-custom"
                        type="tel"
                        placeholder="Mobile number"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                      />
                    </div>

                    <button
                      className="btn-island btn-island-amber"
                      style={{ width: "100%", justifyContent: "center", padding: "0.8rem" }}
                      disabled={isInviting}
                      type="submit"
                    >
                      <span>{isInviting ? "Generating PIN..." : "Create pairing invite"}</span>
                      <div className="btn-island-tray">
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </div>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {isConnected && showPairModal && (
            <div className="bezel-outer">
              <div className="bezel-inner">
                <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.3rem" }}>
                  Connect another parent
                </h3>
                <form onSubmit={handlePairSubmit} style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label-custom">Parent's 4-digit code</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="form-input-custom"
                      type="text"
                      maxLength={4}
                      placeholder="4-digit code"
                      style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.2em", fontWeight: 800 }}
                      value={pairCodeInput}
                      onChange={(e) => setPairCodeInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                    />
                    <button
                      className="btn-island btn-island-amber"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                      disabled={isPairing || pairCodeInput.length !== 4}
                      type="submit"
                    >
                      <span>{isPairing ? "Pairing..." : "Connect"}</span>
                    </button>
                  </div>
                </form>
                <form onSubmit={onGenerateInvite}>
                  <div className="form-group-custom" style={{ marginBottom: "0.6rem" }}>
                    <input
                      className="form-input-custom"
                      type="text"
                      placeholder="Parent name"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-custom" style={{ marginBottom: "0.8rem" }}>
                    <input
                      className="form-input-custom"
                      type="tel"
                      placeholder="Parent phone number"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}
                    disabled={isInviting}
                    type="submit"
                  >
                    <span>{isInviting ? "Creating..." : "Generate invite"}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {inviteResult && (
            <div className="bezel-outer" style={{ borderColor: "rgba(245, 158, 11, 0.4)" }}>
              <div className="bezel-inner" style={{ background: "rgba(245, 158, 11, 0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: "0.88rem" }}>Invite generated</span>
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
                  <span>{copiedInvite ? "Copied to clipboard" : "Copy SMS text"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="bezel-outer">
            <div className="bezel-inner">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", color: "#fff", marginBottom: "0.35rem" }}>
                    Add a medicine time
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Your parent will hear an alarm at this time and must tap “I Took It”.
                  </p>
                </div>
                {notifPermission === "granted" ? (
                  <span className="eyebrow-badge badge-emerald" style={{ margin: 0 }}>
                    <Bell size={12} />
                    <span>Alerts on</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-island btn-island-ghost"
                    style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}
                    onClick={onRequestNotifPermission}
                  >
                    <Bell size={14} />
                    <span>Enable missed-dose alerts</span>
                  </button>
                )}
              </div>

              {isConnected ? (
                <form onSubmit={handleScheduleSubmit}>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Medicine name</label>
                    <input
                      className="form-input-custom"
                      type="text"
                      placeholder="Medicine name"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Dosage</label>
                      <input
                        className="form-input-custom"
                        type="text"
                        placeholder="e.g. 1 tablet"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Time</label>
                      <input
                        className="form-input-custom"
                        type="time"
                        value={targetTime}
                        onChange={(e) => setTargetTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">When to take</label>
                    <select
                      className="form-input-custom"
                      value={mealRelation}
                      onChange={(e) => setMealRelation(e.target.value)}
                    >
                      <option value="BEFORE_MEAL">Before meal</option>
                      <option value="AFTER_MEAL">After meal</option>
                      <option value="WITH_MEAL">With meal</option>
                      <option value="INDEPENDENT">Anytime</option>
                    </select>
                  </div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Notes (optional)</label>
                    <input
                      className="form-input-custom"
                      type="text"
                      placeholder="e.g. Take with water"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-island btn-island-amber"
                    style={{ width: "100%", justifyContent: "center", padding: "0.8rem" }}
                    disabled={isScheduling || !medicineName.trim() || !dosage.trim()}
                    type="submit"
                  >
                    <Plus size={16} />
                    <span>{isScheduling ? "Saving..." : "Schedule for parent"}</span>
                  </button>
                </form>
              ) : (
                <div style={{ padding: "2rem 1.25rem", textAlign: "center", background: "rgba(255, 255, 255, 0.02)", borderRadius: "16px", border: "1px dashed var(--border-hairline)" }}>
                  <ShieldCheck size={40} color="var(--accent-amber)" style={{ margin: "0 auto 0.85rem auto", opacity: 0.8 }} />
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Connect your parent on the left before scheduling medicines.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bezel-outer">
            <div className="bezel-inner">
              <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "0.35rem" }}>
                Today's confirmation
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
                {doses.length === 0
                  ? "No doses for today until you schedule a medicine."
                  : `${takenCount} of ${doses.length} confirmed by ${activeParentName || "parent"}.`}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginBottom: "1.25rem" }}>
                {doses.length === 0 ? (
                  <div style={{ padding: "1.1rem", color: "var(--text-muted)", fontSize: "0.88rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px dashed var(--border-hairline)" }}>
                    Scheduled medicines will show here with Taken or Missed status.
                  </div>
                ) : (
                  doses.map((d) => {
                    const missed = d.status !== "ACKNOWLEDGED" && Boolean(d.scheduledTimestamp && d.scheduledTimestamp < Date.now());
                    return (
                      <div key={d.id} style={{ padding: "0.85rem 1rem", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff" }}>{d.medicineName} ({d.dosage})</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <Clock size={13} /> {d.time} · {d.mealRelation}
                          </div>
                        </div>
                        {d.status === "ACKNOWLEDGED" ? (
                          <span className="eyebrow-badge badge-emerald" style={{ margin: 0 }}>Taken</span>
                        ) : missed ? (
                          <span className="eyebrow-badge badge-crimson" style={{ margin: 0 }}>Missed</span>
                        ) : (
                          <span className="eyebrow-badge badge-amber" style={{ margin: 0 }}>Waiting</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <h3 style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "0.75rem" }}>
                Saved schedules ({masterSchedules.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {masterSchedules.length === 0 ? (
                  <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                    Nothing saved yet. Use the form above to add the first medicine.
                  </div>
                ) : (
                  masterSchedules.map((m) => (
                    <div key={m.id} style={{ padding: "0.75rem 0.9rem", background: "rgba(255, 255, 255, 0.04)", borderRadius: "12px", border: "1px solid var(--border-hairline)" }}>
                      <div style={{ fontWeight: 700, color: "#fff" }}>{m.medicineName} ({m.dosage})</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {m.targetTimes?.join(", ")} · {m.mealRelation?.replace("_", " ")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
