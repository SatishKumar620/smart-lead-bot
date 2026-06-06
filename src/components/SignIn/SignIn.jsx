import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './SignIn.css';

const SignIn = () => {
  const containerRef = useRef(null);
  const submitBtnRef = useRef(null);
  const navigate = useNavigate();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Invalid email or password. Please try again.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('Sign In →');

  // Metrics state
  const [hotCount, setHotCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0.0);

  // Live Activity Feed state
  const [activityList, setActivityList] = useState([
    { id: 1, email: 'sarah@enterprise.io', score: '9/10', grade: 'h', time: '2m ago' },
    { id: 2, email: 'mark@startup.co', score: '6/10', grade: 'w', time: '18m ago' },
    { id: 3, email: 'cto@bigcorp.com', score: '8/10', grade: 'h', time: '41m ago' },
    { id: 4, email: 'tom@gmail.com', score: '2/10', grade: 'c', time: '1h ago' },
    { id: 5, email: 'lead@agency.net', score: '5/10', grade: 'w', time: '2h ago' },
  ]);

  // password visibility toggle
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  // form validation and submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowError(false);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      setShowError(true);
      // GSAP shake animation
      gsap.to(submitBtnRef.current, { x: [-6, 6, -5, 5, -3, 3, 0], duration: 0.4 });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Signing in...');

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password. Please try again.');
      }

      // Store token and user details in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSubmitStatus('Welcome back ✓');
      setIsSubmitting(false);
      gsap.to(submitBtnRef.current, { backgroundColor: '#4ade80', duration: 0.4 });
      localStorage.setItem('showWelcome', 'signin');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitStatus('Sign In →');
      setErrorMessage(err.message || 'Invalid email or password. Please try again.');
      setShowError(true);
      gsap.to(submitBtnRef.current, { x: [-6, 6, -5, 5, -3, 3, 0], duration: 0.4 });
    }
  };

  // Entrance GSAP animations & metrics count-up
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from('.logo', { opacity: 0, y: -10, duration: 0.5, ease: 'power3.out' })
        .from('.form-top', { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' }, '-=.2')
        .from('.oauth-row', { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' }, '-=.3')
        .from('.divider', { opacity: 0, duration: 0.35 }, '-=.2')
        .from('.field', { opacity: 0, y: 14, stagger: 0.1, duration: 0.45, ease: 'power3.out' }, '-=.15')
        .from('.forgot', { opacity: 0, duration: 0.35 }, '-=.1')
        .from('.btn-submit', { opacity: 0, y: 10, duration: 0.45, ease: 'power3.out' }, '-=.2')
        // Right visual panel
        .from('.r-top', { opacity: 0, y: -10, duration: 0.5, ease: 'power3.out' }, 0)
        .from('.r-eyebrow', { opacity: 0, x: -16, duration: 0.5, ease: 'power3.out' }, '0.4')
        .from('.r-title', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '0.5')
        .from('.r-sub', { opacity: 0, y: 14, duration: 0.5, ease: 'power3.out' }, '0.65')
        .from('.metrics', { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' }, '0.75')
        .from('.activity', { opacity: 0, y: 14, duration: 0.55, ease: 'power3.out' }, '0.85')
        .from('.act-row', { opacity: 0, x: -10, stagger: 0.07, duration: 0.4, ease: 'power2.out' }, '0.95')
        .from('.r-foot', { opacity: 0, duration: 0.4 }, '1.1');

      // Metric count-up simulation
      tl.add(() => {
        const countUp = (setter, target, dec = 0, speed = 28) => {
          let current = 0;
          const steps = 40;
          const inc = target / steps;
          const timer = setInterval(() => {
            current = Math.min(current + inc, target);
            setter(dec ? parseFloat(current.toFixed(dec)) : Math.round(current));
            if (current >= target) clearInterval(timer);
          }, speed);
        };

        countUp(setHotCount, 14, 0, 28);
        countUp(setNewCount, 23, 0, 28);
        countUp(setAvgScore, 7.4, 1, 28);
      }, '0.85');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Telemetry loop: Add a new live lead activity row every 9s
  useEffect(() => {
    const pool = [
      { email: 'vp@fortune500.com', score: '10/10', grade: 'h', time: 'just now' },
      { email: 'ceo@scale.io', score: '9/10', grade: 'h', time: 'just now' },
      { email: 'dev@saas.co', score: '4/10', grade: 'w', time: 'just now' },
      { email: 'sales@growco.com', score: '7/10', grade: 'h', time: 'just now' },
    ];
    
    let index = 0;

    const interval = setInterval(() => {
      const lead = pool[index % pool.length];
      index++;

      setActivityList((prev) => {
        const newLead = {
          id: Date.now(),
          email: lead.email,
          score: lead.score,
          grade: lead.grade,
          time: lead.time,
        };
        // Insert at beginning, cap at 6 items
        return [newLead, ...prev.slice(0, 5)];
      });
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="signin-page">

      {/* ═══ LEFT: FORM ═══ */}
      <div className="panel-left">
        <Link className="logo" to="/">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          lead.ai
        </Link>

        <div className="form-top">
          <p className="form-eyebrow">Welcome back</p>
          <h1 className="form-title">Sign in.</h1>
          <p className="form-hint">Don't have an account? <Link to="/signup">Sign up free →</Link></p>
        </div>

        {/* OAuth Buttons */}
        <div className="oauth-row">
          <a href="#" className="btn-oauth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>
          <a href="#" className="btn-oauth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--cream)">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            Continue with GitHub
          </a>
        </div>

        <div className="divider"><span className="div-line"></span><span className="div-txt">or sign in with email</span><span className="div-line"></span></div>

        {/* Standard Form */}
        <form id="signinForm" onSubmit={handleSubmit} noValidate>
          <div className="form-body">

            {showError && <div className="err" id="loginErr">{errorMessage}</div>}

            {/* Email Field */}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="jane@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" 
                  required 
                />
                <span className="glow"></span>
              </div>
            </div>

            {/* Password Field */}
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  name="password" 
                  placeholder="Your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" 
                  required 
                />
                <span className="glow"></span>
                <button 
                  type="button" 
                  className="pw-toggle" 
                  id="pwToggle" 
                  tabIndex="-1"
                  onClick={togglePassword}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <a href="#" className="forgot">Forgot password?</a>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit" 
              id="submitBtn" 
              ref={submitBtnRef}
              disabled={isSubmitting}
            >
              <div className="btn-inner">
                <span id="btnTxt">{submitStatus}</span>
                {isSubmitting && <div className="btn-spin" id="btnSpin"></div>}
              </div>
            </button>

          </div>
        </form>
      </div>

      {/* ═══ RIGHT: VISUAL PANEL ═══ */}
      <div className="panel-right">
        <div className="scanlines"></div>

        {/* Decorative dynamic radar element */}
        <svg className="radar-deco" viewBox="0 0 150 150" fill="none">
          <defs>
            <radialGradient id="rg2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity=".28"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
            </radialGradient>
            <clipPath id="rc2"><circle cx="75" cy="75" r="68"/></clipPath>
          </defs>
          <circle cx="75" cy="75" r="68" stroke="#a855f7" strokeOpacity=".14" strokeWidth="1"/>
          <circle cx="75" cy="75" r="50" stroke="#a855f7" strokeOpacity=".17" strokeWidth="1"/>
          <circle cx="75" cy="75" r="32" stroke="#a855f7" strokeOpacity=".22" strokeWidth="1"/>
          <circle cx="75" cy="75" r="14" stroke="#a855f7" strokeOpacity=".3" strokeWidth="1"/>
          <line x1="75" y1="7" x2="75" y2="143" stroke="#a855f7" strokeOpacity=".07" strokeWidth="1"/>
          <line x1="7" y1="75" x2="143" y2="75" stroke="#a855f7" strokeOpacity=".07" strokeWidth="1"/>
          <g clipPath="url(#rc2)">
            <path d="M75,75 L75,7 A68,68 0 0,1 143,75 Z" fill="url(#rg2)">
              <animateTransform attributeName="transform" type="rotate" from="0 75 75" to="360 75 75" dur="4s" repeatCount="indefinite"/>
            </path>
          </g>
          <circle cx="75" cy="75" r="3" fill="#a855f7" opacity=".8"/>
          <circle cx="104" cy="43" r="4" fill="#E84040"><animate attributeName="opacity" values="1;.15;1" dur="2.2s" repeatCount="indefinite"/></circle>
          <circle cx="48" cy="96" r="3.5" fill="#a855f7"><animate attributeName="opacity" values=".9;.2;.9" dur="3.1s" repeatCount="indefinite"/></circle>
          <circle cx="98" cy="102" r="3" fill="#3A9EE8"><animate attributeName="opacity" values=".8;.1;.8" dur="2.8s" repeatCount="indefinite"/></circle>
        </svg>

        <div className="r-top">
          <Link className="r-logo" to="/">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            lead.ai
          </Link>
        </div>

        <div className="r-mid">
          <p className="r-eyebrow">Your pipeline right now</p>
          <h2 className="r-title">Leads are<br/>waiting <em>for you.</em></h2>
          <p className="r-sub">Every minute you're away, leads are being scored, graded, and routed automatically. Sign in to see what came in.</p>

          {/* Metrics Displays */}
          <div className="metrics">
            <div className="metric">
              <span className="m-val" id="mv1">{hotCount}</span>
              <span className="m-lbl">Hot Today</span>
            </div>
            <div className="metric">
              <span className="m-val" id="mv2">{newCount}</span>
              <span className="m-lbl">New This Week</span>
            </div>
            <div className="metric">
              <span className="m-val" id="mv3">{avgScore.toFixed(1)}</span>
              <span className="m-lbl">Avg AI Score</span>
            </div>
          </div>

          {/* Real-time Simulated Telemetry Feed */}
          <div className="activity">
            <div className="act-head"><span className="alive"></span>Live Lead Activity</div>
            <div className="act-list" id="actList">
              {activityList.map((act) => (
                <div className="act-row" key={act.id}>
                  <span className={`ag ${act.grade}`}></span>
                  <span className="aname">{act.email}</span>
                  <span className={`ascore ${act.grade}`}>{act.score}</span>
                  <span className="atime">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="r-foot">New to lead.ai? <Link to="/signup">Create a free account →</Link></div>
      </div>

    </div>
  );
};

export default SignIn;
