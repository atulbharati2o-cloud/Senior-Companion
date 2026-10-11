import React, { useState } from "react";
import {
  KeyRound,
  LogIn,
  LogOut,
  UserPlus,
  Users,
  ShieldCheck,
  Activity,
  Heart,
  CheckCircle2,
  X
} from "lucide-react";
import { AuthTokens, ActiveSession } from "../../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthTokens;
  activeSession?: ActiveSession | null;
  onSeniorLogin: (code: string) => Promise<void>;
  onStandardLogin: (identifier: string, pass: string) => Promise<void>;
  onDemoSwitch: (role: "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR") => Promise<void>;
  onRegister: (payload: any) => Promise<string | null>;
  onLogout: () => void;
  initialTab?: "senior_code" | "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  auth,
  activeSession,
  onSeniorLogin,
  onStandardLogin,
  onDemoSwitch,
  onRegister,
  onLogout,
  initialTab = "senior_code"
}) => {
  const [tab, setTab] = useState<"senior_code" | "login" | "register">(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Senior PIN
  const [seniorCodeInput, setSeniorCodeInput] = useState("");
  const [isLoggingInSenior, setIsLoggingInSenior] = useState(false);

  // Standard Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register
  const [regFullName, setRegFullName] = useState("");
  const [regRole, setRegRole] = useState<"SENIOR" | "FAMILY" | "VOLUNTEER">("SENIOR");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLanguage, setRegLanguage] = useState("Hindi");
  const [regPincode, setRegPincode] = useState("400050");
  const [isRegistering, setIsRegistering] = useState(false);
  const [newPairingCode, setNewPairingCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSeniorSubmit = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const code = directCode || seniorCodeInput;
    setIsLoggingInSenior(true);
    try {
      await onSeniorLogin(code);
      setSeniorCodeInput("");
    } finally {
      setIsLoggingInSenior(false);
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await onStandardLogin(loginIdentifier, loginPassword);
      setLoginIdentifier("");
      setLoginPassword("");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const code = await onRegister({
        fullName: regFullName.trim(),
        role: regRole,
        email: regEmail.trim() || undefined,
        phone: regPhone.trim() || undefined,
        password: regPassword.trim() || (regRole !== "SENIOR" ? "Companion@123" : undefined),
        preferredLanguage: regLanguage,
        pincode: regPincode || undefined
      });
      if (regRole === "SENIOR" && code) {
        setNewPairingCode(code);
      } else {
        onClose();
      }
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="bezel-outer bezel-outer-amber modal-bezel-outer" style={{ maxWidth: "580px" }}>
        <div className="bezel-inner bezel-inner-amber" style={{ padding: "2rem" }}>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <span className="eyebrow-badge badge-amber" style={{ margin: "0 0 0.5rem 0" }}>
                <KeyRound size={12} />
                <span>Identity & Profile Access</span>
              </span>
              <h2 style={{ fontSize: "1.6rem", color: "#fff", fontWeight: 800 }}>
                Switch Account or Log In
              </h2>
            </div>
            <button
              className="btn-island btn-island-ghost"
              style={{ padding: "0.4rem", borderRadius: "50%" }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Profile Bar - Only shown if an active session or senior account exists */}
          {(activeSession || auth.seniorName) && (
            <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1.25rem", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Active Account</div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>{activeSession?.userName || auth.seniorName}</span>
                  <span className="eyebrow-badge badge-amber" style={{ margin: 0, padding: "0.15rem 0.5rem", fontSize: "0.65rem" }}>
                    {activeSession?.role || "SENIOR"}
                  </span>
                </div>
                {(activeSession?.pairingCode || auth.pairingCode) && (
                  <div style={{ fontSize: "0.8rem", color: "var(--accent-amber)", marginTop: "0.2rem" }}>
                    Senior Pairing Code: <strong>{activeSession?.pairingCode || auth.pairingCode}</strong>
                  </div>
                )}
              </div>
              <button
                className="btn-island"
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                title="Sign Out"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Modal Tabs */}
          <div className="auth-nav-tabs">
            <button
              className={`auth-nav-tab ${tab === "senior_code" ? "active" : ""}`}
              onClick={() => { setTab("senior_code"); setNewPairingCode(null); }}
            >
              <KeyRound size={14} />
              <span>Senior 4-Digit Code</span>
            </button>
            <button
              className={`auth-nav-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setNewPairingCode(null); }}
            >
              <LogIn size={14} />
              <span>Email/Password</span>
            </button>
            <button
              className={`auth-nav-tab ${tab === "register" ? "active" : ""}`}
              onClick={() => { setTab("register"); setNewPairingCode(null); }}
            >
              <UserPlus size={14} />
              <span>Register New</span>
            </button>
          </div>

          {/* TAB 1: SENIOR 4-DIGIT CODE LOGIN */}
          {tab === "senior_code" && (
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1.25rem", textAlign: "center" }}>
                Designed for elderly accessibility. Enter your 4-digit numeric code to load your medications and voice profile.
              </p>

              <form onSubmit={handleSeniorSubmit}>
                <input
                  type="text"
                  className="code-input-giant"
                  maxLength={4}
                  placeholder="8421"
                  value={seniorCodeInput}
                  onChange={(e) => setSeniorCodeInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  autoFocus
                />

                <button
                  type="submit"
                  className="btn-island btn-island-amber"
                  style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }}
                  disabled={isLoggingInSenior || seniorCodeInput.length !== 4}
                >
                  <LogIn size={18} />
                  <span>{isLoggingInSenior ? "Verifying Code..." : "Sign In with 4-Digit Code"}</span>
                </button>
              </form>

              <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                  Testing the app? Tap to sign in instantly with the seeded senior account:
                </div>
                <button
                  type="button"
                  className="btn-island btn-island-amber"
                  style={{ margin: "0 auto", padding: "0.55rem 1.1rem", fontSize: "0.88rem", fontWeight: 700 }}
                  onClick={() => handleSeniorSubmit(undefined, "8421")}
                  disabled={isLoggingInSenior}
                >
                  <Heart size={16} fill="currentColor" />
                  <span>1-Tap Demo: Sign In as Dadaji / Mrs. Shanti Devi (PIN: 8421)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL / PHONE + PASSWORD LOGIN */}
          {tab === "login" && (
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "1rem" }}>
                For Family Caregivers, Volunteers, and NGO Emergency Coordinators.
              </p>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  Quick Fill Demo Credentials:
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="prompt-chip"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    onClick={() => {
                      setLoginIdentifier("priya.rao@family.companion");
                      setLoginPassword("Companion@123");
                    }}
                  >
                    👩 Priya Rao (Caregiver)
                  </button>
                  <button
                    type="button"
                    className="prompt-chip"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    onClick={() => {
                      setLoginIdentifier("rohan.vol@companion.org");
                      setLoginPassword("Companion@123");
                    }}
                  >
                    🤝 Rohan K. (Volunteer)
                  </button>
                  <button
                    type="button"
                    className="prompt-chip"
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    onClick={() => {
                      setLoginIdentifier("anita.coord@ngo.org");
                      setLoginPassword("Companion@123");
                    }}
                  >
                    🚨 Anita D. (Coordinator)
                  </button>
                </div>
              </div>

              <form onSubmit={handleStandardSubmit}>
                <div className="form-group-custom">
                  <label className="form-label-custom">Email or Phone Number</label>
                  <input
                    className="form-input-custom"
                    type="text"
                    placeholder="e.g. priya.rao@family.companion or +919811122233"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">Password</label>
                  <input
                    className="form-input-custom"
                    type="password"
                    placeholder="Enter password (e.g. Companion@123)"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-island btn-island-amber"
                  style={{ width: "100%", justifyContent: "center", padding: "0.85rem", marginTop: "0.5rem" }}
                  disabled={isLoggingIn}
                >
                  <LogIn size={18} />
                  <span>{isLoggingIn ? "Authenticating..." : "Sign In to Portal"}</span>
                </button>
              </form>

              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Instant 1-Click Demo Profiles:
                </div>
                <div className="quick-persona-grid">
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", justifyContent: "flex-start" }}
                    onClick={() => onDemoSwitch("FAMILY")}
                  >
                    <Users size={14} color="#818cf8" />
                    <span>Priya Rao (Caregiver)</span>
                  </button>
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", justifyContent: "flex-start" }}
                    onClick={() => onDemoSwitch("VOLUNTEER")}
                  >
                    <ShieldCheck size={14} color="#34d399" />
                    <span>Rohan K. (Volunteer)</span>
                  </button>
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", justifyContent: "flex-start" }}
                    onClick={() => onDemoSwitch("COORDINATOR")}
                  >
                    <Activity size={14} color="#f87171" />
                    <span>Anita D. (Coordinator)</span>
                  </button>
                  <button
                    className="btn-island btn-island-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", justifyContent: "flex-start" }}
                    onClick={() => onDemoSwitch("SENIOR")}
                  >
                    <Heart size={14} color="#f59e0b" />
                    <span>Shanti Devi (Senior)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTER NEW USER */}
          {tab === "register" && (
            <div>
              {newPairingCode ? (
                <div style={{ padding: "1.5rem", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "14px", textAlign: "center" }}>
                  <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ margin: "0 auto 0.75rem auto" }} />
                  <h3 style={{ color: "#fff", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Registration Successful!</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                    Give this 4-digit pairing code to the senior parent. They can type this code on their device to log in:
                  </p>
                  <div style={{ fontSize: "2.75rem", fontWeight: 900, letterSpacing: "0.3em", color: "var(--accent-emerald)", marginBottom: "1.25rem" }}>
                    {newPairingCode}
                  </div>
                  <button
                    className="btn-island btn-island-emerald"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => { onClose(); setNewPairingCode(null); }}
                  >
                    <span>Start Using Senior Portal</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit}>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Role Type</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                      {[
                        { role: "SENIOR", label: "👵 Senior", desc: "No password needed" },
                        { role: "FAMILY", label: "👨‍👩‍👧 Caregiver", desc: "Monitor parents" },
                        { role: "VOLUNTEER", label: "🤝 Volunteer", desc: "Community check-in" }
                      ].map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => setRegRole(item.role as any)}
                          style={{
                            padding: "0.6rem 0.3rem",
                            borderRadius: "10px",
                            border: regRole === item.role ? "2px solid var(--accent-amber)" : "1px solid var(--border-hairline)",
                            background: regRole === item.role ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.03)",
                            color: "#fff",
                            cursor: "pointer",
                            textAlign: "center"
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{item.label}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Full Name</label>
                    <input
                      className="form-input-custom"
                      type="text"
                      placeholder={regRole === "SENIOR" ? "e.g. Mrs. Savita Sharma" : "e.g. Rajesh Sharma"}
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Phone Number</label>
                      <input
                        className="form-input-custom"
                        type="tel"
                        placeholder="+91 98200 55667"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Email (Optional)</label>
                      <input
                        className="form-input-custom"
                        type="email"
                        placeholder="user@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {regRole !== "SENIOR" && (
                    <div className="form-group-custom">
                      <label className="form-label-custom">Account Password</label>
                      <input
                        className="form-input-custom"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Preferred Language</label>
                      <select
                        className="form-input-custom"
                        value={regLanguage}
                        onChange={(e) => setRegLanguage(e.target.value)}
                      >
                        <option value="Hindi">Hindi (हिंदी)</option>
                        <option value="English">English</option>
                        <option value="Marathi">Marathi (मराठी)</option>
                        <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                      </select>
                    </div>
                    <div className="form-group-custom">
                      <label className="form-label-custom">Pincode / Area</label>
                      <input
                        className="form-input-custom"
                        type="text"
                        placeholder="e.g. 400050"
                        value={regPincode}
                        onChange={(e) => setRegPincode(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-island btn-island-amber"
                    style={{ width: "100%", justifyContent: "center", padding: "0.85rem", marginTop: "0.5rem" }}
                    disabled={isRegistering}
                  >
                    <UserPlus size={18} />
                    <span>{isRegistering ? "Creating Profile..." : "Create Account & Sign In"}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
