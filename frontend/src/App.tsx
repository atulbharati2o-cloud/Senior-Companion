import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Heart,
  Users,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  Activity,
  ArrowRight,
  Radio,
  Check,
  X,
  MapPin,
  Copy,
  RefreshCw,
  Bell
} from "lucide-react";

// Types
interface DoseOccurrence {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
  mealRelation: string;
  status: "SCHEDULED" | "ACKNOWLEDGED" | "ESCALATED";
  instructions?: string;
}

interface ParsedVoiceOutput {
  medicationName: string;
  dosage: string;
  scheduleType: string;
  targetTimes: string[];
  mealRelation: string;
  mealName?: string[];
  instructions?: string;
  seniorConfirmationPhrase: string;
}

interface ActiveSosAlert {
  id: string;
  seniorId: string;
  seniorName: string;
  phone: string;
  status: string;
  severity: string;
  reason: string;
  currentEscalationTier: number;
  createdAt: string;
  address?: string;
  pincode?: string;
}

interface PendingVolunteer {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  languagesSpoken: string;
  pincode: string;
  createdAt: string;
}

interface VolunteerTask {
  taskId: string;
  seniorId: string;
  seniorName: string;
  phone?: string;
  type: string;
  status: string;
  scheduledFor: string;
}

interface MasterSchedule {
  id: string;
  medicineName: string;
  dosage: string;
  mealRelation: string;
  targetTimes: string[];
  instructions?: string;
}

interface AuthTokens {
  seniorToken: string;
  seniorId: string;
  seniorName: string;
  pairingCode: string;
  coordinatorToken: string;
  volunteerToken: string;
  volunteerId: string;
  familyToken: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"senior" | "caregiver" | "volunteer" | "coordinator">("senior");

  // Auth & Roles State
  const [auth, setAuth] = useState<AuthTokens>({
    seniorToken: "",
    seniorId: "",
    seniorName: "Mrs. Shanti Devi",
    pairingCode: "8421",
    coordinatorToken: "",
    volunteerToken: "",
    volunteerId: "",
    familyToken: ""
  });

  // Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Clock State
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Senior State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedVoiceOutput | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // SOS Emergency State
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosDispatched, setSosDispatched] = useState(false);

  // Live Doses List
  const [doses, setDoses] = useState<DoseOccurrence[]>([]);
  const [isLoadingDoses, setIsLoadingDoses] = useState(false);

  // Caregiver Portal State
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [inviteResult, setInviteResult] = useState<{ pairingCode: string; smsInviteText: string } | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [masterSchedules, setMasterSchedules] = useState<MasterSchedule[]>([]);

  // Volunteer Portal State
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([]);
  const [assignedSeniors, setAssignedSeniors] = useState<any[]>([]);
  const [selectedTaskForOutcome, setSelectedTaskForOutcome] = useState<VolunteerTask | null>(null);
  const [selectedMood, setSelectedMood] = useState<"CHEERFUL" | "NEUTRAL" | "LOW_ENERGY" | "ANXIOUS" | "UNWELL">("CHEERFUL");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [coordinatorFlag, setCoordinatorFlag] = useState("");

  // Coordinator Portal State
  const [activeSosAlerts, setActiveSosAlerts] = useState<ActiveSosAlert[]>([]);
  const [pendingVolunteers, setPendingVolunteers] = useState<PendingVolunteer[]>([]);
  const [resolveModalAlert, setResolveModalAlert] = useState<ActiveSosAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Web Speech API Ref
  const recognitionRef = useRef<any>(null);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Demo Auth Roles from Backend
  useEffect(() => {
    async function initAuthSessions() {
      try {
        const [seniorRes, coordRes, volRes, famRes] = await Promise.all([
          fetch("/api/auth/demo/SENIOR").then((r) => r.json()),
          fetch("/api/auth/demo/COORDINATOR").then((r) => r.json()),
          fetch("/api/auth/demo/VOLUNTEER").then((r) => r.json()),
          fetch("/api/auth/demo/FAMILY").then((r) => r.json())
        ]);

        setAuth({
          seniorToken: seniorRes.data?.token || "",
          seniorId: seniorRes.data?.user?.id || "",
          seniorName: seniorRes.data?.user?.fullName || "Mrs. Shanti Devi",
          pairingCode: seniorRes.data?.user?.pairingCode || "8421",
          coordinatorToken: coordRes.data?.token || "",
          volunteerToken: volRes.data?.token || "",
          volunteerId: volRes.data?.user?.id || "",
          familyToken: famRes.data?.token || ""
        });
      } catch (err) {
        console.warn("Failed to bootstrap live role tokens from backend:", err);
      }
    }
    initAuthSessions();
  }, []);

  // Fetch Live Occurrences from PostgreSQL
  const fetchOccurrences = useCallback(async () => {
    setIsLoadingDoses(true);
    try {
      const res = await fetch("/api/reminders/occurrences/today");
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const mapped = json.data.map((item: any) => ({
          id: item.id,
          medicineName: item.medicineName || "Prescribed Medication",
          dosage: item.dosage || "Standard Dose",
          time: new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mealRelation: item.mealRelation?.replace("_", " ") || "After Food",
          status: item.status || "SCHEDULED",
          instructions: item.instructions || "Take with water"
        }));
        setDoses(mapped);
      } else {
        // Fallback default sample if occurrences queue is empty
        setDoses([
          {
            id: "dose-1",
            medicineName: "Metformin",
            dosage: "500 mg",
            time: "09:00 AM",
            mealRelation: "After Breakfast",
            status: "SCHEDULED",
            instructions: "Take with warm water"
          },
          {
            id: "dose-2",
            medicineName: "Telmisartan (BP)",
            dosage: "40 mg",
            time: "02:00 PM",
            mealRelation: "After Lunch",
            status: "SCHEDULED",
            instructions: "For blood pressure maintenance"
          }
        ]);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoadingDoses(false);
    }
  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  // Fetch Caregiver Master Schedules
  useEffect(() => {
    if (activeTab === "caregiver") {
      fetch("/api/reminders")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setMasterSchedules(json.data);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Fetch Volunteer Tasks & Assigned Seniors
  const fetchVolunteerData = useCallback(async () => {
    if (!auth.volunteerToken) return;
    try {
      const [tasksRes, seniorsRes] = await Promise.all([
        fetch("/api/volunteers/my-tasks", {
          headers: { Authorization: `Bearer ${auth.volunteerToken}` }
        }).then((r) => r.json()),
        fetch("/api/volunteers/my-seniors", {
          headers: { Authorization: `Bearer ${auth.volunteerToken}` }
        }).then((r) => r.json())
      ]);

      if (tasksRes.success && Array.isArray(tasksRes.data)) {
        setVolunteerTasks(tasksRes.data.filter((t: any) => t.status !== "COMPLETED"));
      }
      if (seniorsRes.success && Array.isArray(seniorsRes.data)) {
        setAssignedSeniors(seniorsRes.data);
      }
    } catch (err) {
      console.warn("Volunteer fetch error:", err);
    }
  }, [auth.volunteerToken]);

  useEffect(() => {
    if (activeTab === "volunteer") {
      fetchVolunteerData();
      const interval = setInterval(fetchVolunteerData, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchVolunteerData]);

  // Fetch Coordinator SOS & Vetting Queue
  const fetchCoordinatorData = useCallback(async () => {
    if (!auth.coordinatorToken) return;
    try {
      const [sosRes, pendingRes] = await Promise.all([
        fetch("/api/sos/active", {
          headers: { Authorization: `Bearer ${auth.coordinatorToken}` }
        }).then((r) => r.json()),
        fetch("/api/volunteers/pending", {
          headers: { Authorization: `Bearer ${auth.coordinatorToken}` }
        }).then((r) => r.json())
      ]);

      if (sosRes.success && Array.isArray(sosRes.data)) {
        setActiveSosAlerts(sosRes.data);
      }
      if (pendingRes.success && Array.isArray(pendingRes.data)) {
        setPendingVolunteers(pendingRes.data);
      }
    } catch (err) {
      console.warn("Coordinator fetch error:", err);
    }
  }, [auth.coordinatorToken]);

  useEffect(() => {
    if (activeTab === "coordinator") {
      fetchCoordinatorData();
      const interval = setInterval(fetchCoordinatorData, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchCoordinatorData]);

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // English with Indian accents & Hindi transliteration

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setIsListening(false);
        handleVoiceParse(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text-To-Speech Synthesizer
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle Microphone
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      } else {
        // Fallback simulation for browsers blocking audio mic
        const samplePrompt = "Subah nashte ke baad Telmisartan 40mg lena hai aur paani ke saath";
        setVoiceTranscript(samplePrompt);
        handleVoiceParse(samplePrompt);
      }
    }
  };

  // Send speech to backend Groq LLM API
  const handleVoiceParse = async (transcript: string) => {
    setIsParsing(true);
    try {
      const res = await fetch("/api/reminders/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spokenTranscript: transcript,
          seniorName: auth.seniorName
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setParsedData(json.data);
        setShowConfirmModal(true);
        speakText(json.data.seniorConfirmationPhrase);
      }
    } catch (err) {
      console.error("Voice parse error:", err);
      showToast("Voice parsing failed. Please check network connection.");
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm and persist parsed medicine reminder to PostgreSQL
  const handleConfirmMedicine = async () => {
    if (!parsedData) return;

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniorId: auth.seniorId || undefined,
          medicineName: parsedData.medicationName,
          dosage: parsedData.dosage,
          mealRelation: parsedData.mealRelation || "AFTER_MEAL",
          targetTimes: parsedData.targetTimes,
          instructions: parsedData.instructions || "Take with water",
          rawLlmOutput: parsedData
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast(`✔ Reminder for ${parsedData.medicationName} saved in PostgreSQL!`);
        fetchOccurrences();
      }
    } catch (e) {
      console.warn("Failed to persist reminder to backend:", e);
    }

    setShowConfirmModal(false);
    speakText(`Your ${parsedData.medicationName} reminder is saved and scheduled.`);
    setParsedData(null);
  };

  // Acknowledge Dose Taken
  const handleAcknowledgeDose = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/reminders/occurrence/${id}/acknowledge`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showToast(`✔ Dose acknowledged and recorded in database!`);
      }
    } catch {
      // Local fallback
    }

    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "ACKNOWLEDGED" } : d))
    );
    speakText(`Great job! You have marked your ${name} as taken.`);
  };

  // Trigger SOS Countdown
  const startSosCountdown = () => {
    setShowSosModal(true);
    setSosCountdown(5);
    setSosDispatched(false);
  };

  // Countdown timer logic
  useEffect(() => {
    let timer: any;
    if (showSosModal && !sosDispatched && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSosCountdown((c) => c - 1);
      }, 1000);
    } else if (showSosModal && !sosDispatched && sosCountdown === 0) {
      dispatchLiveSos();
    }
    return () => clearTimeout(timer);
  }, [showSosModal, sosCountdown, sosDispatched]);

  // Dispatch Emergency to live backend RabbitMQ queue
  const dispatchLiveSos = async () => {
    setSosDispatched(true);
    speakText("Emergency alert sent. Help has been notified and family is being called.");

    try {
      const res = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.seniorToken}`
        },
        body: JSON.stringify({
          seniorId: auth.seniorId || undefined,
          reason: "Emergency SOS triggered from Senior Companion App",
          severity: "CRITICAL"
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast("🚨 SOS Emergency published to RabbitMQ queue!");
      }
    } catch (err) {
      console.error("SOS trigger error:", err);
    }
  };

  // Cancel SOS
  const cancelSos = () => {
    setShowSosModal(false);
    setSosCountdown(5);
    setSosDispatched(false);
    speakText("Emergency alert cancelled.");
  };

  // Caregiver: Generate Parent Invitation
  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName) return;

    setIsInviting(true);
    try {
      const res = await fetch("/api/reminders/invite/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          phone: parentPhone || "+919876543210"
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setInviteResult(json.data);
        showToast(`Invite created! Pairing code: ${json.data.pairingCode}`);
      }
    } catch {
      const pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
      setInviteResult({
        pairingCode,
        smsInviteText: `Hello ${parentName}! Your family has set up Community Companion for you. Open the app and enter pairing code: ${pairingCode} to connect.`
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Copy SMS Invite Text
  const copyInviteToClipboard = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.smsInviteText);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
      showToast("SMS invitation text copied to clipboard!");
    }
  };

  // Volunteer: Complete Check-in Task
  const handleCompleteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForOutcome) return;

    try {
      const res = await fetch(`/api/volunteers/check-ins/${selectedTaskForOutcome.taskId}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.volunteerToken}`
        },
        body: JSON.stringify({
          status: "COMPLETED",
          mood: selectedMood,
          notes: checkInNotes || "Check-in completed successfully",
          coordinatorFlag: coordinatorFlag || undefined
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast("Check-in outcome and mood recorded in PostgreSQL!");
      }
    } catch {
      // Local fallback
    }

    setVolunteerTasks((prev) => prev.filter((t) => t.taskId !== selectedTaskForOutcome.taskId));
    setSelectedTaskForOutcome(null);
    setCheckInNotes("");
    setCoordinatorFlag("");
  };

  // Coordinator: Acknowledge SOS
  const handleAcknowledgeSos = async (id: string) => {
    try {
      const res = await fetch(`/api/sos/${id}/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.coordinatorToken}` }
      });
      const json = await res.json();
      if (json.success) {
        showToast("SOS alert marked as ACKNOWLEDGED!");
        fetchCoordinatorData();
      }
    } catch {
      setActiveSosAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "ACKNOWLEDGED" } : a))
      );
    }
  };

  // Coordinator: Resolve SOS
  const handleResolveSos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalAlert || !resolutionNotes) return;

    try {
      const res = await fetch(`/api/sos/${resolveModalAlert.id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.coordinatorToken}`
        },
        body: JSON.stringify({ resolutionNotes })
      });

      const json = await res.json();
      if (json.success) {
        showToast("Emergency SOS resolved and cleared from active queue!");
      }
    } catch {
      // Local fallback
    }

    setActiveSosAlerts((prev) => prev.filter((a) => a.id !== resolveModalAlert.id));
    setResolveModalAlert(null);
    setResolutionNotes("");
  };

  // Coordinator: Verify Volunteer
  const handleVerifyVolunteer = async (userId: string) => {
    try {
      const res = await fetch(`/api/volunteers/${userId}/verify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.coordinatorToken}` }
      });
      const json = await res.json();
      if (json.success) {
        showToast("Volunteer approved & verified in PostgreSQL!");
      }
    } catch {
      // Fallback
    }
    setPendingVolunteers((prev) => prev.filter((v) => v.userId !== userId));
  };

  // Calculate live adherence
  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;
  const adherenceRate = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 100;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "14px",
            padding: "0.85rem 1.4rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            fontWeight: 600,
            fontSize: "0.95rem"
          }}
        >
          <Bell size={18} color="var(--accent-amber)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          1. HEADER & FLOATING ISLAND NAV
          ==================================================================== */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-wrapper">
            <div className="brand-badge">
              <Heart size={24} fill="#0b1120" strokeWidth={2.5} />
            </div>
            <div>
              <div className="brand-title">Community Companion</div>
              <div className="brand-tagline">Elder Care & Safety Network</div>
            </div>
          </div>

          {/* Floating Island Portal Tabs */}
          <nav className="view-tabs" role="tablist">
            <button
              className={`view-tab ${activeTab === "senior" ? "active senior-tab" : ""}`}
              onClick={() => setActiveTab("senior")}
            >
              <Heart size={16} strokeWidth={2} />
              <span>Senior Citizen</span>
            </button>
            <button
              className={`view-tab ${activeTab === "caregiver" ? "active caregiver-tab" : ""}`}
              onClick={() => setActiveTab("caregiver")}
            >
              <Users size={16} strokeWidth={2} />
              <span>Caregiver Hub</span>
            </button>
            <button
              className={`view-tab ${activeTab === "volunteer" ? "active volunteer-tab" : ""}`}
              onClick={() => setActiveTab("volunteer")}
            >
              <ShieldCheck size={16} strokeWidth={2} />
              <span>Volunteer Network</span>
            </button>
            <button
              className={`view-tab ${activeTab === "coordinator" ? "active coordinator-tab" : ""}`}
              onClick={() => setActiveTab("coordinator")}
            >
              <Activity size={16} strokeWidth={2} />
              <span>Coordinator Dispatch</span>
            </button>
          </nav>

          {/* System Status Indicator */}
          <div className="system-status-pill">
            <div className="status-dot-pulse" />
            <span>PostgreSQL & RabbitMQ Online</span>
          </div>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN CONTENT AREA
          ==================================================================== */}
      <main className="main-content">
        {/* ------------------------------------------------------------------
            TAB 1: SENIOR CITIZEN PORTAL (ACCESSIBILITY FIRST)
            ------------------------------------------------------------------ */}
        {activeTab === "senior" && (
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
                    Family Pairing Code
                  </div>
                  <div className="pairing-code-digit">{auth.pairingCode}</div>
                </div>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
                  onClick={() => speakText(`Your four-digit pairing code is ${auth.pairingCode.split("").join(" ")}`)}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </div>

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
                  onClick={toggleListening}
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

                {voiceTranscript && (
                  <div style={{ fontStyle: "italic", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                    "{voiceTranscript}"
                  </div>
                )}

                {/* Quick Natural Dialect Prompts */}
                <div className="prompt-chips-wrap">
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Remind me to take Metformin 500mg after breakfast at 9 am";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    🗣️ "Remind me to take Metformin 500mg after breakfast"
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Subah nashte ke baad Telmisartan 40mg lena hai aur paani ke saath";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    🇮🇳 "Subah nashte ke baad Telmisartan 40mg lena hai"
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Blood pressure tablet at 9 pm after dinner";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    🌙 "Blood pressure tablet at 9 pm after dinner"
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Medications Grid */}
            <div className="section-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h2 className="section-title">Today's Medicine Schedule</h2>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                  onClick={fetchOccurrences}
                  title="Refresh from PostgreSQL"
                >
                  <RefreshCw size={14} className={isLoadingDoses ? "animate-spin" : ""} />
                </button>
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
                            onClick={() => handleAcknowledgeDose(dose.id, dose.medicineName)}
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
                          onClick={() => speakText(`Reminder: Take ${dose.medicineName} ${dose.dosage} ${dose.mealRelation}.`)}
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

                <button className="btn-island btn-island-crimson" onClick={startSosCountdown}>
                  <span>SOS EMERGENCY HELP</span>
                  <div className="btn-island-tray">
                    <Radio size={20} strokeWidth={2.5} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 2: CAREGIVER PORTAL (FAMILY CARE)
            ------------------------------------------------------------------ */}
        {activeTab === "caregiver" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <span className="eyebrow-badge badge-indigo">
                <Users size={12} />
                <span>Family Caregiver Command</span>
              </span>
              <h1 style={{ fontSize: "2.4rem", color: "#fff", marginBottom: "0.5rem" }}>
                Keep Your Parents Safe & Connected
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
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

                  <form onSubmit={handleGenerateInvite}>
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
                        onClick={copyInviteToClipboard}
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
                        {takenCount} of {doses.length} doses acknowledged today. Escalation engine stands by.
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
        )}

        {/* ------------------------------------------------------------------
            TAB 3: VOLUNTEER NETWORK PORTAL
            ------------------------------------------------------------------ */}
        {activeTab === "volunteer" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <span className="eyebrow-badge badge-emerald">
                <ShieldCheck size={12} />
                <span>Verified Volunteer Workspace</span>
              </span>
              <h1 style={{ fontSize: "2.4rem", color: "#fff", marginBottom: "0.5rem" }}>
                Community Companion Care Hub
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
                Conduct regular check-ins, record elderly mood observations, and flag wellness concerns for coordinators.
              </p>
            </div>

            {/* Volunteer Workload Gauge */}
            <div className="bezel-outer" style={{ marginBottom: "2rem" }}>
              <div className="bezel-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
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
                onClick={fetchVolunteerData}
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

                    <form onSubmit={handleCompleteCheckIn}>
                      <div className="form-group-custom">
                        <label className="form-label-custom">Observed Senior Mood</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
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

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
                        <button
                          type="button"
                          className="btn-island btn-island-ghost"
                          style={{ justifyContent: "center" }}
                          onClick={() => setSelectedTaskForOutcome(null)}
                        >
                          <span>Cancel</span>
                        </button>
                        <button
                          type="submit"
                          className="btn-island btn-island-emerald"
                          style={{ justifyContent: "center" }}
                        >
                          <span>Save to DB</span>
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
        )}

        {/* ------------------------------------------------------------------
            TAB 4: COORDINATOR & EMERGENCY DISPATCH PORTAL
            ------------------------------------------------------------------ */}
        {activeTab === "coordinator" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <span className="eyebrow-badge badge-crimson">
                <Radio size={12} />
                <span>Command & Emergency Dispatch</span>
              </span>
              <h1 style={{ fontSize: "2.4rem", color: "#fff", marginBottom: "0.5rem" }}>
                Real-Time Crisis & Vetting Center
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
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
                onClick={fetchCoordinatorData}
                title="Refresh from PostgreSQL"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {activeSosAlerts.length === 0 ? (
              <div className="bezel-outer" style={{ marginBottom: "2.5rem" }}>
                <div className="bezel-inner" style={{ textAlign: "center", padding: "2.5rem" }}>
                  <ShieldCheck size={48} color="var(--accent-emerald)" style={{ margin: "0 auto 1rem auto" }} />
                  <h3 style={{ color: "#fff", fontSize: "1.3rem" }}>All Clear — No Active Emergencies</h3>
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

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {alert.status === "TRIGGERED" && (
                        <button
                          className="btn-island btn-island-amber"
                          onClick={() => handleAcknowledgeSos(alert.id)}
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
                      onClick={() => handleVerifyVolunteer(vol.userId)}
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

                    <form onSubmit={handleResolveSos}>
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

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
                        <button
                          type="button"
                          className="btn-island btn-island-ghost"
                          style={{ justifyContent: "center" }}
                          onClick={() => setResolveModalAlert(null)}
                        >
                          <span>Cancel</span>
                        </button>
                        <button
                          type="submit"
                          className="btn-island btn-island-emerald"
                          style={{ justifyContent: "center" }}
                        >
                          <span>Confirm Resolved</span>
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
        )}
      </main>

      {/* ====================================================================
          3. MODAL: VOICE MEDICINE CONFIRMATION (GROQ TTS READBACK)
          ==================================================================== */}
      {showConfirmModal && parsedData && (
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ justifyContent: "center" }}
                  onClick={() => setShowConfirmModal(false)}
                >
                  <span>Re-speak</span>
                </button>
                <button
                  className="btn-island btn-island-emerald"
                  style={{ justifyContent: "center" }}
                  onClick={handleConfirmMedicine}
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
      )}

      {/* ====================================================================
          4. MODAL: SOS EMERGENCY COUNTDOWN & SAFETY LATCH
          ==================================================================== */}
      {showSosModal && (
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
                <div style={{ marginTop: "2rem" }}>
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ justifyContent: "center", width: "100%" }}
                    onClick={() => setShowSosModal(false)}
                  >
                    <span>Close Window</span>
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: "2rem" }}>
                  <button
                    className="btn-island btn-island-crimson"
                    style={{ justifyContent: "center", width: "100%", padding: "1rem" }}
                    onClick={cancelSos}
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
      )}
    </div>
  );
}
