import React, { useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Check
} from "lucide-react";
import { VolunteerTask } from "../types";

interface VolunteerPortalProps {
  assignedSeniors: any[];
  volunteerTasks: VolunteerTask[];
  onRefreshTasks: () => void;
  onCompleteCheckIn: (
    task: VolunteerTask,
    mood: "CHEERFUL" | "NEUTRAL" | "ANXIOUS" | "UNWELL",
    notes: string,
    coordinatorFlag: string
  ) => Promise<void>;
}

export const VolunteerPortal: React.FC<VolunteerPortalProps> = ({
  assignedSeniors,
  volunteerTasks,
  onRefreshTasks,
  onCompleteCheckIn
}) => {
  const [selectedTaskForOutcome, setSelectedTaskForOutcome] = useState<VolunteerTask | null>(null);
  const [selectedMood, setSelectedMood] = useState<"CHEERFUL" | "NEUTRAL" | "ANXIOUS" | "UNWELL">("CHEERFUL");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [coordinatorFlag, setCoordinatorFlag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForOutcome) return;

    setIsSubmitting(true);
    try {
      await onCompleteCheckIn(selectedTaskForOutcome, selectedMood, checkInNotes, coordinatorFlag);
      setSelectedTaskForOutcome(null);
      setCheckInNotes("");
      setCoordinatorFlag("");
      setSelectedMood("CHEERFUL");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span className="eyebrow-badge badge-emerald">
          <ShieldCheck size={12} />
          <span>Verified Volunteer Workspace</span>
        </span>
        <h1 className="portal-heading">
          Community Companion Care Hub
        </h1>
        <p className="portal-subtitle">
          Conduct regular check-ins, record elderly mood observations, and flag wellness concerns for coordinators.
        </p>
      </div>

      {/* Volunteer Workload Gauge */}
      <div className="bezel-outer" style={{ marginBottom: "2rem" }}>
        <div
          className="bezel-inner"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>Rohan Kulkarni</span>
              <span className="eyebrow-badge badge-emerald" style={{ margin: 0 }}>Coordinator Verified</span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Languages: Hindi, Marathi, English | Locality: Bandra (400050)
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Workload Protection
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
              {assignedSeniors.length || 1} / 3 Seniors Assigned
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Burnout guard active (Max 3 seniors per volunteer)
            </div>
          </div>
        </div>
      </div>

      {/* Pending Check-in Tasks */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="section-title">Your Scheduled Tasks</h2>
        <button
          className="btn-island btn-island-ghost"
          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          onClick={onRefreshTasks}
          title="Refresh tasks from PostgreSQL"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {volunteerTasks.length === 0 ? (
        <div className="bezel-outer">
          <div className="bezel-inner" style={{ textAlign: "center", padding: "3rem" }}>
            <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ color: "#fff", fontSize: "1.4rem" }}>All Tasks Completed!</h3>
            <p style={{ color: "var(--text-muted)" }}>Thank you for keeping our seniors happy and supported today.</p>
          </div>
        </div>
      ) : (
        volunteerTasks.map((task) => (
          <div key={task.taskId} className="volunteer-task-card">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>{task.seniorName}</span>
                <span className="eyebrow-badge badge-amber" style={{ margin: 0 }}>{task.type.replace("_", " ")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                <MapPin size={14} />
                <span>{task.phone || "+91 98200 11223"}</span>
              </div>
              <div style={{ color: "var(--accent-amber)", fontSize: "0.9rem", fontWeight: 600, marginTop: "0.25rem" }}>
                Scheduled For: {new Date(task.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            <button
              className="btn-island btn-island-emerald"
              onClick={() => setSelectedTaskForOutcome(task)}
            >
              <span>Record Outcome</span>
              <div className="btn-island-tray">
                <ArrowRight size={18} strokeWidth={2.5} />
              </div>
            </button>
          </div>
        ))
      )}

      {/* Modal: Record Task Outcome */}
      {selectedTaskForOutcome && (
        <div className="modal-backdrop">
          <div className="bezel-outer modal-bezel-outer">
            <div className="bezel-inner">
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.25rem" }}>
                Check-in Outcome: {selectedTaskForOutcome.seniorName}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Log the senior's mood and any coordinator flags to update their record in PostgreSQL.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group-custom">
                  <label className="form-label-custom">Observed Senior Mood</label>
                  <div className="mood-grid">
                    {[
                      { key: "CHEERFUL", label: "Cheerful", icon: "😊" },
                      { key: "NEUTRAL", label: "Neutral", icon: "😐" },
                      { key: "ANXIOUS", label: "Anxious", icon: "😟" },
                      { key: "UNWELL", label: "Unwell", icon: "🤒" }
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedMood(m.key as any)}
                        style={{
                          padding: "0.75rem 0.25rem",
                          borderRadius: "12px",
                          border: selectedMood === m.key ? "2px solid var(--accent-emerald)" : "1px solid var(--border-hairline)",
                          background: selectedMood === m.key ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.04)",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.85rem",
                          fontWeight: 700
                        }}
                      >
                        <span style={{ fontSize: "1.5rem" }}>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Interaction Notes</label>
                  <textarea
                    className="form-input-custom"
                    rows={3}
                    placeholder="e.g. Discussed her morning devotional songs. In high spirits."
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Flag for NGO Coordinator (Optional)</label>
                  <input
                    className="form-input-custom"
                    type="text"
                    placeholder="e.g. Senior requested assistance with grocery visit next Tuesday"
                    value={coordinatorFlag}
                    onChange={(e) => setCoordinatorFlag(e.target.value)}
                  />
                </div>

                <div className="modal-actions-2col">
                  <button
                    type="button"
                    className="btn-island btn-island-ghost"
                    style={{ justifyContent: "center" }}
                    onClick={() => setSelectedTaskForOutcome(null)}
                    disabled={isSubmitting}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className="btn-island btn-island-emerald"
                    style={{ justifyContent: "center" }}
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Saving..." : "Save to DB"}</span>
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
