import React from "react";
import {
  Heart,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Volume2,
  BellRing,
  CheckCircle2,
  Clock,
  UserCheck,
  Flame,
  KeyRound,
  LogIn,
  Play
} from "lucide-react";
import { AuthTokens, PortalTab } from "../types";

interface LandingPageProps {
  auth: AuthTokens;
  onOpenAuth: (defaultTab?: "senior_code" | "login" | "register") => void;
  onEnterApp: (portal?: PortalTab) => void;
  onQuickDemo: (role: "SENIOR" | "FAMILY" | "VOLUNTEER" | "COORDINATOR") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  auth,
  onOpenAuth,
  onEnterApp,
  onQuickDemo
}) => {
  const isLoggedIn = Boolean(auth.seniorToken || auth.familyToken || auth.volunteerToken || auth.coordinatorToken);

  return (
    <div className="landing-wrapper">
      {/* Top Navigation Bar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="brand-badge">
              <Heart size={22} fill="#0b1120" strokeWidth={2.5} />
            </div>
            <div>
              <div className="landing-brand-title">Community Companion</div>
              <div className="landing-brand-sub">Elder Care & Safety Network</div>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#features" className="nav-anchor">Features</a>
            <a href="#portals" className="nav-anchor">Portals</a>
            <a href="#how-it-works" className="nav-anchor">How It Works</a>
            <a href="#safety" className="nav-anchor">Safety Network</a>
          </div>

          <div className="landing-nav-actions">
            {isLoggedIn ? (
              <button
                className="btn-island btn-island-amber"
                onClick={() => onEnterApp()}
              >
                <span>Enter App Dashboard</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  className="btn-island btn-island-ghost"
                  onClick={() => onOpenAuth("senior_code")}
                >
                  <KeyRound size={15} color="var(--accent-amber)" />
                  <span>Senior PIN Login</span>
                </button>

                <button
                  className="btn-island btn-island-ghost"
                  onClick={() => onOpenAuth("login")}
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </button>

                <button
                  className="btn-island btn-island-amber"
                  onClick={() => onOpenAuth("register")}
                >
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-glow-sphere hero-glow-1" />
        <div className="hero-glow-sphere hero-glow-2" />

        <div className="landing-container hero-container">
          <div className="hero-badge-wrap">
            <div className="hero-badge">
              <Sparkles size={14} color="var(--accent-amber)" />
              <span>Next-Generation Elder Care & Community Safety</span>
            </div>
          </div>

          <h1 className="hero-title">
            Dignity for Seniors. <br />
            <span className="hero-title-highlight">Total Peace of Mind</span> for Families.
          </h1>

          <p className="hero-subtitle">
            A compassionate, voice-first care ecosystem connecting elderly loved ones with audio medication alarms, real-time family transparency, neighborhood volunteer check-ins, and one-tap emergency SOS dispatch.
          </p>

          {/* Hero Action Buttons */}
          <div className="hero-actions">
            {isLoggedIn ? (
              <button
                className="hero-btn-primary"
                onClick={() => onEnterApp()}
              >
                <span>Continue to Active Portal</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button
                  className="hero-btn-primary"
                  onClick={() => onOpenAuth("senior_code")}
                >
                  <KeyRound size={18} />
                  <span>Enter with 4-Digit Senior PIN</span>
                </button>

                <button
                  className="hero-btn-secondary"
                  onClick={() => onOpenAuth("login")}
                >
                  <LogIn size={18} />
                  <span>Caregiver & Staff Portal</span>
                </button>
              </>
            )}
          </div>

          {/* Live Persona Quick Jump Bar */}
          <div className="hero-quick-personas">
            <div className="quick-personas-label">
              <Play size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
              <span>Instant Interactive Demo — Jump directly into any persona:</span>
            </div>
            <div className="quick-personas-chips">
              <button
                className="persona-chip persona-chip-senior"
                onClick={() => onQuickDemo("SENIOR")}
              >
                <Heart size={14} />
                <span>Dadaji (Senior Assistant)</span>
              </button>

              <button
                className="persona-chip persona-chip-family"
                onClick={() => onQuickDemo("FAMILY")}
              >
                <Users size={14} />
                <span>Priya (Family Caregiver)</span>
              </button>

              <button
                className="persona-chip persona-chip-volunteer"
                onClick={() => onQuickDemo("VOLUNTEER")}
              >
                <ShieldCheck size={14} />
                <span>Rohan (Community Volunteer)</span>
              </button>

              <button
                className="persona-chip persona-chip-coordinator"
                onClick={() => onQuickDemo("COORDINATOR")}
              >
                <Activity size={14} />
                <span>Anita (Emergency Dispatcher)</span>
              </button>
            </div>
          </div>

          {/* Hero Interactive Hardware Card Preview */}
          <div className="hero-preview-mockup">
            <div className="bezel-outer bezel-outer-amber preview-bezel">
              <div className="bezel-inner bezel-inner-amber preview-inner">
                <div className="preview-top-bar">
                  <div className="preview-time-wrap">
                    <span className="preview-live-dot" />
                    <span className="preview-clock-text">09:00 AM • Morning Routine</span>
                  </div>
                  <div className="preview-badge-status">
                    <Volume2 size={13} color="var(--accent-amber)" />
                    <span>Voice Audio Engine Active</span>
                  </div>
                </div>

                <div className="preview-card-body">
                  <div className="preview-card-left">
                    <div className="eyebrow-badge badge-amber" style={{ margin: 0 }}>
                      <BellRing size={12} />
                      <span>Next Scheduled Dose</span>
                    </div>
                    <div className="preview-med-title">Metformin 500mg</div>
                    <div className="preview-med-meta">
                      Take 1 tablet with warm water • After Breakfast
                    </div>
                    <div className="preview-spoken-quote">
                      "नमस्ते दादाजी! सुबह 9 बज गए हैं। कृपया नाश्ते के बाद अपनी शुगर की दवाई ले लीजिए।"
                    </div>
                  </div>

                  <div className="preview-card-right">
                    <div className="preview-action-btn">
                      <CheckCircle2 size={24} color="#10b981" />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>
                          I Have Taken My Medicine
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Notifies Priya (Caregiver) instantly
                        </div>
                      </div>
                    </div>

                    <div className="preview-sos-indicator">
                      <Flame size={16} color="#ef4444" />
                      <span>SOS Emergency Alert Button Ready</span>
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
              <div className="metric-number">Voice-AI</div>
              <div className="metric-label">Hindi & Multilingual Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Portals Bento Section */}
      <section id="portals" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="eyebrow-badge badge-amber">Four Interconnected Pillars</span>
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
                  <Heart size={26} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Accessible & Tactile</span>
              </div>
              <h3 className="portal-card-title">Senior Citizen Assistant</h3>
              <p className="portal-card-desc">
                High-contrast typography, massive touch targets, synthesized spoken reminders, and Hindi voice parsing. No complex logins — simple 4-digit numeric code.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Spoken audio alarms & Web Audio chimes</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Speak in conversational Hindi to add doses</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Instant 5-second red SOS panic button</li>
              </ul>
              <button
                className="btn-island btn-island-amber portal-action-btn"
                onClick={() => onQuickDemo("SENIOR")}
              >
                <span>Launch Senior Portal</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Card 2: Caregiver Portal */}
            <div className="portal-card portal-card-caregiver">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-caregiver">
                  <Users size={26} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Family Transparency</span>
              </div>
              <h3 className="portal-card-title">Caregiver Hub</h3>
              <p className="portal-card-desc">
                Real-time visibility for adult children and doctors. See medicine adherence rates, receive missed dose notifications, and invite parents via SMS pairing.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Live adherence analytics & daily logs</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Remote prescription schedule setup</li>
                <li><CheckCircle2 size={14} color="#10b981" /> SMS invite code generation with one tap</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(99, 102, 241, 0.4)", color: "#a5b4fc" }}
                onClick={() => onQuickDemo("FAMILY")}
              >
                <span>Launch Caregiver Hub</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Card 3: Volunteer Portal */}
            <div className="portal-card portal-card-volunteer">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-volunteer">
                  <ShieldCheck size={26} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">Community Guardian</span>
              </div>
              <h3 className="portal-card-title">Volunteer Network</h3>
              <p className="portal-card-desc">
                Empowering verified neighborhood angels to carry out daily wellness check-ins, doorstep grocery runs, friendly conversations, and health checkups.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Geo-assigned senior citizen tasks</li>
                <li><CheckCircle2 size={14} color="#10b981" /> One-tap mood logging (Cheerful, Anxious, Unwell)</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Flag medical concerns directly to coordinators</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(16, 185, 129, 0.4)", color: "#6ee7b7" }}
                onClick={() => onQuickDemo("VOLUNTEER")}
              >
                <span>Launch Volunteer Portal</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Card 4: Coordinator Portal */}
            <div className="portal-card portal-card-coordinator">
              <div className="portal-card-top">
                <div className="portal-icon-badge badge-coordinator">
                  <Activity size={26} strokeWidth={2.2} />
                </div>
                <span className="portal-tag">24/7 Dispatch Desk</span>
              </div>
              <h3 className="portal-card-title">Coordinator Dispatch</h3>
              <p className="portal-card-desc">
                Central command room for NGO operators, municipal elder desks, and first responders to resolve incoming SOS alarms and approve volunteer applications.
              </p>
              <ul className="portal-feature-list">
                <li><CheckCircle2 size={14} color="#10b981" /> Real-time active SOS triage queue</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Live escalation tiers (Family → Volunteer → Police)</li>
                <li><CheckCircle2 size={14} color="#10b981" /> Volunteer background check verification</li>
              </ul>
              <button
                className="btn-island btn-island-ghost portal-action-btn"
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#fca5a5" }}
                onClick={() => onQuickDemo("COORDINATOR")}
              >
                <span>Launch Coordinator Desk</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section id="features" className="landing-section landing-section-darker">
        <div className="landing-container">
          <div className="section-header">
            <span className="eyebrow-badge badge-amber">Engineered for Reliability</span>
            <h2 className="section-title">Built Ground-Up for Elderly Needs & Low Dexterity</h2>
            <p className="section-subtitle">
              Seniors don't want confusing menus, hidden settings, or tiny text. Everything in Community Companion is tactile, vocal, and immediate.
            </p>
          </div>

          <div className="features-showcase-grid">
            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Volume2 size={24} color="var(--accent-amber)" />
              </div>
              <h4 className="feature-item-title">Spoken Spoken Alarms</h4>
              <p className="feature-item-desc">
                When a dose is due, the device synthesizes spoken speech in clear Hindi or English, accompanied by harmonic acoustic chimes so elders never miss it.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Clock size={24} color="#818cf8" />
              </div>
              <h4 className="feature-item-title">Natural Voice Parsing</h4>
              <p className="feature-item-desc">
                Seniors or caregivers can press the microphone and speak naturally. Our backend extracts medicine name, dosage, time, and meal relation automatically.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <Flame size={24} color="#ef4444" />
              </div>
              <h4 className="feature-item-title">10-Second SOS Rescue</h4>
              <p className="feature-item-desc">
                Press the giant red SOS button. A 5-second cancel buffer prevents false alarms, then immediately alerts caregivers, nearby volunteers, and central dispatch.
              </p>
            </div>

            <div className="feature-item-card">
              <div className="feature-icon-circle">
                <KeyRound size={24} color="#34d399" />
              </div>
              <h4 className="feature-item-title">Frictionless 4-Digit PIN</h4>
              <p className="feature-item-desc">
                No complex passwords, no two-factor SMS codes to fumble with. Seniors use a simple 4-digit code (like an ATM pin) printed on their medicine box.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="eyebrow-badge badge-amber">Seamless Onboarding</span>
            <h2 className="section-title">How Community Companion Operates in 4 Steps</h2>
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
                Caregivers see real-time compliance. If a dose is missed or SOS pressed, volunteer & coordinator backup triggers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Testimonial / Story Moment */}
      <section id="safety" className="landing-section landing-section-darker">
        <div className="landing-container">
          <div className="story-card">
            <div className="story-quote-icon">“</div>
            <p className="story-text">
              "My father lives in Jaipur while I work in Bengaluru. Before Community Companion, every day at 2 PM I panicked wondering if he took his heart medications. Now I receive live acknowledgments, and if he needs anything, our verified neighborhood volunteer Rohan stops by to help."
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
                Give your loved ones the care & safety they deserve.
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
                <KeyRound size={18} />
                <span>Senior PIN Sign In</span>
              </button>

              <button
                className="btn-island btn-island-ghost"
                style={{ padding: "0.85rem 1.6rem", fontSize: "1rem", color: "#fff" }}
                onClick={() => onOpenAuth("register")}
              >
                <UserCheck size={18} />
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
                <Heart size={16} fill="#0b1120" strokeWidth={2.5} />
              </div>
              <div className="landing-brand-title" style={{ fontSize: "1rem" }}>Community Companion</div>
            </div>
            <p className="footer-disclaimer">
              Built for elder dignity, medication compliance, and emergency safety. In severe life-threatening emergencies, always dial 112 or local ambulance services directly.
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
