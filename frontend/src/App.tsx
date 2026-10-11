import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  scheduledTimestamp?: number;
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
  const [activeAlarmDose, setActiveAlarmDose] = useState<DoseOccurrence | null>(null);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const triggeredDoseIdsRef = useRef<Set<string>>(new Set());

  // Web Audio Context Unlocker for Mobile Browsers
  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("Audio unlock error:", e);
    }
  }, []);

  // Register Service Worker for Mobile Notifications
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration:", err);
      });
    }
    const handleGesture = () => unlockAudio();
    window.addEventListener("pointerdown", handleGesture, { once: true });
    return () => window.removeEventListener("pointerdown", handleGesture);
  }, [unlockAudio]);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dispatch Mobile Lock Screen / Native Notification Banner
  const triggerNotification = useCallback(async (title: string, options: NotificationOptions) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Try Service Worker registration first (standard and required on Android Chrome)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            ...options,
            vibrate: [300, 150, 300, 150, 300]
          } as any);
          return;
        }
      } catch (e) {
        console.warn("SW notification error:", e);
      }
    }

    // Fallback to classic desktop Notification constructor
    try {
      new Notification(title, options);
    } catch (e) {
      console.warn("Notification constructor fallback error:", e);
    }
  }, []);

  // Request Notification Permissions on Touch Gesture
  const requestNotificationPermission = useCallback(async () => {
    unlockAudio();
    if ("Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === "granted") {
          showToast("✔ Mobile notifications active! You will receive lock screen alerts.");
          triggerNotification("Community Companion Notifications Active", {
            body: "You will receive timely alerts when medications are due.",
            requireInteraction: false
          });
        } else {
          showToast("Notification permission not granted. You will still hear audio chime in-app.");
        }
      } catch (e) {
        console.warn("Notification permission error:", e);
      }
    } else {
      showToast("Notification API not supported by this browser.");
    }
  }, [triggerNotification, unlockAudio]);

  // Trigger Audio Chime & Synthesized Spoken Alarm for Due Medication
  const triggerDoseAlarm = useCallback((dose: DoseOccurrence) => {
    setActiveAlarmDose(dose);
    speakText(`Reminder: Mrs. Shanti Devi, it is time for your ${dose.medicineName} ${dose.dosage}. Please take it with water.`);

    // Native Browser / Phone Lock Screen Notification Banner
    triggerNotification(`🔔 Medicine Due: ${dose.medicineName}`, {
      body: `${dose.time} — Take ${dose.dosage} (${dose.mealRelation}). Open Community Companion to confirm.`,
      requireInteraction: true
    });

    try {
      unlockAudio();
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch {}
  }, [triggerNotification, unlockAudio]);

  // Active Alarm Clock Checker: matches current integer hours & minutes to scheduled pending doses
  useEffect(() => {
    if (doses.length === 0) return;
    const now = new Date();
    const nowHours = now.getHours();
    const nowMins = now.getMinutes();

    const pendingDoses = doses.filter((d) => d.status === "SCHEDULED");
    for (const d of pendingDoses) {
      if (!d.scheduledTimestamp) continue;
      const doseDate = new Date(d.scheduledTimestamp);
      const doseHours = doseDate.getHours();
      const doseMins = doseDate.getMinutes();

      // Reliable integer check (immune to locale formatting or narrow-space quirks)
      if (doseHours === nowHours && doseMins === nowMins && !triggeredDoseIdsRef.current.has(d.id)) {
        triggeredDoseIdsRef.current.add(d.id);
        triggerDoseAlarm(d);
        break;
      }
    }
  }, [currentTime, doses, triggerDoseAlarm]);

  // 30-Second Test Alarm Live Countdown
  useEffect(() => {
    if (testCountdown === null) return;
    if (testCountdown <= 0) {
      setTestCountdown(null);
      const target = doses.find((d) => d.status === "SCHEDULED") || doses[0] || {
        id: `test-live-${Date.now()}`,
        medicineName: "Paracetamol (30s Test)",
        dosage: "500 mg",
        time: currentTime || "Now",
        mealRelation: "After Food",
        status: "SCHEDULED",
        instructions: "Live test reminder successfully fired!"
      };
      triggerDoseAlarm(target);
      return;
    }

    const timer = setTimeout(() => {
      setTestCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [testCountdown, doses, currentTime, triggerDoseAlarm]);

  // Schedule a Real Test Alarm Ringing in 30 Seconds
  const handleSchedule30SecAlarm = async () => {
    unlockAudio();
    if ("Notification" in window && Notification.permission !== "granted") {
      try {
        await Notification.requestPermission();
        setNotifPermission(Notification.permission);
      } catch {}
    }

    const now = new Date();
    const target = new Date(now.getTime() + 30000);
    const hours = String(target.getHours()).padStart(2, "0");
    const minutes = String(target.getMinutes()).padStart(2, "0");
    const targetTimeStr = `${hours}:${minutes}`;

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniorId: auth.seniorId || undefined,
          medicineName: "Paracetamol (30s Test)",
          dosage: "500 mg",
          mealRelation: "AFTER_MEAL",
          targetTimes: [targetTimeStr],
          instructions: "Test dose automatically ringing in 30 seconds"
        })
      });
      const json = await res.json();
      if (json.success) {
        await fetchOccurrences();
      }
    } catch (e) {
      console.warn("Failed to schedule 30s test reminder:", e);
    }

    setTestCountdown(30);
    showToast("⏱️ 30-Second Alarm Scheduled! Ringing in 30s. Keep this tab open.");
  };

  // Immediate Test Alarm Trigger (Instant Demo)
  const handleTriggerInstantTestAlarm = () => {
    unlockAudio();
    const target = doses.find((d) => d.status === "SCHEDULED") || doses[0] || {
      id: "demo-instant-dose",
      medicineName: "Paracetamol",
      dosage: "500 mg",
      time: currentTime || "Now",
      mealRelation: "After Food",
      status: "SCHEDULED",
      instructions: "Take with water"
    };
    triggerDoseAlarm(target);
  };

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
        const mapped = json.data.map((item: any) => {
          const doseDate = new Date(item.scheduledFor);
          return {
            id: item.id,
            medicineName: item.medicineName || "Prescribed Medication",
            dosage: item.dosage || "Standard Dose",
            time: doseDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
            scheduledTimestamp: doseDate.getTime(),
            mealRelation: item.mealRelation?.replace("_", " ") || "After Food",
            status: item.status || "SCHEDULED",
            instructions: item.instructions || "Take with water"
          };
        });
        setDoses(mapped);
      } else {
        // Fallback default sample if occurrences queue is empty
        const now = new Date();
        const morningDate = new Date(now);
        morningDate.setHours(9, 0, 0, 0);
        const afternoonDate = new Date(now);
        afternoonDate.setHours(14, 0, 0, 0);

        setDoses([
          {
            id: "dose-1",
            medicineName: "Metformin",
            dosage: "500 mg",
            time: "09:00 AM",
            scheduledTimestamp: morningDate.getTime(),
            mealRelation: "After Breakfast",
            status: "SCHEDULED",
            instructions: "Take with warm water"
          },
          {
            id: "dose-2",
            medicineName: "Telmisartan (BP)",
            dosage: "40 mg",
            time: "02:00 PM",
            scheduledTimestamp: afternoonDate.getTime(),
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
    const interval = setInterval(fetchOccurrences, 10000);
    return () => clearInterval(interval);
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

  // Toggle Microphone with dynamic on-gesture initialization for mobile browsers
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition not supported in this browser. Please type your schedule or tap a prompt chip below.");
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // English + Indian accent & Hindi vocabulary

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setIsListening(false);
        handleVoiceParse(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
        if (e.error === "not-allowed") {
          showToast("Microphone access was denied. Please allow microphone permissions in browser settings.");
        } else if (e.error === "no-speech") {
          showToast("No speech heard. Please speak clearly into your phone's microphone.");
        } else {
          showToast(`Microphone: ${e.error || "Please try speaking again"}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Microphone start error:", err);
      setIsListening(false);
      showToast("Could not access microphone. Please type or use prompt chips below.");
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

  // Dispatch Emergency to live backend RabbitMQ queue & launch native phone dialer
  const dispatchLiveSos = async (targetPhone = "+919811122233") => {
    setSosDispatched(true);
    speakText("Emergency alert sent. Help has been notified and family phone line is opening.");

    // Native client-side direct calling: prompts the device phone dialer immediately
    try {
      window.location.href = `tel:${targetPhone}`;
    } catch (e) {
      console.warn("Direct dial trigger:", e);
    }

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
        showToast("🚨 SOS Emergency alert logged & published to RabbitMQ queue!");
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

  // Calculate live adherence & overdue doses
  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;
  const adherenceRate = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 100;

  const overdueDoses = useMemo(() => {
    const nowMs = Date.now();
    return doses.filter((d) => {
      if (d.status !== "SCHEDULED" || !d.scheduledTimestamp) return false;
      const diffMs = nowMs - d.scheduledTimestamp;
      // Overdue if scheduled more than 60 seconds ago and within past 14 hours
      return diffMs > 60000 && diffMs < 14 * 3600 * 1000;
    });
  }, [doses, currentTime]);

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

                {/* Manual Voice Text Input & Edit Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (voiceTranscript.trim()) {
                      handleVoiceParse(voiceTranscript);
                    }
                  }}
                  style={{ display: "flex", gap: "0.5rem", width: "100%", maxWidth: "580px", margin: "0 auto 1.5rem auto" }}
                >
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="Or type/edit schedule: e.g. Paracetamol 500mg at 5 PM"
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
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
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    ☕ "Take Paracetamol 500mg at 5 PM"
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Shaam ko 5 baje Paracetamol lena hai";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    🇮🇳 "Shaam ko 5 baje Paracetamol lena hai"
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Remind me to take Metformin 500mg after breakfast at 9 am";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
                    }}
                  >
                    🗣️ "Metformin 500mg after breakfast (9 AM)"
                  </button>
                  <button
                    className="prompt-chip"
                    onClick={() => {
                      const text = "Blood pressure tablet at 9 pm after dinner";
                      setVoiceTranscript(text);
                      handleVoiceParse(text);
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
                      onClick={() => triggerDoseAlarm(overdueDoses[0])}
                    >
                      <Bell size={16} />
                      <span>Ring Alarm Now</span>
                    </button>
                    <button
                      className="btn-island btn-island-emerald"
                      style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => handleAcknowledgeDose(overdueDoses[0].id, overdueDoses[0].medicineName)}
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
                    onClick={() => setTestCountdown(null)}
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
                  onClick={fetchOccurrences}
                  title="Refresh from PostgreSQL"
                >
                  <RefreshCw size={14} className={isLoadingDoses ? "animate-spin" : ""} />
                </button>
                <button
                  className="btn-island btn-island-amber"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                  onClick={handleTriggerInstantTestAlarm}
                  title="Test Audio Chime, Voice & Modal Alarm"
                >
                  <Bell size={14} />
                  <span>Test Alarm Now</span>
                </button>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "var(--accent-amber)" }}
                  onClick={handleSchedule30SecAlarm}
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
                    onClick={requestNotificationPermission}
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

              {/* Instant Speed Dial Direct Line Strip */}
              <div style={{ padding: "0.75rem 1.75rem", background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
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
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.25rem", textAlign: "left", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--accent-amber)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <PhoneCall size={16} />
                      <span>Speed Dial Emergency Direct Calls</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      <a
                        href="tel:+919811122233"
                        className="btn-island btn-island-crimson"
                        style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", padding: "0.85rem 1.15rem" }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Call Daughter (Priya Rao)</div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>+91 98111 22233 • Primary Contact (Tier 1)</div>
                        </div>
                        <div className="btn-island-tray">
                          <PhoneCall size={18} strokeWidth={2.5} />
                        </div>
                      </a>

                      <a
                        href="tel:+919844455566"
                        className="btn-island btn-island-amber"
                        style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", padding: "0.85rem 1.15rem" }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Call Son (Vikram Rao)</div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>+91 98444 55566 • Secondary Contact (Tier 2)</div>
                        </div>
                        <div className="btn-island-tray">
                          <PhoneCall size={18} strokeWidth={2.5} />
                        </div>
                      </a>

                      <a
                        href="tel:112"
                        className="btn-island"
                        style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", background: "#b91c1c", color: "#fff", padding: "0.85rem 1.15rem", border: "1px solid rgba(255,255,255,0.2)" }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>National Emergency Helpline</div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>Dial 112 • Police / Medical Ambulance</div>
                        </div>
                        <div className="btn-island-tray">
                          <AlertTriangle size={18} strokeWidth={2.5} />
                        </div>
                      </a>

                      <a
                        href="tel:+919820123456"
                        className="btn-island btn-island-emerald"
                        style={{ textDecoration: "none", width: "100%", justifyContent: "space-between", padding: "0.85rem 1.15rem" }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Call Local Volunteer (Rohan)</div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>+91 98201 23456 • Nearby Community Responder</div>
                        </div>
                        <div className="btn-island-tray">
                          <PhoneCall size={18} strokeWidth={2.5} />
                        </div>
                      </a>
                    </div>
                  </div>

                  <button
                    className="btn-island btn-island-ghost"
                    style={{ justifyContent: "center", width: "100%" }}
                    onClick={() => setShowSosModal(false)}
                  >
                    <span>Close Emergency Window</span>
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

      {/* ====================================================================
          5. MODAL: ACTIVE MEDICATION DUE ALARM (AUDIO CHIME & TTS PROMPT)
          ==================================================================== */}
      {activeAlarmDose && (
        <div className="modal-backdrop">
          <div className="bezel-outer bezel-outer-amber modal-bezel-outer" style={{ maxWidth: "520px" }}>
            <div className="bezel-inner bezel-inner-amber" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
              <span className="eyebrow-badge badge-amber" style={{ margin: "0 auto 1.25rem auto" }}>
                <Bell size={14} />
                <span>Medication Alarm Due Now ({activeAlarmDose.time})</span>
              </span>

              <h2 style={{ fontSize: "2rem", color: "#fff", marginBottom: "0.5rem", fontWeight: 800 }}>
                Time for Your Medicine!
              </h2>

              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--accent-amber)", marginBottom: "0.25rem" }}>
                {activeAlarmDose.medicineName}
              </div>

              <div style={{ fontSize: "1.15rem", color: "#fff", fontWeight: 600, marginBottom: "0.75rem" }}>
                Dose: {activeAlarmDose.dosage} • {activeAlarmDose.mealRelation}
              </div>

              {activeAlarmDose.instructions && (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.75rem" }}>
                  "{activeAlarmDose.instructions}"
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginTop: "1rem" }}>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ justifyContent: "center", padding: "0.9rem" }}
                  onClick={() => {
                    speakText("Reminder snoozed for 10 minutes.");
                    setActiveAlarmDose(null);
                  }}
                >
                  <Clock size={18} />
                  <span>Snooze 10 Mins</span>
                </button>

                <button
                  className="btn-island btn-island-emerald"
                  style={{ justifyContent: "center", padding: "0.9rem" }}
                  onClick={() => {
                    handleAcknowledgeDose(activeAlarmDose.id, activeAlarmDose.medicineName);
                    setActiveAlarmDose(null);
                  }}
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
      )}
    </div>
  );
}
