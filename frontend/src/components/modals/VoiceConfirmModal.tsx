import React from "react";
import { Sparkles, Check } from "lucide-react";
import { ParsedVoiceOutput } from "../../types";

interface VoiceConfirmModalProps {
  isOpen: boolean;
  parsedData: ParsedVoiceOutput | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const VoiceConfirmModal: React.FC<VoiceConfirmModalProps> = ({
  isOpen,
  parsedData,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !parsedData) return null;

  return (
    <div className="modal-backdrop">
      <div className="bezel-outer modal-bezel-outer">
        <div className="bezel-inner">
          <span className="eyebrow-badge badge-amber">
            <Sparkles size={12} />
            <span>Groq Voice AI Extraction</span>
          </span>

          <h2 style={{ fontSize: "1.75rem", color: "#fff", marginBottom: "0.5rem" }}>
            Confirm Medication Reminder
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", fontStyle: "italic", marginBottom: "1rem" }}>
            "{parsedData.seniorConfirmationPhrase}"
          </p>

          <div className="modal-details-table">
            <div className="modal-detail-row">
              <span className="modal-detail-key">Medication Name</span>
              <span className="modal-detail-val">{parsedData.medicationName}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-key">Dosage</span>
              <span className="modal-detail-val">{parsedData.dosage}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-key">Target Time</span>
              <span className="modal-detail-val">
                {parsedData.targetTimes && parsedData.targetTimes[0] ? parsedData.targetTimes[0] : "09:00"}
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-key">Meal Relation</span>
              <span className="modal-detail-val">{parsedData.mealRelation || "AFTER_MEAL"}</span>
            </div>
          </div>

          <div className="modal-actions-2col">
            <button
              className="btn-island btn-island-ghost"
              style={{ justifyContent: "center" }}
              onClick={onClose}
            >
              <span>Re-speak</span>
            </button>
            <button
              className="btn-island btn-island-emerald"
              style={{ justifyContent: "center" }}
              onClick={onConfirm}
            >
              <span>Confirm & Save to DB</span>
              <div className="btn-island-tray">
                <Check size={18} strokeWidth={2.5} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
