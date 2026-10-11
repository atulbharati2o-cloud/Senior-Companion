import React from "react";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  PhoneCall,
  ArrowRight,
  Radio,
  Check,
  X,
  RefreshCw,
  Bell,
  KeyRound,
  LogIn
} from "lucide-react";
import { AuthTokens, DoseOccurrence } from "../types";

interface SeniorPortalProps {
  auth: AuthTokens;
  currentTime: string;
  currentDate: string;
  doses: DoseOccurrence[];
  isLoadingDoses: boolean;
  isListening: boolean;
  isParsing: boolean;
  voiceTranscript: string;
  testCountdown: number | null;
  notifPermission: NotificationPermission;
  onToggleListening: () => void;
  onVoiceParse: (text: string) => void;
  onSetVoiceTranscript: (text: string) => void;
  onTriggerInstantTestAlarm: () => void;
  onSchedule30SecAlarm: () => void;
  onRequestNotifPermission: () => void;
  onFetchOccurrences: () => void;
  onAcknowledgeDose: (id: string, name: string) => void;
  onTriggerDoseAlarm: (dose: DoseOccurrence) => void;
  onStartSos: () => void;
  onOpenAuthModal: () => void;
  onSpeakText: (text: string) => void;
  onCancelTestCountdown: () => void;
}

