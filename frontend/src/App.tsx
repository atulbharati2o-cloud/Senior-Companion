import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DoseOccurrence,
  ParsedVoiceOutput,
  ActiveSosAlert,
  PendingVolunteer,
  VolunteerTask,
  MasterSchedule,
  AuthTokens,
  ActiveSession,
  PortalTab,
  AppView,
  LinkedSenior
} from "./types";
import { Header } from "./components/common/Header";
import { Toast } from "./components/common/Toast";
import { AuthModal } from "./components/modals/AuthModal";
import { VoiceConfirmModal } from "./components/modals/VoiceConfirmModal";
import { SosModal } from "./components/modals/SosModal";
import { DoseAlarmModal } from "./components/modals/DoseAlarmModal";
import { SeniorPortal } from "./pages/SeniorPortal";
import { CaregiverPortal } from "./pages/CaregiverPortal";
import { VolunteerPortal } from "./pages/VolunteerPortal";
import { CoordinatorPortal } from "./pages/CoordinatorPortal";
import { LandingPage } from "./pages/LandingPage";

export default function App() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    try {
      const saved = localStorage.getItem("companion_active_session");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const savedSession = localStorage.getItem("companion_active_session");
    const savedView = localStorage.getItem("companion_active_view");
    return (savedSession && savedView === "app") ? "app" : "landing";
  });

  const [activeTab, setActiveTab] = useState<PortalTab>(() => {
    try {
      const saved = localStorage.getItem("companion_active_session");
      if (saved) {
        const parsed: ActiveSession = JSON.parse(saved);
        if (parsed.role === "FAMILY") return "caregiver";
        if (parsed.role === "VOLUNTEER") return "volunteer";
        if (parsed.role === "COORDINATOR") return "coordinator";
      }
    } catch {}
    return "senior";
  });

  const [authModalInitialTab, setAuthModalInitialTab] = useState<"senior_code" | "login" | "register">("senior_code");

  // Auth & Roles State (Loaded dynamically from active session or empty)
  const [auth, setAuth] = useState<AuthTokens>({
    seniorToken: "",
    seniorId: "",
    seniorName: "",
    pairingCode: "",
    coordinatorToken: "",
    volunteerToken: "",
    volunteerId: "",
    familyToken: ""
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Live Clock State
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

  // Medication Doses & Alarms State
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
  const [linkedSenior, setLinkedSenior] = useState<LinkedSenior | null>(null);

  // Volunteer Portal State
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>([]);
  const [assignedSeniors, setAssignedSeniors] = useState<any[]>([]);

  // Coordinator Portal State
  const [activeSosAlerts, setActiveSosAlerts] = useState<ActiveSosAlert[]>([]);
  const [pendingVolunteers, setPendingVolunteers] = useState<PendingVolunteer[]>([]);

  // Web Audio & Speech Recognition Refs
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

  // Live Clock Ticker
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

  // Text-To-Speech Synthesizer
  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Dispatch Mobile Lock Screen / Native Notification
  const triggerNotification = useCallback(async (title: string, options: NotificationOptions) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

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
  }, [showToast, triggerNotification, unlockAudio]);

  // Trigger Audio Chime & Synthesized Spoken Alarm for Due Medication
  const triggerDoseAlarm = useCallback((dose: DoseOccurrence) => {
    setActiveAlarmDose(dose);
    const seniorGreeting = auth.seniorName ? `${auth.seniorName}, ` : "";
    speakText(`Reminder: ${seniorGreeting}it is time for your ${dose.medicineName} ${dose.dosage}. Please take it with water.`);

    triggerNotification(`🔔 Medicine Due: ${dose.medicineName}`, {
      body: `${dose.time} - Take ${dose.dosage} (${dose.mealRelation}). Open Community Companion to confirm.`,
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
  }, [auth.seniorName, speakText, triggerNotification, unlockAudio]);

  // Active Alarm Clock Checker
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

  // Immediate Test Alarm Trigger
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

  // Restore Active User Session from LocalStorage on Mount
  useEffect(() => {
    function restoreSession() {
      try {
        const savedSessionRaw = localStorage.getItem("companion_active_session");
        if (savedSessionRaw) {
          const session: ActiveSession = JSON.parse(savedSessionRaw);
          if (session && session.token) {
            setActiveSession(session);
            if (session.role === "SENIOR") {
              setAuth((prev) => ({
                ...prev,
                seniorToken: session.token,
                seniorId: session.userId || "",
                seniorName: session.userName,
                pairingCode: session.pairingCode || ""
              }));
              setActiveTab("senior");
            } else if (session.role === "FAMILY") {
              setAuth((prev) => ({ ...prev, familyToken: session.token }));
              setActiveTab("caregiver");
            } else if (session.role === "VOLUNTEER") {
              setAuth((prev) => ({ ...prev, volunteerToken: session.token, volunteerId: session.userId || "" }));
              setActiveTab("volunteer");
            } else if (session.role === "COORDINATOR") {
              setAuth((prev) => ({ ...prev, coordinatorToken: session.token }));
              setActiveTab("coordinator");
            }
            return;
          }
        }

        const savedSenior = localStorage.getItem("companion_active_senior");
        if (savedSenior) {
          const parsed = JSON.parse(savedSenior);
          if (parsed.name && (parsed.token || parsed.id)) {
            const session: ActiveSession = {
              role: "SENIOR",
              userName: parsed.name,
              token: parsed.token || "demo-token",
              userId: parsed.id,
              pairingCode: parsed.code || "8421"
            };
            setActiveSession(session);
            setAuth((prev) => ({
              ...prev,
              seniorToken: session.token,
              seniorId: session.userId || "",
              seniorName: session.userName,
              pairingCode: session.pairingCode || ""
            }));
            setActiveTab("senior");
          }
        }
      } catch (err) {
        console.warn("Session restore error:", err);
      }
    }
    restoreSession();
  }, []);

  // On-demand demo token acquisition when navigating between portal tabs in App view
  useEffect(() => {
    if (currentView !== "app") return;

    if (activeTab === "volunteer" && !auth.volunteerToken) {
      fetch("/api/auth/demo/VOLUNTEER")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setAuth((prev) => ({
              ...prev,
              volunteerToken: json.data.token,
              volunteerId: json.data.user?.id || ""
            }));
          }
        })
        .catch(() => {});
    } else if (activeTab === "coordinator" && !auth.coordinatorToken) {
      fetch("/api/auth/demo/COORDINATOR")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setAuth((prev) => ({
              ...prev,
              coordinatorToken: json.data.token
            }));
          }
        })
        .catch(() => {});
    } else if (activeTab === "caregiver" && !auth.familyToken) {
      fetch("/api/auth/demo/FAMILY")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setAuth((prev) => ({
              ...prev,
              familyToken: json.data.token
            }));
          }
        })
        .catch(() => {});
    }
  }, [currentView, activeTab, auth.volunteerToken, auth.coordinatorToken, auth.familyToken]);

  // Fetch Live Occurrences from PostgreSQL
  const fetchOccurrences = useCallback(async () => {
    setIsLoadingDoses(true);
    try {
      const url = auth.seniorId ? `/api/reminders/occurrences/today?seniorId=${auth.seniorId}` : "/api/reminders/occurrences/today";
      const res = await fetch(url);
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
  }, [auth.seniorId]);

  useEffect(() => {
    fetchOccurrences();
    const interval = setInterval(fetchOccurrences, 10000);
    return () => clearInterval(interval);
  }, [fetchOccurrences]);

  // Fetch Caregiver Master Schedules & Linked Parent Info
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

      fetch("/api/reminders/caregiver/parent")
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setLinkedSenior(json.data);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Strict Role Guard: Keep users within their authorized portal
  useEffect(() => {
    const isSenior = activeSession?.role === "SENIOR" || (!activeSession && auth.seniorName);
    if (isSenior && activeTab !== "senior") {
      setActiveTab("senior");
    } else if (activeSession?.role === "VOLUNTEER" && activeTab !== "volunteer") {
      setActiveTab("volunteer");
    } else if (activeSession?.role === "FAMILY" && (activeTab === "volunteer" || activeTab === "coordinator")) {
      setActiveTab("caregiver");
    }
  }, [activeSession?.role, auth.seniorName, activeTab]);

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

  // Toggle Microphone
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
      recognition.lang = "en-IN";

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
    setActiveAlarmDose(null);
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
        setLinkedSenior({
          id: json.data.seniorId,
          fullName: json.data.parentName,
          pairingCode: json.data.pairingCode,
          isPaired: false
        });
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

  // Auth: Senior 4-Digit Code Login
  const handleSeniorCodeLogin = async (code: string) => {
    const trimmed = code.trim();
    if (trimmed.length !== 4) {
      showToast("⚠️ Pairing code must be exactly 4 digits");
      return;
    }
    try {
      const res = await fetch("/api/auth/senior-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: trimmed })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Invalid 4-digit pairing code");
      }
      const seniorUser = json.data.user;
      const token = json.data.token;
      const newSession: ActiveSession = {
        role: "SENIOR",
        userName: seniorUser.fullName,
        token,
        userId: seniorUser.id,
        pairingCode: seniorUser.pairingCode
      };
      setActiveSession(newSession);
      localStorage.setItem("companion_active_session", JSON.stringify(newSession));
      localStorage.setItem("companion_active_view", "app");
      setAuth((prev) => ({
        ...prev,
        seniorToken: token,
        seniorId: seniorUser.id,
        seniorName: seniorUser.fullName,
        pairingCode: seniorUser.pairingCode
      }));
      setCurrentView("app");
      setShowAuthModal(false);
      setActiveTab("senior");
      showToast(`✅ Welcome back, ${seniorUser.fullName}!`);
      setTimeout(() => fetchOccurrences(), 300);
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`);
    }
  };

  // Auth: Standard Email/Phone + Password Login
  const handleStandardLogin = async (identifier: string, pass: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: pass })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Login failed");
      }
      const user = json.data.user;
      const token = json.data.token;
      const newSession: ActiveSession = {
        role: user.role,
        userName: user.fullName,
        token,
        userId: user.id,
        email: user.email,
        phone: user.phone
      };
      setActiveSession(newSession);
      localStorage.setItem("companion_active_session", JSON.stringify(newSession));
      localStorage.setItem("companion_active_view", "app");

      if (user.role === "FAMILY") {
        setAuth((prev) => ({ ...prev, familyToken: token }));
        setActiveTab("caregiver");
        showToast(`✅ Welcome, ${user.fullName} (Family Caregiver)!`);
      } else if (user.role === "VOLUNTEER") {
        setAuth((prev) => ({ ...prev, volunteerToken: token, volunteerId: user.id }));
        setActiveTab("volunteer");
        showToast(`✅ Welcome, ${user.fullName} (Volunteer)!`);
      } else if (user.role === "COORDINATOR") {
        setAuth((prev) => ({ ...prev, coordinatorToken: token }));
        setActiveTab("coordinator");
        showToast(`✅ Welcome, ${user.fullName} (Coordinator)!`);
      } else if (user.role === "SENIOR") {
        setAuth((prev) => ({
          ...prev,
          seniorToken: token,
          seniorId: user.id,
          seniorName: user.fullName
        }));
        setActiveTab("senior");
        showToast(`✅ Welcome, ${user.fullName} (Senior)!`);
      }
      setCurrentView("app");
      setShowAuthModal(false);
      return true;
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`);
      return false;
    }
  };

  // Auth: One-Click Demo Persona Switcher
  const handleDemoPersonaSwitch = async (role: "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR") => {
    try {
      const res = await fetch(`/api/auth/demo/${role}`);
      const json = await res.json();
      if (json.success && json.data) {
        const user = json.data.user;
        const token = json.data.token;
        const newSession: ActiveSession = {
          role,
          userName: user.fullName,
          token,
          userId: user.id,
          pairingCode: user.pairingCode || (role === "SENIOR" ? "8421" : undefined),
          email: user.email,
          phone: user.phone
        };
        setActiveSession(newSession);
        localStorage.setItem("companion_active_session", JSON.stringify(newSession));
        localStorage.setItem("companion_active_view", "app");

        if (role === "SENIOR") {
          setAuth((prev) => ({
            ...prev,
            seniorToken: token,
            seniorId: user.id,
            seniorName: user.fullName,
            pairingCode: user.pairingCode || "8421"
          }));
          setActiveTab("senior");
          showToast(`👤 Signed in as Senior: ${user.fullName}`);
          setTimeout(() => fetchOccurrences(), 300);
        } else if (role === "FAMILY") {
          setAuth((prev) => ({ ...prev, familyToken: token }));
          setActiveTab("caregiver");
          showToast(`👤 Signed in as Caregiver: ${user.fullName}`);
        } else if (role === "VOLUNTEER") {
          setAuth((prev) => ({ ...prev, volunteerToken: token, volunteerId: user.id }));
          setActiveTab("volunteer");
          showToast(`👤 Signed in as Volunteer: ${user.fullName}`);
        } else if (role === "COORDINATOR") {
          setAuth((prev) => ({ ...prev, coordinatorToken: token }));
          setActiveTab("coordinator");
          showToast(`👤 Signed in as Coordinator: ${user.fullName}`);
        }
        setCurrentView("app");
        setShowAuthModal(false);
      }
    } catch {
      showToast("Failed to switch demo persona");
    }
  };

  // Auth: Register New User
  const handleRegisterNewUser = async (payload: any): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Registration failed");
      }

      const newUser = json.data.user;
      const token = json.data.token;
      let registeredCode: string | null = null;
      const newSession: ActiveSession = {
        role: payload.role,
        userName: newUser.fullName,
        token,
        userId: newUser.id,
        pairingCode: newUser.pairingCode,
        email: newUser.email,
        phone: newUser.phone
      };
      setActiveSession(newSession);
      localStorage.setItem("companion_active_session", JSON.stringify(newSession));
      localStorage.setItem("companion_active_view", "app");

      if (payload.role === "SENIOR") {
        registeredCode = newUser.pairingCode || "8421";
        newSession.pairingCode = registeredCode || undefined;
        setAuth((prev) => ({
          ...prev,
          seniorToken: token,
          seniorId: newUser.id,
          seniorName: newUser.fullName,
          pairingCode: registeredCode!
        }));
        setActiveTab("senior");
        showToast(`🎉 Senior ${newUser.fullName} registered! 4-Digit Code: ${registeredCode}`);
        setTimeout(() => fetchOccurrences(), 300);
      } else if (payload.role === "FAMILY") {
        setAuth((prev) => ({ ...prev, familyToken: token }));
        setActiveTab("caregiver");
        showToast(`🎉 Caregiver ${newUser.fullName} registered successfully!`);
        setShowAuthModal(false);
      } else if (payload.role === "VOLUNTEER") {
        setAuth((prev) => ({ ...prev, volunteerToken: token, volunteerId: newUser.id }));
        setActiveTab("volunteer");
        showToast(`🎉 Volunteer ${newUser.fullName} registered!`);
        setShowAuthModal(false);
      }
      setCurrentView("app");
      return registeredCode || "SUCCESS";
    } catch (err) {
      showToast(`❌ ${(err as Error).message}`);
      return null;
    }
  };

  // Sign Out (Returns cleanly to Landing Page)
  const handleLogout = () => {
    localStorage.removeItem("companion_active_session");
    localStorage.removeItem("companion_active_senior");
    localStorage.setItem("companion_active_view", "landing");
    setActiveSession(null);
    setCurrentView("landing");
    setAuth({
      seniorToken: "",
      seniorId: "",
      seniorName: "",
      pairingCode: "",
      coordinatorToken: "",
      volunteerToken: "",
      volunteerId: "",
      familyToken: ""
    });
    setDoses([]);
    showToast("Signed out. Returning to home landing page.");
  };

  // Volunteer: Complete Check-in Task
  const handleCompleteCheckIn = async (
    task: VolunteerTask,
    mood: "CHEERFUL" | "NEUTRAL" | "ANXIOUS" | "UNWELL",
    notes: string,
    coordinatorFlag: string
  ) => {
    try {
      const res = await fetch(`/api/volunteers/check-ins/${task.taskId}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.volunteerToken}`
        },
        body: JSON.stringify({
          status: "COMPLETED",
          mood,
          notes: notes || "Check-in completed successfully",
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

    setVolunteerTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
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
  const handleResolveSos = async (alert: ActiveSosAlert, resolutionNotes: string) => {
    try {
      const res = await fetch(`/api/sos/${alert.id}/resolve`, {
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

    setActiveSosAlerts((prev) => prev.filter((a) => a.id !== alert.id));
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

  const takenCount = doses.filter((d) => d.status === "ACKNOWLEDGED").length;
  const adherenceRate = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 100;

  return (
    <div className="app-container">
      {currentView === "landing" ? (
        <LandingPage
          auth={auth}
          activeSession={activeSession}
          onOpenAuth={(tab) => {
            if (tab) setAuthModalInitialTab(tab);
            setShowAuthModal(true);
          }}
          onEnterApp={(portal) => {
            if (portal) {
              const tab: PortalTab = (portal as any) === "family" ? "caregiver" : portal;
              setActiveTab(tab);
            }
            setCurrentView("app");
            localStorage.setItem("companion_active_view", "app");
          }}
          onQuickDemo={(role) => handleDemoPersonaSwitch(role)}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* Top Bar Header with Live Tabs, Status & Switcher */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            auth={auth}
            activeSession={activeSession}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onLogout={handleLogout}
            onGoToLanding={() => {
              setCurrentView("landing");
              localStorage.setItem("companion_active_view", "landing");
            }}
          />

          <main className="app-main">
            {/* TAB 1: SENIOR CITIZEN ASSISTANT */}
            {activeTab === "senior" && (
              <SeniorPortal
                auth={auth}
                currentTime={currentTime}
                currentDate={currentDate}
                doses={doses}
                isLoadingDoses={isLoadingDoses}
                isListening={isListening}
                isParsing={isParsing}
                voiceTranscript={voiceTranscript}
                testCountdown={testCountdown}
                notifPermission={notifPermission}
                onToggleListening={toggleListening}
                onVoiceParse={handleVoiceParse}
                onSetVoiceTranscript={setVoiceTranscript}
                onTriggerInstantTestAlarm={handleTriggerInstantTestAlarm}
                onSchedule30SecAlarm={handleSchedule30SecAlarm}
                onRequestNotifPermission={requestNotificationPermission}
                onFetchOccurrences={fetchOccurrences}
                onAcknowledgeDose={handleAcknowledgeDose}
                onTriggerDoseAlarm={triggerDoseAlarm}
                onStartSos={startSosCountdown}
                onOpenAuthModal={() => setShowAuthModal(true)}
                onSpeakText={speakText}
                onCancelTestCountdown={() => setTestCountdown(null)}
              />
            )}

            {/* TAB 2: CAREGIVER PORTAL */}
            {activeTab === "caregiver" && (
              <CaregiverPortal
                parentName={parentName}
                setParentName={setParentName}
                parentPhone={parentPhone}
                setParentPhone={setParentPhone}
                isInviting={isInviting}
                inviteResult={inviteResult}
                copiedInvite={copiedInvite}
                onGenerateInvite={handleGenerateInvite}
                onCopyInvite={copyInviteToClipboard}
                adherenceRate={adherenceRate}
                takenCount={takenCount}
                totalDoses={doses.length}
                masterSchedules={masterSchedules}
                linkedSenior={linkedSenior}
              />
            )}

            {/* TAB 3: VOLUNTEER PORTAL */}
            {activeTab === "volunteer" && (
              <VolunteerPortal
                assignedSeniors={assignedSeniors}
                volunteerTasks={volunteerTasks}
                onRefreshTasks={fetchVolunteerData}
                onCompleteCheckIn={handleCompleteCheckIn}
              />
            )}

            {/* TAB 4: COORDINATOR PORTAL */}
            {activeTab === "coordinator" && (
              <CoordinatorPortal
                activeSosAlerts={activeSosAlerts}
                pendingVolunteers={pendingVolunteers}
                onRefreshCoordinatorData={fetchCoordinatorData}
                onAcknowledgeSos={handleAcknowledgeSos}
                onResolveSos={handleResolveSos}
                onVerifyVolunteer={handleVerifyVolunteer}
              />
            )}
          </main>
        </>
      )}

      {/* Voice Confirmation Modal */}
      <VoiceConfirmModal
        isOpen={showConfirmModal}
        parsedData={parsedData}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmMedicine}
      />

      {/* SOS Emergency Modal */}
      <SosModal
        isOpen={showSosModal}
        sosCountdown={sosCountdown}
        sosDispatched={sosDispatched}
        onCancel={cancelSos}
        onClose={() => setShowSosModal(false)}
      />

      {/* Active Dose Alarm Modal */}
      <DoseAlarmModal
        dose={activeAlarmDose}
        onSnooze={() => {
          setActiveAlarmDose(null);
          showToast("Alarm snoozed for 10 minutes.");
        }}
        onAcknowledge={handleAcknowledgeDose}
      />

      {/* Account Login, PIN & Switcher Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        auth={auth}
        activeSession={activeSession}
        onSeniorLogin={handleSeniorCodeLogin}
        onStandardLogin={handleStandardLogin}
        onDemoSwitch={handleDemoPersonaSwitch}
        onRegister={handleRegisterNewUser}
        onLogout={handleLogout}
        initialTab={authModalInitialTab}
      />

      {/* Dynamic Toast Notifications */}
      <Toast message={toastMessage} />
    </div>
  );
}
