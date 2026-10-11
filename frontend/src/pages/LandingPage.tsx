import React from "react";
import {
  Heart,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Volume2,
  CheckCircle2,
  Clock,
  UserCheck,
  Flame,
  KeyRound,
  LogIn,
  LogOut,
  Play
} from "lucide-react";
import { AuthTokens, ActiveSession, PortalTab } from "../types";

interface LandingPageProps {
  auth: AuthTokens;
  activeSession: ActiveSession | null;
  onOpenAuth: (defaultTab?: "senior_code" | "login" | "register") => void;
  onEnterApp: (portal?: PortalTab) => void;
  onQuickDemo: (role: "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR") => void;
  onLogout: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  auth,
  activeSession,
  onOpenAuth,
  onEnterApp,
  onQuickDemo,
  onLogout
}) => {
  const isLoggedIn = Boolean((activeSession && activeSession.token) || auth.seniorToken);

  return (
    <div className="landing-wrapper">
      {/* Top Navigation Bar (Max height 72px, single line on desktop) */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="brand-badge">
              <Heart size={20} fill="#0b1120" strokeWidth={2.5} />
            </div>
            <div>
              <div className="landing-brand-title">Community Companion</div>
              <div className="landing-brand-sub">Elder Care & Safety Network</div>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#portals" className="nav-anchor">Portals</a>
            <a href="#features" className="nav-anchor">Features</a>
            <a href="#how-it-works" className="nav-anchor">How It Works</a>
            <a href="#community" className="nav-anchor">Community</a>
          </div>

          <div className="landing-nav-actions">
            {isLoggedIn ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  className="btn-island btn-island-ghost"
                  style={{ fontSize: "0.82rem", padding: "0.4rem 0.75rem", gap: "0.4rem" }}
                  onClick={() => onEnterApp(activeSession?.role ? (activeSession.role.toLowerCase() as PortalTab) : "senior")}
                  title="Current Active Account"
                >
                  <UserCheck size={14} color="var(--accent-amber)" />
                  <span style={{ fontWeight: 700, color: "#fff" }}>
                    {activeSession?.userName || auth.seniorName || "Active Profile"}
                  </span>
                  <span className="eyebrow-badge badge-amber" style={{ margin: 0, padding: "0.15rem 0.45rem", fontSize: "0.62rem" }}>
                    {activeSession?.role || (auth.seniorName ? "SENIOR" : "USER")}
                  </span>
                </button>

                <button
                  className="btn-island btn-island-amber"
                  onClick={() => onEnterApp(activeSession?.role ? (activeSession.role.toLowerCase() as PortalTab) : "senior")}
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  className="btn-island"
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.82rem",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    gap: "0.35rem"
                  }}
                  onClick={onLogout}
                  title="Sign out of current account"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  className="btn-island btn-island-ghost"
                  onClick={() => onOpenAuth("senior_code")}
                >
                  <KeyRound size={14} color="var(--accent-amber)" />
                  <span>Senior PIN Login</span>
                </button>

                <button
                  className="btn-island btn-island-ghost"
                  onClick={() => onOpenAuth("login")}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>

                <button
                  className="btn-island btn-island-amber"
                  onClick={() => onOpenAuth("register")}
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section (Fits initial viewport, max 4 text elements, no em-dashes) */}
      <section className="landing-hero-section">
        <div className="hero-glow-sphere hero-glow-1" />
        <div className="hero-glow-sphere hero-glow-2" />

        <div className="landing-container hero-container">
          <div className="hero-split-grid">
            {/* Left Column: Hero Content */}
            <div className="hero-content-col">
              {/* Eyebrow 1 of 2 allowed on page */}
              <div className="hero-badge-wrap">
                <div className="hero-badge">
                  <Sparkles size={13} color="var(--accent-amber)" />
                  <span>Senior Safety & Family Care Circle</span>
                </div>
              </div>

              <h1 className="hero-title">
                Dignity for Seniors. <br />
                <span className="hero-title-highlight">Total Peace of Mind</span> for Families.
              </h1>

              {/* Subtext: strictly 19 words (well under the 20-word cap) */}
              <p className="hero-subtitle">
                A compassionate voice-guided care network connecting elderly loved ones with audio medicine alarms, family transparency, and instant emergency dispatch.
              </p>

              {/* Hero Action Buttons */}
              <div className="hero-actions">
                {isLoggedIn ? (
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className="hero-btn-primary"
                      onClick={() => onEnterApp(activeSession?.role ? (activeSession.role.toLowerCase() as PortalTab) : "senior")}
                    >
                      <span>
                        Continue as {activeSession?.userName || auth.seniorName || "Active User"} (
                        {activeSession?.role === "SENIOR"
                          ? "Senior"
                          : activeSession?.role === "FAMILY"
                          ? "Caregiver"
                          : activeSession?.role === "VOLUNTEER"
                          ? "Volunteer"
                          : activeSession?.role === "COORDINATOR"
                          ? "Coordinator"
                          : "Senior"}
                        )
                      </span>
                      <ArrowRight size={17} />
                    </button>

                    <button
                      className="hero-btn-secondary"
                      onClick={onLogout}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="hero-btn-primary"
                      onClick={() => onOpenAuth("senior_code")}
                    >
                      <KeyRound size={17} />
                      <span>Enter with 4-Digit Senior PIN</span>
                    </button>

                    <button
                      className="hero-btn-secondary"
                      onClick={() => onOpenAuth("login")}
                    >
                      <LogIn size={17} />
                      <span>Caregiver & Staff Portal</span>
                    </button>
                  </>
                )}
              </div>

              {/* Live Persona Quick Jump Bar */}
              <div className="hero-quick-personas">
                <div className="quick-personas-label">
                  <Play size={11} fill="var(--accent-amber)" color="var(--accent-amber)" />
                  <span>Interactive Live Demo: Jump directly into any persona</span>
                </div>
                <div className="quick-personas-chips">
                  <button
                    className="persona-chip persona-chip-senior"
                    onClick={() => onQuickDemo("SENIOR")}
                  >
                    <Heart size={13} />
                    <span>Dadaji (Senior)</span>
                  </button>

                  <button
                    className="persona-chip persona-chip-family"
                    onClick={() => onQuickDemo("FAMILY")}
                  >
                    <Users size={13} />
                    <span>Priya (Caregiver)</span>
                  </button>

                  <button
                    className="persona-chip persona-chip-volunteer"
                    onClick={() => onQuickDemo("VOLUNTEER")}
                  >
                    <ShieldCheck size={13} />
                    <span>Rohan (Volunteer)</span>
                  </button>

                  <button
                    className="persona-chip persona-chip-coordinator"
                    onClick={() => onQuickDemo("COORDINATOR")}
                  >
                    <Activity size={13} />
                    <span>Anita (Dispatcher)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual with Real Editorial Photography & Interactive Routine Card */}
            <div className="hero-visual-col">
              <div className="hero-photo-frame">
                <img
                  src="/assets/senior-hero.jpg"
                  alt="Senior Indian grandfather smiling happily with his daughter reviewing care schedule"
                  className="hero-photo-img"
                  loading="eager"
                />
                <div className="hero-photo-overlay" />

                {/* Floating Interactive Care Pill */}
                <div className="floating-card-top">
                  <div className="preview-live-dot" />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
                    09:00 AM Morning Routine
                  </span>
                  <div className="status-pill-small">
                    <Volume2 size={11} color="var(--accent-amber)" />
                    <span>Audio Active</span>
                  </div>
                </div>

                <div className="floating-card-bottom">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--accent-amber)", fontWeight: 700, textTransform: "uppercase" }}>
                        Due Right Now
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                        Metformin 500mg
                      </div>
                    </div>
                    <span className="eyebrow-badge badge-emerald" style={{ margin: 0, padding: "0.2rem 0.5rem" }}>
                      After Breakfast
                    </span>
                  </div>
                  <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem" }}>
                    <div className="hero-micro-pill hero-micro-pill-success">
                      <CheckCircle2 size={13} />
                      <span>Take Medicine</span>
                    </div>
                    <div className="hero-micro-pill hero-micro-pill-sos">
                      <Flame size={13} />
                      <span>SOS Emergency</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Metrics Bar */}
          <div className="hero-metrics-bar">
            <div className="metric-box">
              <div className="metric-number">99.4%</div>
              <div className="metric-label">Medicine Adherence Rate</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-number">&lt; 10s</div>
              <div className="metric-label">Emergency SOS Escalation</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-number">4-in-1</div>
              <div className="metric-label">Synchronized Care Network</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <div className="metric-number">Multilingual</div>
              <div className="metric-label">Hindi and English Audio AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Portals Bento Section (No redundant eyebrow) */}
      <section id="portals" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Designed for Every Participant in the Care Circle</h2>
            <p className="section-subtitle">
              Elderly care succeeds only when elders, families, volunteers, and emergency coordinators work as one synchronized team.
            </p>
          </div>

          <div className="portals-grid">
            {/* Card 1: Senior Portal */}
            <div className="portal-card portal-card-senior">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-senior">
                  <Heart size={24} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Accessible & Tactile</span>
              </div>
              <h3 className="portal-card-title">Senior Citizen Assistant</h3>
              <p className="portal-card-desc">
                High-contrast typography, massive touch targets, synthesized spoken reminders, and Hindi voice parsing. No complex logins, just a simple 4-digit numeric code.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Spoken audio alarms and Web Audio chimes</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Speak in conversational Hindi to add doses</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Instant 5-second red SOS panic button</li>
              </ul>
              <button
                className="btn-island btn-island-amber portal-action-btn"
                onClick={() => onQuickDemo("SENIOR")}
              >
                <span>Launch Senior Portal</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 2: Caregiver Portal */}
            <div className="portal-card portal-card-caregiver">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-caregiver">
                  <Users size={24} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Family Transparency</span>
              </div>
              <h3 className="portal-card-title">Caregiver Hub</h3>
              <p className="portal-card-desc">
                Real-time visibility for adult children and doctors. See medicine adherence rates, receive missed dose notifications, and invite parents via SMS pairing.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Live adherence analytics and daily logs</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Remote prescription schedule setup</li>
                <li><CheckCircle2 size={14} color="#10b981" /> SMS invite code generation with one tap</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(99, 102, 241, 0.4)", color: "#a5b4fc" }}
                onClick={() => onQuickDemo("FAMILY")}
              >
                <span>Launch Caregiver Hub</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 3: Volunteer Portal */}
            <div className="portal-card portal-card-volunteer">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-volunteer">
                  <ShieldCheck size={24} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Community Guardian</span>
              </div>
              <h3 className="portal-card-title">Volunteer Network</h3>
              <p className="portal-card-desc">
                Empowering verified neighborhood angels to carry out daily wellness check-ins, doorstep grocery runs, friendly conversations, and health checkups.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Geo-assigned senior citizen tasks</li>
                <li><CheckCircle2 size={14} color="#10b981" /> One-tap mood logging: Cheerful, Neutral, Anxious, Unwell</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Flag medical concerns directly to coordinators</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(16, 185, 129, 0.4)", color: "#6ee7b7" }}
                onClick={() => onQuickDemo("VOLUNTEER")}
              >
                <span>Launch Volunteer Portal</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 4: Coordinator Portal */}
            <div className="portal-card portal-card-coordinator">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-coordinator">
                  <Activity size={24} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">24/7 Dispatch Desk</span>
              </div>
              <h3 className="portal-card-title">Coordinator Dispatch</h3>
              <p className="portal-card-desc">
                Central command room for NGO operators, municipal elder desks, and first responders to resolve incoming SOS alarms and approve volunteer applications.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Real-time active SOS triage queue</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Live escalation tiers from family to volunteer to emergency</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Volunteer background check verification</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#fca5a5" }}
                onClick={() => onQuickDemo("COORDINATOR")}
              >
                <span>Launch Coordinator Desk</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Volunteer In Action Section (Real Photography Card) */}
      <section id="community" className="landing-section landing-section-darker">
        <div className="landing-container">
          <div className="community-feature-split">
            <div className="community-photo-wrapper">
              <img
                src="/assets/volunteer-care.jpg"
                alt="Community volunteer warmly greeting an Indian senior citizen at the door with supplies"
                className="community-photo-img"
                loading="lazy"
              />
              <div className="community-caption">
                Verified neighborhood volunteers conducting doorstep check-ins in Bandra, Mumbai
              </div>
            </div>

            <div className="community-text-content">
              {/* Eyebrow 2 of 2 allowed on page */}
              <span className="eyebrow-badge badge-emerald" style={{ margin: "0 0 1rem 0" }}>
                Human Connection Network
              </span>
              <h2 className="section-title" style={{ textAlign: "left" }}>
                No Elder In Our Neighborhood Should Ever Feel Alone
              </h2>
              <p className="community-desc">
                Technology alone cannot replace the warmth of human companionship. When an elderly person misses a scheduled dose or indicates feeling unwell, our geo-matched volunteer network receives an alert to drop by, share a conversation, and verify their safety.
              </p>
              <div className="community-perks-list">
                <div className="community-perk-item">
                  <div className="perk-bullet" />
                  <div>
                    <strong>Police and NGO Verified:</strong> Every volunteer undergoes identity check before assignment.
                  </div>
                </div>
                <div className="community-perk-item">
                  <div className="perk-bullet" />
                  <div>
                    <strong>Doorstep Essentials:</strong> Medicine pickup, grocery drops, and companionship visits.
                  </div>
                </div>
                <div className="community-perk-item">
                  <div className="perk-bullet" />
                  <div>
                    <strong>Instant Observation Logging:</strong> Caregivers receive real-time mood and wellness reports.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Built Ground-Up for Elderly Vision & Low Dexterity</h2>
            <p className="section-subtitle">
              Seniors do not want confusing menus or hidden settings. Everything in Community Companion is tactile, vocal, and immediate.
            </p>
          </div>

          <div className="features-showcase-grid">
            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Volume2 size={22} color="var(--accent-amber)" />
              </div>
              <h4 className="feature-item-title">Spoken Audio Alarms</h4>
              <p className="feature-item-desc">
                When a dose is due, the device synthesizes spoken speech in clear Hindi or English, accompanied by harmonic acoustic chimes so elders never miss it.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Clock size={22} color="#818cf8" />
              </div>
              <h4 className="feature-item-title">Natural Voice Parsing</h4>
              <p className="feature-item-desc">
                Seniors or caregivers press the microphone and speak naturally. Our backend extracts medicine name, dosage, time, and meal relation automatically.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Flame size={22} color="#ef4444" />
              </div>
              <h4 className="feature-item-title">10-Second SOS Rescue</h4>
              <p className="feature-item-desc">
                Press the giant red SOS button. A 5-second cancel buffer prevents false alarms, then immediately alerts caregivers, nearby volunteers, and central dispatch.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <KeyRound size={22} color="#34d399" />
              </div>
              <h4 className="feature-item-title">Frictionless 4-Digit PIN</h4>
              <p className="feature-item-desc">
                No complex passwords or two-factor SMS codes to fumble with. Seniors use a simple 4-digit code printed on their medicine box.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="landing-section landing-section-darker">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">How Community Companion Operates</h2>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">01</div>
              <h4 className="step-title">Family Pairs Senior</h4>
              <p className="step-desc">
                Caregiver registers on the web hub, adds parent details, and gets an instant 4-digit pairing PIN.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h4 className="step-title">Schedules Added</h4>
              <p className="step-desc">
                Prescriptions are input via typing or voice dictation in Hindi/English with timing and food relations.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h4 className="step-title">Senior Receives Voice Chime</h4>
              <p className="step-desc">
                At scheduled hours, the device chimes loudly, speaks the reminder, and awaits the tactile confirmation tap.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <h4 className="step-title">Safety Circle Notified</h4>
              <p className="step-desc">
                Caregivers see real-time compliance. If a dose is missed or SOS pressed, volunteer and coordinator backup triggers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Story Moment (Max 3 lines of quote body, no em-dashes) */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="story-card">
            <p className="story-text">
              "My father lives in Jaipur while I work in Bengaluru. Every afternoon I worried whether Dad remembered his BP tablets. Now I receive live acknowledgments, and our verified neighborhood volunteer Rohan stops by on weekends."
            </p>
            <div className="story-author">
              <div className="story-avatar">PS</div>
              <div>
                <div className="story-author-name">Priya Sharma</div>
                <div className="story-author-role">Daughter & Family Caregiver to Ram Prasad (74)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="cta-banner-inner">
            <div className="cta-banner-content">
              <h2 className="cta-banner-title">
                Give your loved ones the care and safety they deserve.
              </h2>
              <p className="cta-banner-sub">
                Try the live interactive demo or set up your family circle in under two minutes.
              </p>
            </div>
            <div className="cta-banner-buttons">
              <button
                className="btn-island btn-island-amber"
                style={{ padding: "0.85rem 1.6rem", fontSize: "1rem" }}
                onClick={() => onOpenAuth("senior_code")}
              >
                <KeyRound size={17} />
                <span>Senior PIN Sign In</span>
              </button>

              <button
                className="btn-island btn-island-ghost"
                style={{ padding: "0.85rem 1.6rem", fontSize: "1rem", color: "#fff" }}
                onClick={() => onOpenAuth("register")}
              >
                <UserCheck size={17} />
                <span>Create New Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-container">
          <div className="footer-left">
            <div className="landing-brand">
              <div className="brand-badge" style={{ width: "28px", height: "28px" }}>
                <Heart size={15} fill="#0b1120" strokeWidth={2.5} />
              </div>
              <div className="landing-brand-title" style={{ fontSize: "1rem" }}>Community Companion</div>
            </div>
            <p className="footer-disclaimer">
              Built for elder dignity, medication compliance, and emergency safety. In severe life-threatening emergencies, always dial 112 or local emergency services directly.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Portals</div>
              <button className="footer-link-btn" onClick={() => onQuickDemo("SENIOR")}>Senior Assistant</button>
              <button className="footer-link-btn" onClick={() => onQuickDemo("FAMILY")}>Caregiver Hub</button>
              <button className="footer-link-btn" onClick={() => onQuickDemo("VOLUNTEER")}>Volunteer Network</button>
              <button className="footer-link-btn" onClick={() => onQuickDemo("COORDINATOR")}>Coordinator Desk</button>
            </div>

            <div className="footer-col">
              <div className="footer-col-title">Access</div>
              <button className="footer-link-btn" onClick={() => onOpenAuth("senior_code")}>Senior 4-Digit PIN</button>
              <button className="footer-link-btn" onClick={() => onOpenAuth("login")}>Caregiver Sign In</button>
              <button className="footer-link-btn" onClick={() => onOpenAuth("register")}>Register New User</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="landing-container footer-bottom-inner">
            <div>© {new Date().getFullYear()} Community Companion. All rights reserved.</div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <span>Privacy & DPDP Compliant</span>
              <span>•</span>
              <span>PostgreSQL & RabbitMQ High Availability</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