export const SeniorPortal: React.FC<SeniorPortalProps> = ({
  auth,
  currentTime,
  currentDate,
  doses,
  isLoadingDoses,
  isListening,
  isParsing,
  voiceTranscript,
  testCountdown,
  notifPermission,
  onToggleListening,
  onVoiceParse,
  onSetVoiceTranscript,
  onTriggerInstantTestAlarm,
  onSchedule30SecAlarm,
  onRequestNotifPermission,
  onFetchOccurrences,
  onAcknowledgeDose,
  onTriggerDoseAlarm,
  onStartSos,
  onOpenAuthModal,
  onSpeakText,
  onCancelTestCountdown
}) => {
  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;
  const overdueDoses = doses.filter((d) => {
    if (d.status === "ACKNOWLEDGED" || !d.scheduledTimestamp) return false;
    return d.scheduledTimestamp < Date.now();
  });

  return (
    <div>
      {/* Top Bar: Giant Clock & Pairing Code */}
      <div className="senior-top-strip">
        <div className="senior-clock-wrap">
          <div className="senior-clock-time">{currentTime || "09:00 AM"}</div>
          <div className="senior-clock-date">{currentDate || "Sunday, October 11"}</div>
        </div>

        <div className="senior-pairing-card">
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {auth.pairingCode ? "Family Pairing Code" : "Senior Account"}
            </div>
            <div className="pairing-code-digit" style={{ fontSize: auth.pairingCode ? "1.6rem" : "1.05rem" }}>
              {auth.pairingCode || "Not Paired"}
            </div>
          </div>
          {auth.pairingCode ? (
            <button
              className="btn-island btn-island-ghost"
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
              onClick={() => onSpeakText(`Your four-digit pairing code is ${auth.pairingCode.split("").join(" ")}`)}
            >
              <Volume2 size={16} />
            </button>
          ) : (
            <button
              className="btn-island btn-island-amber"
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
              onClick={onOpenAuthModal}
            >
              <LogIn size={15} />
              <span>Enter Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Guest / Unauthenticated Notice Banner */}
      {!auth.seniorName && (
        <div className="bezel-outer bezel-outer-amber" style={{ marginBottom: "1.5rem" }}>
          <div
            className="bezel-inner bezel-inner-amber"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "1rem 1.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <KeyRound size={22} color="var(--accent-amber)" />
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                  Guest Mode — No Senior Account Active
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  Enter your 4-digit code, create a new profile, or choose a persona to manage your schedule.
                </div>
              </div>
            </div>
            <button
              className="btn-island btn-island-amber"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              onClick={onOpenAuthModal}
            >
              <LogIn size={16} />
              <span>Log In / Enter 4-Digit Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Medicine Hero (Double-Bezel Architecture) */}
      <div className="bezel-outer" style={{ marginBottom: "2.5rem" }}>
        <div className="bezel-inner voice-hero-card">
          <span className="eyebrow-badge badge-amber">
            <Sparkles size={12} />
            <span>Groq AI Spoken Voice Assistant</span>
          </span>

          <h1 className="voice-headline">Tell Me Your Medicine Schedule</h1>
          <p className="voice-subtext">
            Press the big button and speak naturally in English, Hindi, or mixed words. Groq will parse it and save it directly to the database.
          </p>

          {/* Big Mic Button */}
          <button
            className={`mic-button-giant ${isListening ? "listening" : ""}`}
            onClick={onToggleListening}
            aria-label="Toggle Voice Recording"
          >
            {isListening ? <MicOff size={64} strokeWidth={2} /> : <Mic size={64} strokeWidth={2} />}
          </button>

          {/* Live Audio Waveform Feedback */}
          <div className={`waveform-container ${isListening ? "active" : ""}`}>
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
            <div className="waveform-bar" />
          </div>

          <div style={{ fontWeight: 700, color: isListening ? "var(--accent-crimson)" : "var(--accent-amber)", fontSize: "1.2rem", marginBottom: "1rem" }}>
            {isListening
              ? "Listening to you... Speak now"
              : isParsing
              ? "Groq AI is processing your voice..."
              : "Tap to Speak"}
          </div>

          {/* Manual Voice Text Input & Edit Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (voiceTranscript.trim()) {
                onVoiceParse(voiceTranscript);
              }
            }}
            className="voice-input-form"
          >
            <input
              type="text"
              className="form-input-custom"
              placeholder="Or type/edit schedule: e.g. Paracetamol 500mg at 5 PM"
              value={voiceTranscript}
              onChange={(e) => onSetVoiceTranscript(e.target.value)}
              style={{ flex: 1, borderRadius: "12px", fontSize: "0.95rem" }}
            />
            <button
              type="submit"
              className="btn-island btn-island-amber"
              style={{ padding: "0.6rem 1.15rem" }}
              disabled={isParsing || !voiceTranscript.trim()}
            >
              <span>{isParsing ? "Parsing..." : "Parse AI"}</span>
              <div className="btn-island-tray">
                <ArrowRight size={16} />
              </div>
            </button>
          </form>

          {/* Quick Natural Dialect Prompts */}
          <div className="prompt-chips-wrap">
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Take Paracetamol 500mg at 5 PM in the evening";
                onSetVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              ☕ "Take Paracetamol 500mg at 5 PM"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Shaam ko 5 baje Paracetamol lena hai";
                onSetVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              🇮🇳 "Shaam ko 5 baje Paracetamol lena hai"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Remind me to take Metformin 500mg after breakfast at 9 am";
                onSetVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              🗣️ "Metformin 500mg after breakfast (9 AM)"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Blood pressure tablet at 9 pm after dinner";
                onSetVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              🌙 "Blood pressure tablet at 9 PM after dinner"
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Medicine Alert Banner */}
      {overdueDoses.length > 0 && (
        <div className="bezel-outer bezel-outer-amber" style={{ marginBottom: "1.5rem" }}>
          <div
            className="bezel-inner bezel-inner-amber"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "1.25rem 1.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.2)", padding: "0.75rem", borderRadius: "12px", color: "var(--accent-amber)" }}>
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>
                  Overdue Medication Alert ({overdueDoses.length} dose pending)
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {overdueDoses.map((d) => `${d.medicineName} (${d.time})`).join(", ")} was scheduled earlier today and has not been taken yet.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
              <button
                className="btn-island btn-island-amber"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                onClick={() => onTriggerDoseAlarm(overdueDoses[0])}
              >
                <Bell size={16} />
                <span>Ring Alarm Now</span>
              </button>
              <button
                className="btn-island btn-island-emerald"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                onClick={() => onAcknowledgeDose(overdueDoses[0].id, overdueDoses[0].medicineName)}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Mark Taken</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active 30-Second Test Alarm Countdown Strip */}
      {testCountdown !== null && (
        <div className="bezel-outer bezel-outer-amber" style={{ marginBottom: "1.5rem" }}>
          <div
            className="bezel-inner bezel-inner-amber"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="status-dot-pulse" style={{ background: "var(--accent-amber)" }} />
              <span style={{ fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>
                Live Alarm Test Active: Ringing in{" "}
                <span style={{ color: "var(--accent-amber)", fontSize: "1.35rem" }}>{testCountdown}s</span>... Keep this tab open!
              </span>
            </div>
            <button
              className="btn-island btn-island-ghost"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              onClick={onCancelTestCountdown}
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Today's Medications Grid */}
      <div className="section-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <h2 className="section-title">Today's Medicine Schedule</h2>
          <button
            className="btn-island btn-island-ghost"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
            onClick={onFetchOccurrences}
            title="Refresh from PostgreSQL"
          >
            <RefreshCw size={14} className={isLoadingDoses ? "animate-spin" : ""} />
          </button>
          <button
            className="btn-island btn-island-amber"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
            onClick={onTriggerInstantTestAlarm}
            title="Test Audio Chime, Voice & Modal Alarm"
          >
            <Bell size={14} />
            <span>Test Alarm Now</span>
          </button>
          <button
            className="btn-island btn-island-ghost"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "var(--accent-amber)" }}
            onClick={onSchedule30SecAlarm}
            title="Schedule a real alarm that rings automatically in 30 seconds"
          >
            <Clock size={14} />
            <span>⏱️ Ring in 30s</span>
          </button>
          {notifPermission === "granted" ? (
            <span className="eyebrow-badge badge-emerald" style={{ margin: 0, padding: "0.35rem 0.65rem" }}>
              <Bell size={12} />
              <span>Phone Alerts Active</span>
            </span>
          ) : (
            <button
              className="btn-island btn-island-emerald"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              onClick={onRequestNotifPermission}
              title="Enable phone lock screen notification alerts"
            >
              <Bell size={14} />
              <span>Enable Phone Alerts</span>
            </button>
          )}
        </div>

        <span className="eyebrow-badge badge-emerald">
          <CheckCircle2 size={12} />
          <span>{takenCount} of {doses.length} Taken Today</span>
        </span>
      </div>

      <div className="dose-grid">
        {doses.map((dose) => {
          const isTaken = dose.status === "ACKNOWLEDGED";
          return (
            <div key={dose.id} className={`bezel-outer ${isTaken ? "bezel-outer-emerald" : ""}`}>
              <div className={`bezel-inner dose-card-inner ${isTaken ? "bezel-inner-emerald" : ""}`}>
                <div>
                  <div className="dose-time-row">
                    <div className="dose-time-display">
                      <Clock size={20} strokeWidth={2.5} />
                      <span>{dose.time}</span>
                    </div>
                    {isTaken ? (
                      <span className="eyebrow-badge badge-emerald">Taken</span>
                    ) : (
                      <span className="eyebrow-badge badge-amber">Due Today</span>
                    )}
                  </div>

                  <div className="dose-name">{dose.medicineName}</div>
                  <div className="dose-strength">{dose.dosage}</div>

                  <div className="meal-relation-pill">
                    <span>🍽️</span>
                    <span>{dose.mealRelation}</span>
                  </div>

                  {dose.instructions && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
                      {dose.instructions}
                    </p>
                  )}
                </div>

                <div className="dose-action-row">
                  {isTaken ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-emerald)", fontWeight: 700 }}>
                      <CheckCircle2 size={24} />
                      <span>Completed Today</span>
                    </div>
                  ) : (
                    <button
                      className="btn-island btn-island-emerald"
                      onClick={() => onAcknowledgeDose(dose.id, dose.medicineName)}
                    >
                      <span>Mark as Taken</span>
                      <div className="btn-island-tray">
                        <Check size={18} strokeWidth={3} />
                      </div>
                    </button>
                  )}

                  <button
                    className="btn-island btn-island-ghost"
                    style={{ padding: "0.6rem 0.85rem" }}
                    onClick={() => onSpeakText(`Reminder: Take ${dose.medicineName} ${dose.dosage} ${dose.mealRelation}.`)}
                    title="Read Aloud"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency SOS Banner (Double-Bezel Crimson) */}
      <div className="bezel-outer bezel-outer-crimson sos-floating-strip">
        <div className="bezel-inner bezel-inner-crimson sos-content-row">
          <div>
            <h3 className="sos-heading">
              <AlertTriangle size={28} />
              <span>One-Tap Emergency SOS Help</span>
            </h3>
            <p className="sos-subheading">
              Pressing this immediately alerts family, calls nearby local volunteers, and coordinates medical assistance.
            </p>
          </div>

          <button className="btn-island btn-island-crimson" onClick={onStartSos}>
            <span>SOS EMERGENCY HELP</span>
            <div className="btn-island-tray">
              <Radio size={20} strokeWidth={2.5} />
            </div>
          </button>
        </div>

        {/* Instant Speed Dial Direct Line Strip */}
        <div className="speed-dial-strip">
          <span style={{ fontSize: "0.85rem", color: "#fca5a5", fontWeight: 700 }}>1-Tap Direct Call:</span>
          <a href="tel:+919811122233" className="btn-island btn-island-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", textDecoration: "none" }}>
            <PhoneCall size={14} />
            <span>Daughter (+91 98111 22233)</span>
          </a>
          <a href="tel:+919844455566" className="btn-island btn-island-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", textDecoration: "none" }}>
            <PhoneCall size={14} />
            <span>Son (+91 98444 55566)</span>
          </a>
          <a href="tel:112" className="btn-island btn-island-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", textDecoration: "none", color: "#fca5a5" }}>
            <AlertTriangle size={14} />
            <span>112 Ambulance / Police</span>
          </a>
        </div>
      </div>
    </div>
  );
};
