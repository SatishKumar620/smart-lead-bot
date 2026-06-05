import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Home.css';
import ThemeToggle from '../Common/ThemeToggle';
const googleSheetsCrm = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80";
const telegramLeadAlert = "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=800&q=80";

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const containerRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSignalsCount, setActiveSignalsCount] = useState(0);
  
  const [activeFaq, setActiveFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState('');



  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactStatus('error');
      return;
    }
    setContactStatus('sending');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setContactStatus('success');
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactStatus(''), 4000);
    } catch (err) {
      setContactStatus('error');
    }
  };

  // Scroll listener for nav border color
  useEffect(() => {
    const handleScroll = () => {
      const nav = document.getElementById('nav');
      if (nav) {
        nav.style.borderBottomColor = window.scrollY > 60 
          ? 'rgba(168, 85, 247, 0.22)' 
          : 'rgba(168, 85, 247, 0.12)';
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations and Interactive effects
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Entrance animation for Nav
      gsap.from('#nav', { y: -64, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });

      // 2. Hero Timeline
      const htl = gsap.timeline({ delay: 0.4 });
      htl.to('#hPre', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
         .to('.h-tl span', { y: '0%', duration: 1, stagger: 0.1, ease: 'power4.out' }, '-=.3')
         .to('#hRule', { width: '60%', duration: 0.9, ease: 'power3.inOut' }, '-=.5')
         .to('#hSub', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=.5')
         .to('#hActs', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=.4')
         .to('#heroRight', { opacity: 1, duration: 0.9, ease: 'power2.out' }, '-=.6');

      // 3. Counter tick animation inside timeline
      htl.add(() => {
        let v = 0;
        const target = 12;
        const tick = () => {
          v++;
          setActiveSignalsCount(v);
          if (v < target) {
            setTimeout(tick, 80);
          }
        };
        tick();
      }, '-=.4');

      // Helper for ScrollTrigger fade ins
      const sr = (sel, trig, extra = {}) => {
        gsap.set(sel, { opacity: 0, y: 24, ...(extra.from || {}) });
        gsap.to(sel, {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: trig || sel,
            start: 'top 82%',
          },
          ...extra,
        });
      };

      // 4. Content scroll triggers
      sr(['#plTag', '#plTitle', '#plDesc'], '#plTag');
      
      gsap.to('.fnode', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#flow',
          start: 'top 82%',
        }
      });

      gsap.to('.gcard', {
        opacity: 1,
        y: 0,
        stagger: 0.14,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.gcard-grid',
          start: 'top 82%',
          onEnter: () => {
            document.querySelectorAll('.g-bar-fill').forEach((b, i) => {
              setTimeout(() => {
                b.style.transform = 'scaleX(1)';
              }, i * 150 + 400);
            });
          }
        }
      });

      gsap.to('#wfImg', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#wfImg',
          start: 'top 82%',
        }
      });

      gsap.to('.bcard', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#bentoGrid',
          start: 'top 82%',
        }
      });

      sr(['#anTag', '#anTitle', '#anDesc'], '#anTag');

      gsap.set('#ftable tr', { opacity: 0, x: -14 });
      gsap.to('#ftable tr', {
        opacity: 1,
        x: 0,
        stagger: 0.05,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#ftable',
          start: 'top 82%',
        }
      });

      gsap.to('#terminal', {
        opacity: 1,
        x: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#terminal',
          start: 'top 82%',
        }
      });

      gsap.to('#tgPhone', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.report',
          start: 'top 78%',
        }
      });

      gsap.to(['#rpTitle', '#rpDesc', '#cronBadge'], {
        opacity: 1,
        y: 0,
        stagger: 0.14,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.rp-inner',
          start: 'top 80%',
        }
      });

      gsap.to('.strip-img-wrap', {
        opacity: 1,
        y: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.strip-grid',
          start: 'top 82%',
        }
      });

      gsap.to('.step', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.65,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#stepsGrid',
          start: 'top 82%',
        }
      });

      // FAQ scroll entrance
      gsap.set('.faq-item', { opacity: 0, y: 30 });
      gsap.to('.faq-item', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.faq',
          start: 'top 82%',
        }
      });

      // Contact form scroll entrance
      gsap.set('.contact-grid', { opacity: 0, y: 40, scale: 0.95 });
      gsap.to('.contact-grid', {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.contact',
          start: 'top 80%',
        }
      });

      gsap.set(['#ctaT', '#ctaS', '#ctaA'], { opacity: 0, y: 24 });
      gsap.to(['#ctaT', '#ctaS', '#ctaA'], {
        opacity: 1,
        y: 0,
        stagger: 0.14,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.cta',
          start: 'top 80%',
        }
      });

      // 5. Parallax radar — desktop only
      if (window.innerWidth > 900) {
        gsap.to('.radar-wrap', {
          y: -70,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 1.4,
          }
        });
      }

      // 6. Card tilt 3D — fine-pointer only
      if (window.matchMedia('(pointer:fine)').matches) {
        document.querySelectorAll('.gcard').forEach(c => {
          c.addEventListener('mousemove', e => {
            const r = c.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(c, {
              rotateY: x * 8,
              rotateX: -y * 8,
              duration: 0.4,
              ease: 'power2.out',
              transformPerspective: 900,
            });
          });
          c.addEventListener('mouseleave', () => {
            gsap.to(c, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power2.out' });
          });
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', zIndex: 1 }}>
      
      {/* NAVIGATION BAR */}
      <nav id="nav">
        <Link className="nlogo" to="/" onClick={closeMobileMenu}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          lead.ai
        </Link>
        <ul className="nlinks">
          <li><a href="#pipeline">Pipeline</a></li>
          <li><a href="#scoring">Scoring</a></li>
          <li><a href="#reports">Reports</a></li>
          <li><a href="#setup">Setup</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><Link to="/dashboard" style={{ color: 'var(--green)' }}>Dashboard</Link></li>
          <li><Link to="/signin" style={{ color: 'var(--gold)' }}>Sign In</Link></li>
          <li style={{ display: 'flex', alignItems: 'center' }}><ThemeToggle /></li>
        </ul>
        <Link className="ncta" to="/signup">
          <span>Get Workflow</span>
        </Link>
        <button 
          className="nham" 
          id="ham" 
          aria-label="Menu" 
          onClick={toggleMobileMenu}
          /* controlled in CSS media queries */
        >
          <span style={mobileMenuOpen ? { transform: 'translateY(7px) rotate(45deg)' } : {}}></span>
          <span style={mobileMenuOpen ? { opacity: 0 } : {}}></span>
          <span style={mobileMenuOpen ? { transform: 'translateY(-7px) rotate(-45deg)' } : {}}></span>
        </button>
      </nav>


      {/* MOBILE DRAWER */}
      <div className={`nmobile ${mobileMenuOpen ? 'open' : ''}`} id="nmobile">
        <a href="#pipeline" className="nmlink" onClick={closeMobileMenu}>Pipeline</a>
        <a href="#scoring" className="nmlink" onClick={closeMobileMenu}>Scoring</a>
        <a href="#reports" className="nmlink" onClick={closeMobileMenu}>Reports</a>
        <a href="#setup" className="nmlink" onClick={closeMobileMenu}>Setup</a>
        <Link to="/dashboard" className="nmlink" style={{ color: 'var(--green)' }} onClick={closeMobileMenu}>Dashboard ↗</Link>
        <Link to="/signin" className="nmlink" style={{ color: 'var(--gold)' }} onClick={closeMobileMenu}>Sign In ↗</Link>
        <Link to="/signup" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '.12em', textTransform: 'uppercase', textDecoration: 'none' }} onClick={closeMobileMenu}>Get Workflow ↗</Link>
        <div style={{ padding: '8px 0', borderTop: '1px solid var(--line)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="hero" id="hero">
        <div className="scanlines"></div>
        <div className="hero-left">
          <div className="h-pre" id="hPre">
            <span className="h-pre-line"></span>
            n8n Automation Workflow
            <span className="h-pre-badge">v2.4.1</span>
          </div>
          <h1 className="h-title">
            <span className="h-tl"><span>Every</span></span>
            <span className="h-tl"><span>Lead, <em>scored</em></span></span>
            <span className="h-tl"><span>in seconds.</span></span>
          </h1>
          <div className="h-rule" id="hRule"></div>
          <p className="h-sub" id="hSub">GPT‑4o powered intelligence wired directly into n8n. Auto-score, grade, enrich, notify, and reply — the moment a lead lands.</p>
          <div className="h-acts" id="hActs">
            <Link to="/signup" className="btn-p">Deploy Workflow ↗</Link>
            <a href="#pipeline" className="btn-s">How it works <span className="btn-s-arr">→</span></a>
          </div>
        </div>

        <div className="hero-right" id="heroRight">
          <div className="radar-wrap">
            <svg width="300" height="300" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--gold2)" stopOpacity="0.45"/>
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="rg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="var(--radar-sweep-opacity)"/>
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
                </radialGradient>
                <clipPath id="rc"><circle cx="160" cy="160" r="148"/></clipPath>
              </defs>
              <circle cx="160" cy="160" r="148" stroke="var(--radar-circle-1)" strokeWidth="1" strokeDasharray="4 4"/>
              <circle cx="160" cy="160" r="130" stroke="var(--radar-circle-2)" strokeWidth="1"/>
              
              <ellipse cx="160" cy="160" rx="148" ry="50" stroke="var(--radar-circle-3)" strokeWidth="1" transform="rotate(-30 160 160)" opacity="0.6"/>
              <ellipse cx="160" cy="160" rx="148" ry="50" stroke="var(--radar-circle-4)" strokeWidth="1.5" transform="rotate(30 160 160)" opacity="0.6"/>
              <ellipse cx="160" cy="160" rx="148" ry="50" stroke="var(--line2)" strokeWidth="1" transform="rotate(90 160 160)" opacity="0.4"/>
              
              <line x1="160" y1="12" x2="160" y2="308" stroke="var(--radar-grid-lines)" strokeWidth="1" opacity="0.5"/>
              <line x1="12" y1="160" x2="308" y2="160" stroke="var(--radar-grid-lines)" strokeWidth="1" opacity="0.5"/>
              
              <circle cx="160" cy="160" r="24" fill="url(#glow)"/>
              <circle cx="160" cy="160" r="5" fill="var(--gold2)"/>
              
              <g clipPath="url(#rc)">
                <path d="M160,160 L160,12 A148,148 0 0,1 308,160 Z" fill="url(#rg)">
                  <animateTransform attributeName="transform" type="rotate" from="0 160 160" to="360 160 160" dur="5s" repeatCount="indefinite"/>
                </path>
              </g>
              
              <g transform="translate(240 100)">
                <circle cx="0" cy="0" r="5" fill="#f43f5e">
                  <animate attributeName="opacity" values="1;.2;1" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="0" r="5" fill="none" stroke="#f43f5e" strokeWidth="1">
                  <animate attributeName="r" values="5;18" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".8;0" dur="2s" repeatCount="indefinite"/>
                </circle>
              </g>
              
              <g transform="translate(100 220)">
                <circle cx="0" cy="0" r="4.5" fill="var(--gold)">
                  <animate attributeName="opacity" values=".9;.3;.9" dur="3s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="0" r="4.5" fill="none" stroke="var(--gold)" strokeWidth="1">
                  <animate attributeName="r" values="4.5;15" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".7;0" dur="3s" repeatCount="indefinite"/>
                </circle>
              </g>
              
              <g transform="translate(196 228)">
                <circle cx="0" cy="0" r="4" fill="var(--gold2)">
                  <animate attributeName="opacity" values=".8;.15;.8" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="0" r="4" fill="none" stroke="var(--gold2)" strokeWidth="1">
                  <animate attributeName="r" values="4;14" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".6;0" dur="2.5s" repeatCount="indefinite"/>
                </circle>
              </g>
              
              <circle cx="80" cy="90" r="3.5" fill="#3b82f6">
                <animate attributeName="opacity" values=".6;.1;.6" dur="4s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <div className="stat-row">
            <div className="stat-pill">
              <span className="stat-val">{activeSignalsCount}</span>
              <span className="stat-lbl">AI Signals</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">&lt;3s</span>
              <span className="stat-lbl">Latency</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">100%</span>
              <span className="stat-lbl">Automated</span>
            </div>
          </div>
          <div className="live-feed">
            <span className="live-dot"></span>
            <span className="live-tag">Live</span>
            <div className="live-text">
              <div className="live-inner">
                [HOT] LEAD-1748432 scored 9/10 &nbsp;&nbsp;&nbsp; [WARM] LEAD-1748388 scored 6/10 &nbsp;&nbsp;&nbsp; [COLD] LEAD-1748201 scored 2/10 &nbsp;&nbsp;&nbsp; [HOT] LEAD-1748432 scored 9/10 &nbsp;&nbsp;&nbsp; [WARM] LEAD-1748388 scored 6/10
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-inner">
          <span className="ti">Webhook Intake<span className="x">✦</span></span>
          <span className="ti">AI Lead Scoring<span className="x">✦</span></span>
          <span className="ti">Google Sheets<span className="x">✦</span></span>
          <span className="ti">Telegram Alerts<span className="x">✦</span></span>
          <span className="ti">Gmail Auto-Reply<span className="x">✦</span></span>
          <span className="ti">Weekly Reports<span className="x">✦</span></span>
          <span className="ti">Hot / Warm / Cold<span className="x">✦</span></span>
          <span className="ti">GPT‑4o Powered<span className="x">✦</span></span>
          <span className="ti">18 Nodes<span className="x">✦</span></span>
          
          <span className="ti">Webhook Intake<span className="x">✦</span></span>
          <span className="ti">AI Lead Scoring<span className="x">✦</span></span>
          <span className="ti">Google Sheets<span className="x">✦</span></span>
          <span className="ti">Telegram Alerts<span className="x">✦</span></span>
          <span className="ti">Gmail Auto-Reply<span className="x">✦</span></span>
          <span className="ti">Weekly Reports<span className="x">✦</span></span>
          <span className="ti">Hot / Warm / Cold<span className="x">✦</span></span>
          <span className="ti">GPT‑4o Powered<span className="x">✦</span></span>
          <span className="ti">18 Nodes<span className="x">✦</span></span>
        </div>
      </div>

      {/* PIPELINE ARCHITECTURE */}
      <section className="pipeline" id="pipeline">
        <div className="pl-head">
          <div>
            <p className="sec-tag" id="plTag">Workflow Architecture</p>
            <h2 className="pl-title" id="plTitle">18 nodes.<br/><span>Zero</span> manual steps.</h2>
          </div>
          <p className="pl-desc" id="plDesc">From raw webhook payload to scored, stored, notified and replied — every incoming lead is automatically processed through enrichment, AI analysis, and multi-channel action nodes. No code. No servers.</p>
        </div>
        <div className="flow" id="flow">
          <div className="fnode">
            <div className="fnode-circ">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="fnode-num">01 — Trigger</div>
            <div className="fnode-name">Webhook Intake</div>
            <div className="fnode-desc">POST endpoint validates email before routing downstream.</div>
          </div>
          <div className="fnode">
            <div className="fnode-circ">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div className="fnode-num">02 — Enrich</div>
            <div className="fnode-name">Data Extraction</div>
            <div className="fnode-desc">Parses fields, detects corporate vs free domain, assigns lead ID.</div>
          </div>
          <div className="fnode">
            <div className="fnode-circ">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
                <line x1="8" y1="16" x2="8.01" y2="16"/>
                <line x1="16" y1="16" x2="16.01" y2="16"/>
              </svg>
            </div>
            <div className="fnode-num">03 — AI</div>
            <div className="fnode-name">GPT‑4o Score</div>
            <div className="fnode-desc">Analyzes intent, budget, urgency, sentiment and deal value in one call.</div>
          </div>
          <div className="fnode">
            <div className="fnode-circ">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div className="fnode-num">04 — Store</div>
            <div className="fnode-name">Google Sheets</div>
            <div className="fnode-desc">Appends full AI-enriched record with 21 structured columns.</div>
          </div>
          <div className="fnode">
            <div className="fnode-circ">
              <svg viewBox="0 0 24 24" width="26" height="26" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div className="fnode-num">05 — Route</div>
            <div className="fnode-name">Smart Routing</div>
            <div className="fnode-desc">Branches Hot / Warm / Cold, triggers notifications and emails.</div>
          </div>
        </div>
      </section>



      {/* SCORING GRADES */}
      <section className="grades" id="scoring">
        <p className="sec-tag">AI Lead Scoring</p>
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 'clamp(32px, 4.5vw, 54px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Three grades.<br/>One decision per lead.</h2>
        <div className="gcard-grid">
          <div className="gcard hot">
            <span className="g-emoji">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--hot)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginBottom: '8px' }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </span>
            <div className="g-title">Hot</div>
            <div className="g-range">Score 7 – 10</div>
            <div className="g-desc">High intent, strong budget signals, immediate urgency. Close within 24 hours or risk losing the deal.</div>
            <div className="g-items">
              <div className="g-item">Telegram alert fires instantly</div>
              <div className="g-item">2-hour reply email automated</div>
              <div className="g-item">Personalized AI opener included</div>
            </div>
            <div className="g-bar-wrap">
              <div className="g-bar-label">Priority level</div>
              <div className="g-bar">
                <div className="g-bar-fill" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>
          <div className="gcard warm">
            <span className="g-emoji">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--gold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginBottom: '8px' }}>
                <path d="M12 20h.01M12 16h.01M12 12h.01M12 8V4M12 4a2 2 0 0 0-4 0v10.38a6 6 0 1 0 8 0V4a2 2 0 0 0-4-0z"/>
              </svg>
            </span>
            <div className="g-title">Warm</div>
            <div className="g-range">Score 4 – 6</div>
            <div className="g-desc">Interested, exploring options, moderate budget indicators. A well-timed follow-up converts reliably.</div>
            <div className="g-items">
              <div className="g-item">Telegram summary notification</div>
              <div className="g-item">24-hour reply email dispatched</div>
              <div className="g-item">Follow-up date auto-scheduled</div>
            </div>
            <div className="g-bar-wrap">
              <div className="g-bar-label">Priority level</div>
              <div className="g-bar">
                <div className="g-bar-fill" style={{ width: '55%' }}></div>
              </div>
            </div>
          </div>
          <div className="gcard cold">
            <span className="g-emoji">
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--cold)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginBottom: '8px' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </span>
            <div className="g-title">Cold</div>
            <div className="g-range">Score 1 – 3</div>
            <div className="g-desc">Early-stage awareness, low urgency or budget signals. Added to nurture list for long-term cultivation.</div>
            <div className="g-items">
              <div className="g-item">Cold-list Telegram ping</div>
              <div className="g-item">Logged with follow-up date</div>
              <div className="g-item">Nurture sequence assigned</div>
            </div>
            <div className="g-bar-wrap">
              <div className="g-bar-label">Priority level</div>
              <div className="g-bar">
                <div className="g-bar-fill" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section className="bento" id="features">
        <h2 className="bento-title">Everything in one<br/><span style={{ color: 'var(--gold)' }}>workflow.</span></h2>
        <div className="bento-grid" id="bentoGrid">

          <div className="bcard span2">
            <span className="bcard-tag">Sales Dashboard</span>
            <div className="bcard-title">Your full pipeline in Google Sheets, auto-populated.</div>
            <div className="bcard-desc">Every lead lands as a structured row — 21 columns including AI score, grade, intent, deal value, urgency, and personalized opener. Zero manual entry.</div>
            <img 
              className="bcard-img"
              src={googleSheetsCrm}
              alt="Google Sheets CRM with lead data" 
              loading="lazy"
            />
          </div>

          <div className="bcard tall">
            <span className="bcard-tag">Instant Alerts</span>
            <div className="bcard-title">Telegram pings the moment a hot lead hits.</div>
            <div className="bcard-desc">Three separate notification templates — Hot, Warm, Cold — each with AI-generated context, score, deal value, and recommended action.</div>
            <img 
              className="bcard-img tall-img"
              src={telegramLeadAlert}
              alt="Telegram notification on mobile" 
              loading="lazy"
            />
          </div>

          <div className="bcard">
            <span className="bcard-tag">AI Engine</span>
            <div className="bcard-title">GPT‑4o Mini at temperature 0.3</div>
            <div className="bcard-desc">Consistent, deterministic scoring. Enforced JSON schema with graceful fallback parsing on every call.</div>
            <div className="bcard-icon">
              <svg viewBox="0 0 24 24" width="30" height="30" stroke="var(--gold)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '20px', display: 'block' }}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Intent</span>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Urgency</span>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Budget</span>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Sentiment</span>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Deal Value</span>
              <span style={{ padding: '3px 8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--mist)' }}>Opener</span>
            </div>
          </div>

          <div className="bcard">
            <div className="bcard-stat">18</div>
            <div className="bcard-stat-label">Automation nodes in the workflow</div>
            <div className="bcard-desc" style={{ marginTop: '16px' }}>Webhook → Validate → Enrich → Score → Parse → Store → Route → Notify × 3 → Email × 2 → Reply → Schedule → Fetch → Analyze → Report</div>
          </div>

          <div className="bcard">
            <span className="bcard-tag">Weekly Intel</span>
            <div className="bcard-title">Cron report every Monday 9AM</div>
            <div className="bcard-desc">Auto-computed pipeline summary from your Google Sheet. Hot / Warm / Cold counts, avg AI score, high-revenue leads, and new-this-week figures.</div>
            <div style={{ marginTop: '20px', padding: '14px', border: '1px solid var(--line)', background: 'var(--ink2)', fontSize: '11px', lineHeight: 1.8, color: 'var(--mist)' }}>
              <span style={{ color: 'var(--gold)' }}>cron:</span> 0 9 * * 1<br/>
              <span style={{ color: 'var(--gold)' }}>node:</span> Schedule Trigger<br/>
              <span style={{ color: 'var(--gold)' }}>output:</span> Telegram summary
            </div>
          </div>

        </div>
      </section>

      {/* OUTPUT SCHEMA ANALYSIS */}
      <section className="analysis" id="ai-analysis">
        <div className="an-inner">
          <div>
            <p className="sec-tag" id="anTag">Output Schema</p>
            <h2 className="an-title" id="anTitle">12 signals.<br/><span>Zero</span> prompting needed.</h2>
            <p className="an-desc" id="anDesc">GPT-4o Mini returns a structured JSON payload for every lead — enforced schema with graceful fallback parsing. Temperature locked at 0.3 for consistent, deterministic output.</p>
            <table className="ftable" id="ftable">
              <tbody>
                <tr><td>score</td><td><span className="fchip">1 – 10</span></td></tr>
                <tr><td>grade</td><td><span className="fchip">Hot / Warm / Cold</span></td></tr>
                <tr><td>budget_signal</td><td><span className="fchip">High / Medium / Low</span></td></tr>
                <tr><td>urgency</td><td><span className="fchip">Immediate / Soon / Exploring</span></td></tr>
                <tr><td>sentiment</td><td><span className="fchip">Positive / Neutral / Negative</span></td></tr>
                <tr><td>estimated_deal_value</td><td><span className="fchip">$range</span></td></tr>
                <tr><td>revenue_potential</td><td><span className="fchip">High / Medium / Low</span></td></tr>
                <tr><td>risk_flags</td><td><span className="fchip">string / None</span></td></tr>
                <tr><td>personalized_opener</td><td><span className="fchip">email string</span></td></tr>
                <tr><td>recommended_action</td><td><span className="fchip">next step</span></td></tr>
                <tr><td>follow_up_days</td><td><span className="fchip">integer</span></td></tr>
                <tr><td>intent</td><td><span className="fchip">summary string</span></td></tr>
              </tbody>
            </table>
          </div>
          <div className="terminal" id="terminal">
            <div className="term-bar">
              <div className="term-btn r"></div><div className="term-btn y"></div><div className="term-btn g"></div>
              <span className="term-label">AI Response Payload</span>
            </div>
            <div className="term-body">
              <div><span className="jc">// LEAD-1748432 · processed in 0.8s</span></div>
              <div><span className="jk">"score"</span>: <span className="jn">9</span>,</div>
              <div><span className="jk">"grade"</span>: <span className="js">"Hot"</span>,</div>
              <div><span className="jk">"intent"</span>: <span className="js">"Evaluating for Q3 purchase"</span>,</div>
              <div><span className="jk">"budget_signal"</span>: <span className="js">"High"</span>,</div>
              <div><span className="jk">"urgency"</span>: <span className="js">"Immediate"</span>,</div>
              <div><span className="jk">"estimated_deal_value"</span>: <span className="js">"$8k–$15k"</span>,</div>
              <div><span className="jk">"sentiment"</span>: <span className="js">"Positive"</span>,</div>
              <div><span className="jk">"revenue_potential"</span>: <span className="js">"High"</span>,</div>
              <div><span className="jk">"risk_flags"</span>: <span className="js">"None"</span>,</div>
              <div><span className="jk">"recommended_action"</span>: <span className="js">"SMS + personalized email reply"</span>,</div>
              <div><span className="jk">"follow_up_days"</span>: <span className="jn">0</span>,</div>
              <div><span className="jk">"personalized_opener"</span>: <span className="js">"Hey, saw you're expanding your n8n workflows..."</span></div>
              <div><span className="jc">// ... ready to route downstream</span></div>
              <div style={{ marginTop: '10px' }}><span className="jc">&gt; routing completed <span className="cblink">█</span></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* TELEGRAM REPORT */}
      <section className="report" id="reports">
        <div className="rp-inner">
          <div className="tg-phone" id="tgPhone">
            <div className="tg-topbar">
              <div className="tg-avatar">L</div>
              <div>
                <div className="tg-name">lead.ai Bot</div>
                <div className="tg-status">bot</div>
              </div>
            </div>
            <div className="tg-body">
              <div className="tg-bubble">
                <div className="tg-line"><span className="tg-hl">HOT LEAD SCORING ALERT</span></div>
                <div className="tg-line">━━━━━━━━━━━━━━━━━━━━</div>
                <div className="tg-line"><span className="tg-hl">Lead ID:</span> LEAD-1748432</div>
                <div className="tg-line"><span className="tg-hl">Company:</span> Scale AI Inc.</div>
                <div className="tg-line"><span className="tg-hl">Revenue:</span> $50M - $100M</div>
                <div className="tg-line">━━━━━━━━━━━━━━━━━━━━</div>
                <div className="tg-line"><span className="tg-hl">AI Score:</span> <span className="tg-hot">9/10 (HOT)</span></div>
                <div className="tg-line"><span className="tg-hl">Deal Value:</span> $8,000 - $15,000</div>
                <div className="tg-line"><span className="tg-hl">Urgency:</span> Immediate (Q3)</div>
                <div className="tg-line"><span className="tg-hl">Intent:</span> Replacing manual scoring.</div>
                <div className="tg-line">━━━━━━━━━━━━━━━━━━━━</div>
                <div className="tg-line"><span className="tg-hl">Action:</span> SMS alert sent to Account Exec.</div>
                <div className="tg-time">13:14</div>
              </div>
            </div>
          </div>
          <div>
            <div className="cron-badge" id="cronBadge">
              <span className="cron-dot"></span>
              <span>Telegram + Gmail Integration</span>
            </div>
            <h2 className="rp-title" id="rpTitle">Instant alerts.<br/>Zero delay.</h2>
            <p className="rp-desc" id="rpDesc">Receive detailed notifications instantly inside Telegram. Hot leads are flagged in bright red, including deal value estimations, company domains, and exact intents. Gmail auto-drafts a personalized reply draft within two hours, keeping response speed at absolute peak.</p>
            <Link to="/signup" className="btn-p">Start Free Trial</Link>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / IMAGE STRIP */}
      <section className="img-strip">
        <div className="img-strip-header">
          <h2 className="img-strip-title">Inside n8n.</h2>
          <p className="img-strip-sub">Custom designed nodes working seamlessly together in a low-latency environment.</p>
        </div>
        <div className="strip-grid">
          <div className="strip-img-wrap">
            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" alt="Abstract fluid art" />
            <div className="strip-overlay"></div>
            <span className="strip-label"><span className="strip-tag">Automation</span><br/>Workflow Canvas Overview</span>
          </div>
          <div className="strip-img-wrap">
            <img src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop" alt="Vibrant 3D rendering" />
            <div className="strip-overlay"></div>
            <span className="strip-label"><span className="strip-tag">AI Node</span><br/>Enforcing JSON Response Schema</span>
          </div>
          <div className="strip-img-wrap">
            <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop" alt="Abstract wireframe sphere" />
            <div className="strip-overlay"></div>
            <span className="strip-label"><span className="strip-tag">Security</span><br/>Credential & API Key Lock</span>
          </div>
        </div>
      </section>

      {/* SETUP INSTRUCTIONS */}
      <section className="setup" id="setup">
        <div className="setup-h">
          <h2 className="setup-title">Live in 4 steps.</h2>
          <p className="setup-sub">No servers. No code. Import the n8n JSON, plug in your credentials, and watch the first scored lead arrive in real time.</p>
        </div>
        <div className="steps" id="stepsGrid">
          <div className="step">
            <span className="step-n">01</span>
            <div className="step-title">Import Workflow</div>
            <div className="step-desc">Download the JSON and import directly into n8n via the workflow editor's import menu.</div>
          </div>
          <div className="step">
            <span className="step-n">02</span>
            <div className="step-title">Add Credentials</div>
            <div className="step-desc">Connect your OpenAI API key, Google Sheets OAuth, Gmail account, and Telegram Bot token.</div>
          </div>
          <div className="step">
            <span className="step-n">03</span>
            <div className="step-title">Configure IDs</div>
            <div className="step-desc">Paste your Google Sheet ID and Telegram Chat ID into the three placeholder nodes.</div>
          </div>
          <div className="step">
            <span className="step-n">04</span>
            <div className="step-title">Fire &amp; Watch ⚡</div>
            <div className="step-desc">Send a test POST to your webhook URL. First lead scored, stored, and notified in under 3 seconds.</div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq" id="faq">
        <div className="setup-h">
          <h2 className="setup-title">FAQ</h2>
          <p className="setup-sub">Everything you need to know about our high-speed automation platform.</p>
        </div>
        <div className="faq-grid">
          {[
            {
              q: "How does lead.ai auto-score leads?",
              a: "We utilize advanced GPT-4o Mini prompts with strictly enforced JSON schemas. When a lead enters the system, our backend evaluates their company description, revenue band, location, and industry against your target profile to compute a score out of 10 instantly."
            },
            {
              q: "Can I connect lead.ai to Slack or WhatsApp?",
              a: "Yes! Because lead.ai is built natively on n8n, you can easily add Slack webhooks, WhatsApp Business APIs, or Discord bots into the workflow canvas to direct alerts to any communication channel you prefer."
            },
            {
              q: "What databases are supported?",
              a: "Our standard workflow outputs directly to a local PostgreSQL instance and a synchronized Google Sheet. However, n8n supports over 300 integrations, meaning you can sync your leads to Salesforce, HubSpot, Airtable, or MongoDB with a single click."
            },
            {
              q: "Do I need coding experience to get started?",
              a: "Not at all. lead.ai is designed to be fully plug-and-play. You simply copy-paste our n8n workflow JSON, input your credentials (like OpenAI and Google Sheets), and the system is ready to receive and process leads immediately."
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={`faq-item ${activeFaq === idx ? 'open' : ''}`}
            >
              <div className="faq-q" onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                <span>{item.q}</span>
                <span className="faq-arrow">▼</span>
              </div>
              <div className="faq-a">
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT US SECTION */}
      <section className="contact" id="contact">
        <div className="contact-grid">
          <h2 className="contact-title">Get in touch</h2>
          <p className="contact-sub">Have questions or need custom integrations? Drop us a message!</p>
          
          {contactStatus === 'success' && (
            <div className="contact-status success">
              Message sent successfully! We will get back to you shortly.
            </div>
          )}
          {contactStatus === 'error' && (
            <div className="contact-status error">
              Please fill in all fields before sending.
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="contact-form">
            <div className="contact-row">
              <label htmlFor="c-name">Name</label>
              <input 
                id="c-name"
                type="text" 
                className="contact-input" 
                placeholder="Your name" 
                value={contactForm.name}
                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            <div className="contact-row">
              <label htmlFor="c-email">Email Address</label>
              <input 
                id="c-email"
                type="email" 
                className="contact-input" 
                placeholder="your@email.com" 
                value={contactForm.email}
                onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
            </div>
            <div className="contact-row">
              <label htmlFor="c-msg">Message</label>
              <textarea 
                id="c-msg"
                className="contact-input contact-textarea" 
                placeholder="How can we help you?" 
                value={contactForm.message}
                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="contact-btn">
              {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta">
        <div className="cta-bg">LEAD.AI</div>
        <div className="cta-inner">
          <p className="sec-tag cta-tag">Deploy Today</p>
          <h2 className="cta-title" id="ctaT">Stop losing leads<br/>to <em>slow follow-ups.</em></h2>
          <p className="cta-sub" id="ctaS">Deploy in under 10 minutes. Your next hot lead is waiting.</p>
          <div className="cta-acts" id="ctaA">
            <Link to="/signup" className="btn-p">Download n8n Workflow</Link>
            <a href="#pipeline" className="btn-s">View docs <span className="btn-s-arr">→</span></a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>© 2026 lead.ai — Built on n8n</div>
        <div className="f-links">
          <a href="#">GitHub</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
          <a href="#">Docs</a>
          <a href="#">n8n.io</a>
        </div>
      </footer>

    </div>
  );
};

export default Home;
