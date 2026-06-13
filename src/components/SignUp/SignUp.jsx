import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './SignUp.css';
import storage from '../../utils/storage';

const SignUp = () => {
  const containerRef = useRef(null);
  const submitBtnRef = useRef(null);
  const navigate = useNavigate();

  // Form fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Validation & Error states
  const [emailError, setEmailError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [formError, setFormError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Please fill in all required fields correctly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('Create Account →');

  // Password strength score (0 to 4)
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Entrance GSAP timeline
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.15 });
      
      // Left marketing panel
      tl.from('.logo', { opacity: 0, y: -10, duration: 0.5, ease: 'power3.out' })
        .from('.l-eyebrow', { opacity: 0, x: -16, duration: 0.5, ease: 'power3.out' }, '-=.2')
        .from('.l-title', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=.3')
        .from('.l-sub', { opacity: 0, y: 14, duration: 0.5, ease: 'power3.out' }, '-=.4')
        .from('.feat', { opacity: 0, x: -12, stagger: 0.09, duration: 0.45, ease: 'power2.out' }, '-=.3')
        .from('.left-foot', { opacity: 0, duration: 0.4 }, '-=.2')
        // Right form panel
        .from('#formTop', { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' }, '-=.6')
        .from('#oauthRow', { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' }, '-=.3')
        .from('.divider', { opacity: 0, duration: 0.35 }, '-=.2')
        .from('.field', { opacity: 0, y: 14, stagger: 0.07, duration: 0.45, ease: 'power3.out' }, '-=.15')
        .from('.terms-row', { opacity: 0, y: 10, duration: 0.4, ease: 'power3.out' }, '-=.1')
        .from('.btn-submit', { opacity: 0, y: 10, duration: 0.45, ease: 'power3.out' }, '-=.2');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Calculate password strength in real time
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    const len = val.length;
    let strength = 0;
    
    if (len >= 8) strength++;
    if (len >= 12) strength++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    setPasswordStrength(strength);

    // Validate confirm field on-the-fly if it was already filled
    if (confirmPassword) {
      setConfirmError(confirmPassword !== val);
    }
  };

  // Validate Email formatting
  const handleEmailBlur = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError(false);
  };

  // Validate password matching
  const handleConfirmBlur = () => {
    if (confirmPassword && confirmPassword !== password) {
      setConfirmError(true);
    } else {
      setConfirmError(false);
    }
  };

  const handleConfirmChange = (e) => {
    setConfirmPassword(e.target.value);
    setConfirmError(false);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(false);

    // Verify all fields are valid
    const isInvalid = !firstName.trim() || 
                      !lastName.trim() || 
                      !email.trim() || 
                      !password.trim() || 
                      !confirmPassword.trim() || 
                      !termsAccepted || 
                      emailError || 
                      confirmError;

    if (isInvalid) {
      setErrorMessage('Please fill in all required fields correctly');
      setFormError(true);
      // GSAP shake animation
      gsap.to(submitBtnRef.current, { x: [-6, 6, -5, 5, -3, 3, 0], duration: 0.4 });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('Creating...');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, company, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Store token and user details in localStorage
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));

      setSubmitStatus('Account created ✓');
      setIsSubmitting(false);
      gsap.to(submitBtnRef.current, { backgroundColor: '#4ade80', duration: 0.4 });
      gsap.to('.panel-right-form', { opacity: 0.96, duration: 0.3 });
      storage.setItem('showWelcome', 'signup');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitStatus('Create Account →');
      setErrorMessage(err.message || 'Registration failed.');
      setFormError(true);
      gsap.to(submitBtnRef.current, { x: [-6, 6, -5, 5, -3, 3, 0], duration: 0.4 });
    }
  };

  // Curated password strength color codes
  const strengthColors = ['#E84040', '#a855f7', '#06b6d4', '#4ade80'];
  const getBarColor = (index) => {
    if (index < passwordStrength) {
      return strengthColors[Math.max(0, passwordStrength - 1)];
    }
    return 'var(--ink5)';
  };

  return (
    <div ref={containerRef} className="signup-page">

      {/* ═══ LEFT PANEL (MARKETING) ═══ */}
      <div className="panel-left-marketing">
        <div className="scanlines"></div>

        {/* Decorative radar visual element */}
        <svg className="radar-deco" viewBox="0 0 170 170" fill="none">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity=".3"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
            </radialGradient>
            <clipPath id="rc"><circle cx="85" cy="85" r="78"/></clipPath>
          </defs>
          <circle cx="85" cy="85" r="78" stroke="#a855f7" strokeOpacity=".14" strokeWidth="1"/>
          <circle cx="85" cy="85" r="56" stroke="#a855f7" strokeOpacity=".17" strokeWidth="1"/>
          <circle cx="85" cy="85" r="34" stroke="#a855f7" strokeOpacity=".22" strokeWidth="1"/>
          <circle cx="85" cy="85" r="12" stroke="#a855f7" strokeOpacity=".3" strokeWidth="1"/>
          <line x1="85" y1="7" x2="85" y2="163" stroke="#a855f7" strokeOpacity=".07" strokeWidth="1"/>
          <line x1="7" y1="85" x2="163" y2="85" stroke="#a855f7" strokeOpacity=".07" strokeWidth="1"/>
          <g clipPath="url(#rc)">
            <path d="M85,85 L85,7 A78,78 0 0,1 163,85 Z" fill="url(#rg)">
              <animateTransform attributeName="transform" type="rotate" from="0 85 85" to="360 85 85" dur="4s" repeatCount="indefinite"/>
            </path>
          </g>
          <circle cx="85" cy="85" r="3" fill="#a855f7" opacity=".8"/>
          <circle cx="118" cy="50" r="4.5" fill="#E84040"><animate attributeName="opacity" values="1;.15;1" dur="2.2s" repeatCount="indefinite"/></circle>
          <circle cx="118" cy="50" r="4" fill="none" stroke="#E84040"><animate attributeName="r" values="4;18" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0" dur="2.2s" repeatCount="indefinite"/></circle>
          <circle cx="58" cy="108" r="3.5" fill="#a855f7"><animate attributeName="opacity" values=".9;.2;.9" dur="3.1s" repeatCount="indefinite"/></circle>
          <circle cx="112" cy="116" r="3" fill="#3A9EE8"><animate attributeName="opacity" values=".8;.1;.8" dur="2.8s" repeatCount="indefinite"/></circle>
        </svg>

        <Link className="logo" to="/">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          lead.ai
        </Link>

        <div className="left-body">
          <p className="l-eyebrow">n8n Automation Platform</p>
          <h2 className="l-title">Score every<br/>lead <em>instantly.</em></h2>
          <p className="l-sub">Join teams using GPT‑4o powered intelligence to stop missing hot opportunities the second they land.</p>
          <div className="feat-list">
            <div className="feat"><span className="fdot hot"></span>Hot leads alerted on Telegram in under 3s</div>
            <div className="feat"><span className="fdot warm"></span>AI scoring across 12 intent signals per lead</div>
            <div className="feat"><span className="fdot cold"></span>Personalised email replies, fully automated</div>
            <div className="feat"><span className="fdot grn"></span>Weekly pipeline reports — zero manual work</div>
          </div>
        </div>

        <div className="left-foot">Already have an account? <Link to="/signin">Sign in →</Link></div>
      </div>

      {/* ═══ RIGHT PANEL (FORM) ═══ */}
      <div className="panel-right-form">
        
        <div className="form-top" id="formTop">
          <p className="form-eyebrow">Create Account</p>
          <h1 className="form-title">Start for free.</h1>
          <p className="form-hint">Already have an account? <Link to="/signin">Sign in →</Link></p>
        </div>

        {/* OAuth Buttons */}
        <div className="oauth-row" id="oauthRow">
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

        <div className="divider"><span className="div-line"></span><span className="div-txt">or sign up with email</span><span className="div-line"></span></div>

        {/* Standard Registration Form */}
        <form id="signupForm" onSubmit={handleSubmit} noValidate>
          <div className="form-body">

            {/* Name Row */}
            <div className="field-row-2">
              <div className="field">
                <label htmlFor="fName">First name</label>
                <div className="input-wrap">
                  <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input 
                    type="text" 
                    id="fName" 
                    name="firstName" 
                    placeholder="Jane" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name" 
                    required 
                  />
                  <span className="glow"></span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="lName">Last name</label>
                <div className="input-wrap">
                  <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input 
                    type="text" 
                    id="lName" 
                    name="lastName" 
                    placeholder="Smith" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name" 
                    required 
                  />
                  <span className="glow"></span>
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="field">
              <label htmlFor="email">Work email</label>
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
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  autoComplete="email" 
                  required 
                />
                <span className="glow"></span>
              </div>
              {emailError && <div className="err" id="emailErr">Please enter a valid email address</div>}
            </div>

            {/* Company Field */}
            <div className="field">
              <label htmlFor="company">Company</label>
              <div className="input-wrap">
                <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h.01M16 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/></svg>
                </span>
                <input 
                  type="text" 
                  id="company" 
                  name="company" 
                  placeholder="Acme Corp" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization" 
                />
                <span className="glow"></span>
              </div>
            </div>

            {/* Account Role Field */}
            <div className="field">
              <label htmlFor="role">Account Role</label>
              <div className="input-wrap">
                <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5l-.01-.01"/></svg>
                </span>
                <select 
                  id="role" 
                  name="role" 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--ink3)',
                    border: '1px solid rgba(168, 85, 247, .18)',
                    color: 'var(--cream)',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '13px',
                    padding: '13px 16px 13px 44px',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    borderRadius: '12px'
                  }}
                >
                  <option value="user">User (Assigned Tasks only)</option>
                  <option value="admin" disabled>Admin (Disabled - Contact Owner)</option>
                </select>
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
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="Min. 8 characters" 
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete="new-password" 
                  required 
                />
                <span className="glow"></span>
              </div>
              
              {/* Strength Bars Grid */}
              <div className="pw-bars">
                <div className="pw-bar" id="pb1" style={{ background: getBarColor(0) }}></div>
                <div className="pw-bar" id="pb2" style={{ background: getBarColor(1) }}></div>
                <div className="pw-bar" id="pb3" style={{ background: getBarColor(2) }}></div>
                <div className="pw-bar" id="pb4" style={{ background: getBarColor(3) }}></div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <div className="input-wrap">
                <span className="i-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input 
                  type="password" 
                  id="confirm" 
                  name="confirm" 
                  placeholder="Re-enter password" 
                  value={confirmPassword}
                  onChange={handleConfirmChange}
                  onBlur={handleConfirmBlur}
                  autoComplete="new-password" 
                  required 
                />
                <span className="glow"></span>
              </div>
              {confirmError && <div className="err" id="confirmErr">Passwords do not match</div>}
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="terms-row">
              <input 
                type="checkbox" 
                id="terms" 
                name="terms" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required 
              />
              <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
            </div>

            {formError && <div className="err" id="formErr">{errorMessage}</div>}

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
    </div>
  );
};

export default SignUp;
