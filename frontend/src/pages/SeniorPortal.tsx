import React from "react";
import {
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PhoneCall,
  Check,
  RefreshCw,
  Bell,
  KeyRound,
  LogIn,
  Radio,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { AuthTokens, DoseOccurrence, EmergencyContact } from "../types";

interface SeniorPortalProps {
  auth: AuthTokens;
  currentTime: string;
  currentDate: string;
  doses: DoseOccurrence[];
  isLoadingDoses: boolean;
  notifPermission: NotificationPermission;
  emergencyContacts: EmergencyContact[];
  onRequestNotifPermission: () => void;
  onFetchOccurrences: () => void;
  onAcknowledgeDose: (id: string, name: string) => void;
  onTriggerDoseAlarm: (dose: DoseOccurrence) => void;
  onStartSos: () => void;
  onOpenAuthModal: () => void;
  onSpeakText: (text: string) => void;
  isListening: boolean;
  isParsing: boolean;
  voiceTranscript: string;
  onToggleListening: () => void;
  onVoiceParse: (transcript: string) => void;
  onChangeVoiceTranscript: (text: string) => void;
}

export const SeniorPortal: React.FC<SeniorPortalProps> = ({
  auth,
  currentTime,
  currentDate,
  doses,
  isLoadingDoses,
  notifPermission,
  emergencyContacts,
  onRequestNotifPermission,
  onFetchOccurrences,
  onAcknowledgeDose,
  onTriggerDoseAlarm,
  onStartSos,
  onOpenAuthModal,
  onSpeakText,
  isListening,
  isParsing,
  voiceTranscript,
  onToggleListening,
  onVoiceParse,
  onChangeVoiceTranscript
}) => {
  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;
  const overdueDoses = doses.filter((d) => {
    if (d.status === "ACKNOWLEDGED" || d.status === "ESCALATED") return false;
    if (!d.scheduledTimestamp) return false;
    return d.scheduledTimestamp < Date.now();
  });
  const upcomingDoses = doses.filter((d) => d.status === "SCHEDULED" && (!d.scheduledTimestamp || d.scheduledTimestamp >= Date.now()));

  return (
    <div>
      <div className="senior-top-strip">
        <div className="senior-clock-wrap">
          <div className="senior-clock-time">{currentTime || "--:--"}</div>
          <div className="senior-clock-date">{currentDate || ""}</div>
        </div>

        <div className="senior-pairing-card">
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {auth.pairingCode ? "Family Pairing Code" : "Senior Account"}
            </div>
            <div className="pairing-code-digit" style={{ fontSize: auth.pairingCode ? "1.6rem" : "1.05rem" }}>
              {auth.pairingCode || auth.seniorName || "Not signed in"}
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
                  Sign in with your 4-digit family code
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  Your caregiver schedules medicines. You only need to confirm when it is time to take them.
                </div>
              </div>
            </div>
            <button
              className="btn-island btn-island-amber"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              onClick={onOpenAuthModal}
            >
              <LogIn size={16} />
              <span>Enter 4-Digit Code</span>
            </button>
          </div>
        </div>
      )}

      {auth.seniorName && (
        <div style={{ marginBottom: "1.75rem" }}>
          <span className="eyebrow-badge badge-amber">
            <Bell size={12} />
            <span>Medicine reminders</span>
          </span>
          <h1 className="portal-heading" style={{ marginTop: "0.65rem" }}>
            Hello {auth.seniorName.split(" ")[0]}
          </h1>
          <p className="portal-subtitle">
            When a reminder rings, take your medicine and tap Mark as Taken so your family knows you are okay.
          </p>
        </div>
      )}

      {/* Voice Assistant & Medicine Mic Hero */}
      <div className="bezel-outer" style={{ marginBottom: "2rem" }}>
        <div className="bezel-inner voice-hero-card">
          <span className="eyebrow-badge badge-amber">
            <Sparkles size={12} />
            <span>Groq AI Spoken Voice Assistant</span>
          </span>

          <h2 className="voice-headline">Tell Me Your Medicine Schedule</h2>
          <p className="voice-subtext">
            Tap the big microphone and speak naturally in English or Hindi. Groq AI will parse your medicine, dosage, and timing.
          </p>

          {/* Big Pulsing Mic Button */}
          <button
            className={`mic-button-giant ${isListening ? "listening" : ""}`}
            onClick={onToggleListening}
            aria-label="Toggle Voice Recording"
            title={isListening ? "Listening... Tap to stop" : "Tap to speak your medicine"}
          >
            {isListening ? <MicOff size={60} strokeWidth={2.2} /> : <Mic size={60} strokeWidth={2.2} />}
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

          <div
            style={{
              fontWeight: 700,
              color: isListening ? "var(--accent-crimson)" : "var(--accent-amber)",
              fontSize: "1.2rem",
              marginBottom: "1.25rem"
            }}
          >
            {isListening
              ? "Listening to you... Speak now"
              : isParsing
              ? "Groq AI is processing your voice..."
              : "Tap the Microphone to Speak"}
          </div>

          {/* Manual Voice Text Input & Edit Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (voiceTranscript.trim()) {
                onVoiceParse(voiceTranscript);
              }
            }}
            style={{
              display: "flex",
              gap: "0.5rem",
              width: "100%",
              maxWidth: "580px",
              margin: "0 auto 1.5rem auto"
            }}
          >
            <input
              type="text"
              className="form-input-custom"
              placeholder="Or type/edit schedule: e.g. Paracetamol 500mg at 5 PM"
              value={voiceTranscript}
              onChange={(e) => onChangeVoiceTranscript(e.target.value)}
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
                onChangeVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              ☕ "Take Paracetamol 500mg at 5 PM"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Shaam ko 5 baje Paracetamol lena hai";
                onChangeVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              🇮🇳 "Shaam ko 5 baje Paracetamol lena hai"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Remind me to take Metformin 500mg after breakfast at 9 am";
                onChangeVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              🗣️ "Metformin 500mg after breakfast (9 AM)"
            </button>
            <button
              className="prompt-chip"
              onClick={() => {
                const text = "Blood pressure tablet at 9 pm after dinner";
                onChangeVoiceTranscript(text);
                onVoiceParse(text);
              }}
            >
              💊 "BP tablet at 9 PM after dinner"
            </button>
          </div>
        </div>
      </div>

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
                  Please take your medicine
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {overdueDoses.map((d) => `${d.medicineName} (${d.time})`).join(", ")} has not been confirmed yet. Your caregiver will be notified if this stays overdue.
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
                <span>Play Reminder</span>
              </button>
              <button
                className="btn-island btn-island-emerald"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                onClick={() => onAcknowledgeDose(overdueDoses[0].id, overdueDoses[0].medicineName)}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>I Took It</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <h2 className="section-title">Today's Medicines</h2>
          <button
            className="btn-island btn-island-ghost"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
            onClick={onFetchOccurrences}
            title="Refresh schedule"
          >
            <RefreshCw size={14} className={isLoadingDoses ? "animate-spin" : ""} />
          </button>
          {notifPermission === "granted" ? (
            <span className="eyebrow-badge badge-emerald" style={{ margin: 0, padding: "0.35rem 0.65rem" }}>
              <Bell size={12} />
              <span>Phone Alerts On</span>
            </span>
          ) : (
            <button
              className="btn-island btn-island-emerald"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              onClick={onRequestNotifPermission}
            >
              <Bell size={14} />
              <span>Enable Alerts</span>
            </button>
          )}
        </div>

        <span className="eyebrow-badge badge-emerald">
          <CheckCircle2 size={12} />
          <span>{takenCount} of {doses.length} taken</span>
        </span>
      </div>

      {doses.length === 0 ? (
        <div className="bezel-outer" style={{ marginBottom: "2rem" }}>
          <div className="bezel-inner" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <Clock size={40} color="var(--accent-amber)" style={{ margin: "0 auto 1rem auto", opacity: 0.85 }} />
            <h3 style={{ fontSize: "1.35rem", color: "#fff", marginBottom: "0.5rem" }}>
              No medicines scheduled yet
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "460px", margin: "0 auto" }}>
              Ask your family caregiver to add your medicine times. When they do, reminders will appear here and ring at the right time.
            </p>
          </div>
        </div>
      ) : (
        <div className="dose-grid">
          {doses.map((dose) => {
            const isTaken = dose.status === "ACKNOWLEDGED";
            const isOverdue = !isTaken && Boolean(dose.scheduledTimestamp && dose.scheduledTimestamp < Date.now());
            return (
              <div key={dose.id} className={`bezel-outer ${isTaken ? "bezel-outer-emerald" : isOverdue ? "bezel-outer-amber" : ""}`}>
                <div className={`bezel-inner dose-card-inner ${isTaken ? "bezel-inner-emerald" : ""}`}>
                  <div>
                    <div className="dose-time-row">
                      <div className="dose-time-display">
                        <Clock size={20} strokeWidth={2.5} />
                        <span>{dose.time}</span>
                      </div>
                      {isTaken ? (
                        <span className="eyebrow-badge badge-emerald">Taken</span>
                      ) : isOverdue ? (
                        <span className="eyebrow-badge badge-amber">Waiting</span>
                      ) : (
                        <span className="eyebrow-badge badge-indigo">Upcoming</span>
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
                        <span>Thank you</span>
                      </div>
                    ) : (
                      <button
                        className="btn-island btn-island-emerald"
                        onClick={() => onAcknowledgeDose(dose.id, dose.medicineName)}
                      >
                        <span>I Took It</span>
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
      )}

      {upcomingDoses.length > 0 && overdueDoses.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "-0.5rem", marginBottom: "2rem" }}>
          Next reminder: {upcomingDoses[0].medicineName} at {upcomingDoses[0].time}. Keep this page open to hear the alarm.
        </p>
      )}

      <div className="bezel-outer bezel-outer-crimson sos-floating-strip">
        <div className="bezel-inner bezel-inner-crimson sos-content-row">
          <div>
            <h3 className="sos-heading">
              <AlertTriangle size={28} />
              <span>Need Help Now?</span>
            </h3>
            <p className="sos-subheading">
              This alerts your family and nearby help. Use it only if you need emergency assistance.
            </p>
          </div>

          <button className="btn-island btn-island-crimson" onClick={onStartSos}>
            <span>SOS EMERGENCY HELP</span>
            <div className="btn-island-tray">
              <Radio size={20} strokeWidth={2.5} />
            </div>
          </button>
        </div>

        <div className="speed-dial-strip">
          <span style={{ fontSize: "0.85rem", color: "#fca5a5", fontWeight: 700 }}>Direct call:</span>
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone}`}
                className="btn-island btn-island-ghost"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", textDecoration: "none" }}
              >
                <PhoneCall size={14} />
                <span>{contact.name} ({contact.phone})</span>
              </a>
            ))
          ) : (
            <span style={{ fontSize: "0.85rem", color: "#fca5a5" }}>No family numbers saved yet</span>
          )}
          <a href="tel:112" className="btn-island btn-island-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", textDecoration: "none", color: "#fca5a5" }}>
            <AlertTriangle size={14} />
            <span>112 Ambulance</span>
          </a>
        </div>
      </div>
    </div>
  );
};
