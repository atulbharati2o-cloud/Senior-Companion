import React from "react";
import { Bell, Clock, Check } from "lucide-react";
import { DoseOccurrence } from "../../types";

interface DoseAlarmModalProps {
  dose: DoseOccurrence | null;
  onSnooze: () => void;
  onAcknowledge: (id: string, name: string) => void;
}

export const DoseAlarmModal: React.FC<DoseAlarmModalProps> = ({
  dose,
  onSnooze,
  onAcknowledge
}) => {
  if (!dose) return null;

  return (
    <div className="modal-backdrop">
      <div className="bezel-outer bezel-outer-amber modal-bezel-outer" style={{ maxWidth: "520px" }}>
        <div className="bezel-inner bezel-inner-amber" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <span className="eyebrow-badge badge-amber" style={{ margin: "0 auto 1.25rem auto" }}>
            <Bell size={14} />
            <span>Medication Alarm Due Now ({dose.time})</span>
          </span>

          <h2 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem", fontWeight: 800 }}>
            Time for Your Medicine!
          </h2>

          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-amber)", marginBottom: "0.25rem" }}>
            {dose.medicineName}
          </div>

          <div style={{ fontSize: "1.15rem", color: "#fff", fontWeight: 600, marginBottom: "0.75rem" }}>
            Dose: {dose.dosage} • {dose.mealRelation}
          </div>

          {dose.instructions && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.75rem" }}>
              "{dose.instructions}"
            </p>
          )}

          <div className="alarm-modal-actions modal-actions-2col">
            <button
              className="btn-island btn-island-ghost"
              style={{ justifyContent: "center", padding: "0.9rem" }}
              onClick={onSnooze}
            >
              <Clock size={18} />
              <span>Snooze 10 Mins</span>
            </button>

            <button
              className="btn-island btn-island-emerald"
              style={{ justifyContent: "center", padding: "0.9rem" }}
              onClick={() => onAcknowledge(dose.id, dose.medicineName)}
            >
              <span>Mark as Taken</span>
              <div className="btn-island-tray">
                <Check size={18} strokeWidth={3} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
