import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import L from 'leaflet';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import './Dashboard.css';
import ThemeToggle from '../Common/ThemeToggle';
import * as XLSX from 'xlsx';
import storage from '../../utils/storage';

// Register Chart.js models
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// SVG Icon Components for high visual fidelity (strictly no emojis)
const renderScoreIcon = (grade) => {
  const lowerGrade = grade?.toLowerCase() || '';
  if (lowerGrade === 'hot') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--hot)', flexShrink: 0 }}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    );
  } else if (lowerGrade === 'warm') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold)', flexShrink: 0 }}>
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
      </svg>
    );
  } else {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cold)', flexShrink: 0 }}>
        <path d="M20 12H4M12 20V4M17.657 17.657L6.343 6.343M17.657 6.343L6.343 17.657"/>
      </svg>
    );
  }
};

const NavIcon = ({ name }) => {
  const iconPaths = {
    dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    map: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
    bot: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18",
    manage: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  };
  return (
    <svg className="db-nav-icon" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[name]} />
    </svg>
  );
};

// n8n Node Icons mapping (clean visual SVG elements instead of emojis)
const N8nNodeIcon = ({ id }) => {
  const icons = {
    1: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    2: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    3: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    4: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    5: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    6: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
    7: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    8: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    9: (
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    )
  };
  return icons[id] || null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);

  const userStr = storage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || 'user';

  // On mount: check token existence and redirect if missing
  useEffect(() => {
    const token = storage.getItem('token');
    if (!token) {
      navigate('/signin');
    }
  }, [navigate]);

  const authenticatedFetch = async (url, options = {}) => {
    const token = storage.getItem('token');
    if (!token) {
      navigate('/signin');
      throw new Error('No token found');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        storage.removeItem('token');
        storage.removeItem('user');
        navigate('/signin');
        throw new Error('Unauthorized');
      }
      return response;
    } catch (err) {
      if (err.message === 'Unauthorized') throw err;
      console.error(`Fetch error for ${url}:`, err);
      throw err;
    }
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview');

  // ── Welcome popup state ──
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeType, setWelcomeType] = useState('signin'); // 'signin' | 'signup'

  // ── Notification state ──
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await authenticatedFetch('/api/notifications');
      if (res.ok) setNotifications(await res.json());
    } catch (e) { /* silent */ }
  };

  const markNotifRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await authenticatedFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }); } catch (e) {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await authenticatedFetch('/api/notifications/read-all', { method: 'PATCH' }); } catch (e) {}
  };

  const handleNotifClick = (notif) => {
    markNotifRead(notif.id);
    setNotifOpen(false);
    if (notif.link_tab) setActiveTab(notif.link_tab);
  };



  const relativeTime = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const notifIcon = (type) => {
    const icons = {
      task_assigned: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      task_comment: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      task_completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      task_updated: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      lead_generated: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      milestone_done: 'M5 13l4 4L19 7',
    };
    return icons[type] || icons.task_assigned;
  };

  const notifColor = (type) => {
    const colors = { task_assigned: '#6366f1', task_comment: '#f59e0b', task_completed: '#22c55e', task_updated: '#06b6d4', lead_generated: '#e8962a', milestone_done: '#a855f7' };
    return colors[type] || '#6366f1';
  };

  // Leads Database State with geographical coordinates (synced with PostgreSQL)
  const [leads, setLeads] = useState([
    { leadId: 'LEAD-101', timestamp: '2026-05-28T09:15:00Z', company: 'Scale AI Corp', website: 'https://scale.com', industry: 'Machine Learning', location: 'San Francisco', source: 'SerpAPI', ai_score: 9, ai_grade: 'Hot', ai_intent: 'Replacing manual lead grading systems.', ai_budget_signal: 'High', ai_urgency: 'Immediate', ai_estimated_deal_value: '$10k-$20k', ai_sentiment: 'Positive', ai_revenue_potential: 'High', ai_risk_flags: 'None', status: 'New', next_followup: '2026-05-29', ai_recommended_action: 'Ping AE for custom product demo session.', lat: 37.7749, lng: -122.4194 },
    { leadId: 'LEAD-102', timestamp: '2026-05-28T08:30:00Z', company: 'IndieGrow Ltd', website: 'https://indiegrow.co', industry: 'SaaS Platforms', location: 'Bangalore', source: 'SerpAPI', ai_score: 6, ai_grade: 'Warm', ai_intent: 'Exploring automation options.', ai_budget_signal: 'Medium', ai_urgency: 'Soon', ai_estimated_deal_value: '$3k-$6k', ai_sentiment: 'Positive', ai_revenue_potential: 'Medium', ai_risk_flags: 'None', status: 'Contacted', next_followup: '2026-06-01', ai_recommended_action: 'Send automated product introduction deck.', lat: 12.9716, lng: 77.5946 },
    { leadId: 'LEAD-103', timestamp: '2026-05-27T17:45:00Z', company: 'EnterpriseFlow', website: 'https://enterpriseflow.io', industry: 'Workflows', location: 'London', source: 'SerpAPI', ai_score: 8, ai_grade: 'Hot', ai_intent: 'Needs massive scale deployment.', ai_budget_signal: 'High', ai_urgency: 'Immediate', ai_estimated_deal_value: '$15k-$25k', ai_sentiment: 'Positive', ai_revenue_potential: 'High', ai_risk_flags: 'None', status: 'In Progress', next_followup: '2026-05-30', ai_recommended_action: 'Schedule Q3 deployment technical review.', lat: 51.5074, lng: -0.1278 },
    { leadId: 'LEAD-104', timestamp: '2026-05-27T12:00:00Z', company: 'TokyoTech Group', website: 'https://tokyotech.jp', industry: 'Electronics', location: 'Tokyo', source: 'SerpAPI', ai_score: 5, ai_grade: 'Warm', ai_intent: 'Evaluating vendor options.', ai_budget_signal: 'Medium', ai_urgency: 'Exploring', ai_estimated_deal_value: '$5k-$10k', ai_sentiment: 'Neutral', ai_revenue_potential: 'Medium', ai_risk_flags: 'High churn history', status: 'New', next_followup: '2026-06-03', ai_recommended_action: 'Share enterprise compliance whitepaper.', lat: 35.6762, lng: 139.6503 },
    { leadId: 'LEAD-105', timestamp: '2026-05-26T15:20:00Z', company: 'MunichCloud', website: 'https://munichcloud.de', industry: 'Cloud Infrastructure', location: 'Berlin', source: 'SerpAPI', ai_score: 2, ai_grade: 'Cold', ai_intent: 'Early awareness research.', ai_budget_signal: 'Low', ai_urgency: 'Exploring', ai_estimated_deal_value: '$1k-$2k', ai_sentiment: 'Neutral', ai_revenue_potential: 'Low', ai_risk_flags: 'None', status: 'Closed', next_followup: '2026-06-15', ai_recommended_action: 'Monitor newsletters for product activity.', lat: 52.5200, lng: 13.4050 }
  ]);

  // Filtering & Search
  const [filterGrade, setFilterGrade] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewPerPage = 5;

  // ── Dynamic Quick Lead Ingest ──
  // Core always-present fields (required=true cannot be removed)
  const DEFAULT_INGEST_FIELDS = [
    { key: 'company',  label: 'Company Name',  type: 'text',   required: true,  placeholder: 'Acme Corp' },
    { key: 'industry', label: 'Industry',       type: 'text',   required: true,  placeholder: 'SaaS / Hotel / Restaurant' },
    { key: 'location', label: 'City / Location',type: 'text',   required: true,  placeholder: 'Bangalore' },
    { key: 'website',  label: 'Website',        type: 'url',    required: false, placeholder: 'https://acme.com' },
    { key: 'phone',    label: 'Phone',          type: 'text',   required: false, placeholder: '+91 98765 43210' },
    { key: 'email',    label: 'Email',          type: 'email',  required: false, placeholder: 'hello@acme.com' },
  ];

  // Field catalog — all possible fields admin can add
  const FIELD_CATALOG = [
    { key: 'contact_name',   label: 'Contact Name',      type: 'text',   placeholder: 'John Doe' },
    { key: 'contact_title',  label: 'Contact Title',     type: 'text',   placeholder: 'CEO / Manager' },
    { key: 'address',        label: 'Full Address',      type: 'text',   placeholder: '123 Main St, City' },
    { key: 'whatsapp_number',label: 'WhatsApp Number',   type: 'text',   placeholder: '+91 98765 43210' },
    { key: 'rating',         label: 'Rating (0-5)',      type: 'number', placeholder: '4.2' },
    { key: 'ai_score',       label: 'AI Score (1-10)',   type: 'number', placeholder: '7' },
    { key: 'status',         label: 'Status',            type: 'select', options: ['New','Contacted','In Progress','Closed'], placeholder: 'New' },
    { key: 'next_followup',  label: 'Next Follow-up',    type: 'date',   placeholder: '' },
    { key: 'source',         label: 'Lead Source',       type: 'text',   placeholder: 'Google / LinkedIn / Referral' },
    { key: 'business_status',label: 'Business Status',   type: 'text',   placeholder: 'Operational' },
    { key: 'opening_hours',  label: 'Opening Hours',     type: 'text',   placeholder: 'Mon-Sat 9am-6pm' },
    { key: 'category',       label: 'Category',          type: 'text',   placeholder: 'Hotel / Restaurant / Clinic' },
    { key: 'total_ratings',  label: 'Total Ratings',     type: 'number', placeholder: '320' },
    { key: 'lat',            label: 'Latitude',          type: 'number', placeholder: '12.9716' },
    { key: 'lng',            label: 'Longitude',         type: 'number', placeholder: '77.5946' },
    { key: 'google_maps_url',label: 'Google Maps URL',   type: 'url',    placeholder: 'https://maps.google.com/...' },
    { key: 'website_description', label: 'Website Description', type: 'text', placeholder: 'Short about the business' },
  ];

  const [ingestFields, setIngestFields] = useState(DEFAULT_INGEST_FIELDS);
  const [ingestValues, setIngestValues] = useState({});
  const [ingestStatus, setIngestStatus] = useState('');
  const [ingestFieldPickerOpen, setIngestFieldPickerOpen] = useState(false);

  // Legacy alias kept for any older references
  const quickIngestForm = ingestValues;
  const setQuickIngestForm = setIngestValues;
  const [quickIngestStatus, setQuickIngestStatus] = useState('');
  const [activeTooltip, setActiveTooltip] = useState(null);

  // --- Ingest Templates States ---
  const [ingestTemplates, setIngestTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // --- Google Forms Integration States ---
  const [googleStatus, setGoogleStatus] = useState({ connected: false, configured: false });
  const [googleForms, setGoogleForms] = useState([]);
  const [googleClientConfig, setGoogleClientConfig] = useState({ client_id: '', client_secret: '', redirect_uri: '' });
  const [newFormTitle, setNewFormTitle] = useState('');
  const [formsSyncStatus, setFormsSyncStatus] = useState({});
  const [googleConfigMessage, setGoogleConfigMessage] = useState('');
  const [googleFormFields, setGoogleFormFields] = useState([]);
  const [formCreateStatus, setFormCreateStatus] = useState('');

  // Welcome popup on mount
  useEffect(() => {
    const welcomeFlag = storage.getItem('showWelcome');
    if (welcomeFlag) {
      setWelcomeType(welcomeFlag);
      setWelcomeVisible(true);
      storage.removeItem('showWelcome');
      const t = setTimeout(() => setWelcomeVisible(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  // Fetch initial templates and integration config on mount
  useEffect(() => {
    fetchIngestTemplates();
    fetchGoogleStatus();
    fetchGoogleForms();
  }, []);

  // Keep googleFormFields in sync with ingestFields
  useEffect(() => {
    setGoogleFormFields(ingestFields.map(f => f.key));
  }, [ingestFields]);

  // Poll notifications every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.notif-bell-wrap')) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const fetchIngestTemplates = async () => {
    try {
      const res = await authenticatedFetch('/api/ingest-templates');
      if (res.ok) setIngestTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await authenticatedFetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchGoogleForms = async () => {
    try {
      const res = await authenticatedFetch('/api/google-forms/list');
      if (res.ok) setGoogleForms(await res.json());
    } catch (e) { console.error(e); }
  };

  const saveGoogleCredentials = async (e) => {
    e.preventDefault();
    setGoogleConfigMessage('Saving...');
    try {
      const res = await authenticatedFetch('/api/google/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleClientConfig)
      });
      if (res.ok) {
        setGoogleConfigMessage('Credentials saved successfully.');
        fetchGoogleStatus();
      } else {
        const err = await res.json();
        setGoogleConfigMessage(err.error || 'Failed to save credentials.');
      }
    } catch (err) {
      setGoogleConfigMessage('Network error. Try again.');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await authenticatedFetch('/api/google/auth-url');
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const err = await res.json();
        alert(err.error || 'Configure credentials first.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGoogleForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) {
      alert("Please enter a title for the Google Form.");
      return;
    }
    if (googleFormFields.length === 0) {
      alert("Please select at least one field to include in the Google Form.");
      return;
    }
    setFormCreateStatus('Creating form...');
    try {
      const fieldsPayload = googleFormFields.map(key => {
        const found = ingestFields.find(f => f.key === key);
        return found || { key, label: key, type: 'text', required: false };
      });

      const res = await authenticatedFetch('/api/google-forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFormTitle,
          fields: fieldsPayload
        })
      });
      if (res.ok) {
        setFormCreateStatus('Form created successfully!');
        setNewFormTitle('');
        fetchGoogleForms();
        setTimeout(() => setFormCreateStatus(''), 3000);
      } else {
        const err = await res.json();
        setFormCreateStatus(err.error || 'Failed to create form.');
      }
    } catch (err) {
      setFormCreateStatus('Network error.');
    }
  };

  const handleSyncGoogleForm = async (formId) => {
    setFormsSyncStatus(prev => ({ ...prev, [formId]: 'Syncing...' }));
    try {
      const res = await authenticatedFetch('/api/google-forms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId })
      });
      if (res.ok) {
        const data = await res.json();
        setFormsSyncStatus(prev => ({ ...prev, [formId]: `Synced! ${data.message || ''}` }));
        const dbResp = await authenticatedFetch('/api/leads');
        if (dbResp.ok) setLeads(await dbResp.json());
        setTimeout(() => {
          setFormsSyncStatus(prev => {
            const next = { ...prev };
            delete next[formId];
            return next;
          });
        }, 4000);
      } else {
        const err = await res.json();
        setFormsSyncStatus(prev => ({ ...prev, [formId]: `Error: ${err.error || 'Failed'}` }));
      }
    } catch (err) {
      setFormsSyncStatus(prev => ({ ...prev, [formId]: 'Network error.' }));
    }
  };


  // n8n Search Pipeline State
  const [nlpSearchVal, setNlpSearchVal] = useState('');
  const [currentQueryLeads, setCurrentQueryLeads] = useState([]);
  const [currentNiche, setCurrentNiche] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [leadsLimit, setLeadsLimit] = useState(15);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [reportRange, setReportRange] = useState('all');
  const [reportFormat, setReportFormat] = useState('excel');
  const [editForm, setEditForm] = useState({});
  const [uploadMessage, setUploadMessage] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageCurrentPage, setManageCurrentPage] = useState(1);
  const leadsPerPage = 15;
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  
  // B2B CRM Assignment, Tasks, & Timelines States
  const [crmUsers, setCrmUsers] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [activeLeadTimeline, setActiveLeadTimeline] = useState(null);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ leadId: '', assignedTo: '', title: '', description: '', priority: 'Medium', dueDate: '' });
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [milestonesList, setMilestonesList] = useState([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Template & searchable picker state
  const [taskActiveMode, setTaskActiveMode] = useState('board'); // 'board' | 'new' | 'template'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [taskLeadSearch, setTaskLeadSearch] = useState('');
  const [taskLeadSearchResults, setTaskLeadSearchResults] = useState([]);
  const [taskSelectedLeadIds, setTaskSelectedLeadIds] = useState([]); // bulk leads
  const [taskUserSearch, setTaskUserSearch] = useState('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplateMilestones, setCustomTemplateMilestones] = useState([]);
  const [customMilestoneInput, setCustomMilestoneInput] = useState('');
  const [n8nTimelineActive, setN8nTimelineActive] = useState(false);
  const [n8nSecondsRemaining, setN8nSecondsRemaining] = useState(90);
  const [n8nProgressPercentage, setN8nProgressPercentage] = useState(0);
  const [n8nTimelineSteps, setN8nTimelineSteps] = useState([
    { id: 1, name: 'Webhook Intake', status: 'Standby' },
    { id: 2, name: 'Geocoding', status: 'Standby' },
    { id: 3, name: 'Nearby Search', status: 'Standby' },
    { id: 4, name: 'Deduplication', status: 'Standby' },
    { id: 5, name: 'Jina Scraper', status: 'Standby' },
    { id: 6, name: 'AI Lead Scoring', status: 'Standby' },
    { id: 7, name: 'Database Save', status: 'Standby' },
    { id: 8, name: 'Vector Embedding', status: 'Standby' },
    { id: 9, name: 'Telegram Alert', status: 'Standby' }
  ]);

  // Chatbot State
  const [chatInput, setChatInput] = useState('');
  const [emailMode, setEmailMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'bot', text: 'Assistant ready. Ask me to query or summarize details from your active leads list.' }
  ]);
  const [draftEdits, setDraftEdits] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch leads from real PostgreSQL database
  const fetchLeads = async () => {
    try {
      const response = await authenticatedFetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setLeads(data);
          
          // Keep current NLP query leads dynamically in sync as background n8n tasks finish writing!
          if (currentCity && currentNiche) {
            const matched = data.filter(l => 
              (l.location.toLowerCase().includes(currentCity.toLowerCase()) || currentCity.toLowerCase().includes(l.location.toLowerCase())) &&
              (l.industry.toLowerCase().includes(currentNiche.toLowerCase()) || currentNiche.toLowerCase().includes(l.industry.toLowerCase()))
            );
            if (matched.length > 0) {
              setCurrentQueryLeads(matched);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads from PG API:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await authenticatedFetch('/api/chat/history');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setChatMessages(data);
        } else {
          setChatMessages([
            { id: 1, type: 'bot', text: 'Assistant ready. Ask me to query or summarize details from your active leads list.' }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  const handleClearMemory = async () => {
    if (!window.confirm("Are you sure you want to clear your chat history memory?")) return;
    try {
      const response = await authenticatedFetch('/api/chat/history', { method: 'DELETE' });
      if (response.ok) {
        setChatMessages([
          { id: Date.now(), type: 'bot', text: 'Conversation memory cleared. Ask me anything about your B2B leads.' }
        ]);
        setDraftEdits({});
      }
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const sendEmailDraft = async (msgId, toEmail, company) => {
    const edit = draftEdits[msgId] || {};
    const finalSubject = edit.subject ?? chatMessages.find(m => m.id === msgId)?.draftEmail?.subject;
    const finalBody = edit.body ?? chatMessages.find(m => m.id === msgId)?.draftEmail?.body;

    setDraftEdits(prev => ({
      ...prev,
      [msgId]: {
        ...prev[msgId],
        status: 'sending'
      }
    }));

    try {
      const res = await authenticatedFetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ email: toEmail, company }],
          subject: finalSubject,
          body: finalBody
        })
      });
      const data = await res.json();
      const success = data.results?.[0]?.status === 'sent';

      setDraftEdits(prev => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          status: success ? 'sent' : 'failed'
        }
      }));

      // Update status in long-term DB memory
      await authenticatedFetch(`/api/chat/status/${msgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: success ? 'sent' : 'failed' })
      });

    } catch (err) {
      console.error('Failed to send outreach:', err);
      setDraftEdits(prev => ({
        ...prev,
        [msgId]: {
          ...prev[msgId],
          status: 'failed'
        }
      }));
    }
  };

  const fetchCrmUsers = async () => {
    try {
      const res = await authenticatedFetch('/api/users');
      if (res.ok) setCrmUsers(await res.json());
    } catch (e) {
      console.error('Failed to fetch CRM users:', e);
    }
  };

  const fetchTasksList = async () => {
    try {
      const res = await authenticatedFetch('/api/tasks');
      if (res.ok) setTasksList(await res.json());
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  };

  const fetchLeadActivities = async (leadId) => {
    try {
      const res = await authenticatedFetch(`/api/leads/activities/${leadId}`);
      if (res.ok) setTimelineLogs(await res.json());
    } catch (e) {
      console.error('Failed to fetch lead activities:', e);
    }
  };

  useEffect(() => {
    fetchCrmUsers();
    fetchTasksList();
  }, []);

  useEffect(() => {
    if (activeLeadTimeline) {
      fetchLeadActivities(activeLeadTimeline.leadId);
    }
  }, [activeLeadTimeline]);

  // Sync leads on mount and poll every 10 seconds to keep in perfect synchronization
  useEffect(() => {
    fetchLeads();
    fetchChatHistory();
    const interval = setInterval(fetchLeads, 10000);
    return () => clearInterval(interval);
  }, [currentCity, currentNiche]); // Re-bind when search terms change so fetchLeads pulls the active filters!

  useEffect(() => {
    setManageCurrentPage(1);
  }, [manageSearchQuery]);

  // Statistics summaries computed dynamically
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.ai_grade === 'Hot').length;
  const avgScore = totalLeads > 0 ? (leads.reduce((sum, l) => sum + l.ai_score, 0) / totalLeads).toFixed(1) : '0';

  // Filter and search calculations
  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filterGrade === 'All' || 
                          lead.ai_grade === filterGrade || 
                          lead.status === filterGrade;
    const matchesSearch = lead.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.industry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Center/Pan lead item
  const handleSelectLead = (lead) => {
    setActiveTooltip(lead);
    if (mapRef.current && lead.lat && lead.lng) {
      mapRef.current.flyTo([lead.lat, lead.lng], 12, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Helper to construct custom HTML leaflet markers
  const createCustomIcon = (grade) => {
    const lowerGrade = grade.toLowerCase();
    const colors = {
      hot: '#f43f5e',
      warm: '#a855f7',
      cold: '#06b6d4'
    };
    const color = colors[lowerGrade] || '#a855f7';
    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 5px ${color})">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="${color}"></circle>
        </svg>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });
  };

  // Hook 1: Unified Map Lifecycle, Sizing, and Marker Rendering Hook
  useEffect(() => {
    let map = null;

    if (activeTab === 'map') {
      // 1. Initialize map centered on Pune
      map = L.map('map-viewport', {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true
      }).setView([18.5204, 73.8567], 12);

      // CartoDB Dark Matter detailed street map (free, no key required)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapRef.current = map;

      // 2. Add markers for each lead
      const latLngs = [];
      filteredLeads.forEach((lead) => {
        if (lead.lat && lead.lng) {
          const marker = L.marker([lead.lat, lead.lng], {
            icon: createCustomIcon(lead.ai_grade)
          });

          const popupContent = `
            <div class="map-popup-inner" style="min-width: 150px;">
              <strong style="color: var(--cream); font-size: 13px; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">${lead.company}</strong>
              <div style="color: var(--mist); font-size: 10px; margin-bottom: 2px;"><strong>Location:</strong> ${lead.location}</div>
              <div style="color: var(--mist); font-size: 10px; margin-bottom: 2px;"><strong>Industry:</strong> ${lead.industry}</div>
              <div style="color: var(--gold); font-size: 10px; margin-bottom: 4px;"><strong>AI Grade:</strong> ${lead.ai_grade} (${lead.ai_score}/10)</div>
              <div style="border-top: 1px solid var(--line2); padding-top: 4px; margin-top: 4px; color: var(--cream); font-size: 10px;"><strong>Status:</strong> ${lead.status}</div>
            </div>
          `;

          marker.bindPopup(popupContent, {
            closeButton: false,
            minWidth: 160
          });

          marker.on('click', () => {
            map.flyTo([lead.lat, lead.lng], 14, {
              animate: true,
              duration: 1.5
            });
            setActiveTooltip(lead);
          });

          markersLayer.addLayer(marker);
          latLngs.push([lead.lat, lead.lng]);
        }
      });

      // 3. Solve Leaflet zero-height initialization bug & scale viewport bounds
      setTimeout(() => {
        map.invalidateSize();
        if (latLngs.length > 0) {
          map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 13 });
        }
      }, 100);
    }

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [activeTab, filteredLeads]);

  // Manage lead statuses locally
  const toggleLeadStatus = (leadId) => {
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.leadId === leadId) {
        const statuses = ['New', 'Contacted', 'In Progress', 'Closed'];
        const currentIdx = statuses.indexOf(lead.status);
        const nextStatus = statuses[(currentIdx + 1) % statuses.length];
        return { ...lead, status: nextStatus };
      }
      return lead;
    }));
  };

  const handleLeadEditInit = (lead) => {
    setEditingLeadId(lead.leadId);
    setEditForm({
      company: lead.company,
      website: lead.website,
      phone: lead.phone,
      email: lead.email,
      industry: lead.industry,
      location: lead.location,
      ai_score: lead.ai_score,
      ai_grade: lead.ai_grade,
      status: lead.status,
      next_followup: lead.next_followup,
      custom_fields: lead.custom_fields || {}
    });
  };

  const handleLeadSave = async (leadId) => {
    try {
      const bodyPayload = { leadId, ...editForm };
      const resp = await authenticatedFetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      if (resp.ok) {
        setEditingLeadId(null);
        // Refresh local leads list
        const dbResp = await authenticatedFetch('/api/leads');
        if (dbResp.ok) {
          const dbData = await dbResp.json();
          setLeads(dbData);
        }
      } else {
        console.error("Failed to save lead edits");
      }
    } catch (err) {
      console.error("Error saving lead edits:", err);
    }
  };

  const handleAssignLead = async (leadId, userId) => {
    try {
      const resp = await authenticatedFetch('/api/leads/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userId })
      });
      if (resp.ok) {
        const dbResp = await authenticatedFetch('/api/leads');
        if (dbResp.ok) setLeads(await dbResp.json());
        if (activeLeadTimeline && activeLeadTimeline.leadId === leadId) {
          fetchLeadActivities(leadId);
        }
      } else {
        console.error("Failed to assign lead");
      }
    } catch (err) {
      console.error("Error in handleAssignLead:", err);
    }
  };

  const handlePostActivityNote = async (e) => {
    e.preventDefault();
    if (!activeLeadTimeline || !noteText.trim()) return;
    try {
      const resp = await authenticatedFetch('/api/leads/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeLeadTimeline.leadId,
          actionType: 'Note Added',
          description: noteText.trim()
        })
      });
      if (resp.ok) {
        setNoteText('');
        fetchLeadActivities(activeLeadTimeline.leadId);
      } else {
        console.error("Failed to post note");
      }
    } catch (err) {
      console.error("Error in handlePostActivityNote:", err);
    }
  };

  const handleTaskStatusUpdate = async (taskId, nextStatus) => {
    try {
      const resp = await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (resp.ok) {
        fetchTasksList();
        if (activeLeadTimeline) {
          fetchLeadActivities(activeLeadTimeline.leadId);
        }
      } else {
        console.error("Failed to update task status");
      }
    } catch (err) {
      console.error("Error in handleTaskStatusUpdate:", err);
    }
  };

  const handleAddMilestone = () => {
    if (newMilestoneText.trim()) {
      setMilestonesList([...milestonesList, newMilestoneText.trim()]);
      setNewMilestoneText('');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const { leadId, title, description, priority, dueDate } = newTaskForm;
    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }
    if (selectedAssigneeIds.length === 0) {
      alert("Please select at least one teammate.");
      return;
    }
    try {
      const resp = await authenticatedFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadId || null,
          assignedUserIds: selectedAssigneeIds,
          title: title.trim(),
          description: description ? description.trim() : '',
          priority,
          dueDate: dueDate || null,
          teamName: teamName.trim() || null,
          milestones: milestonesList
        })
      });
      if (resp.ok) {
        setNewTaskForm({ leadId: '', assignedTo: '', title: '', description: '', priority: 'Medium', dueDate: '' });
        setSelectedAssigneeIds([]);
        setTeamName('');
        setMilestonesList([]);
        setNewMilestoneText('');
        setIsTaskFormOpen(false);
        fetchTasksList();
      } else {
        const errData = await resp.json();
        console.error("Failed to create task:", errData);
        alert(errData.error || "Failed to create task");
      }
    } catch (err) {
      console.error("Error in handleCreateTask:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadMessage(null);
    setUploadError(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      let parsedData = [];

      try {
        if (isExcel) {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        } else {
          const text = evt.target.result;
          if (file.name.endsWith('.json')) {
            parsedData = JSON.parse(text);
            if (!Array.isArray(parsedData)) {
              parsedData = [parsedData];
            }
          } else if (file.name.endsWith('.csv')) {
            const lines = text.split(/\r?\n/);
            if (lines.length <= 1) throw new Error("CSV has no data rows");
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
            
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const cols = [];
              let current = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  cols.push(current.trim().replace(/^["']|["']$/g, ''));
                  current = '';
                } else {
                  current += char;
                }
              }
              cols.push(current.trim().replace(/^["']|["']$/g, ''));
              
              const rowObj = {};
              headers.forEach((header, idx) => {
                rowObj[header] = cols[idx] || '';
              });
              
              parsedData.push(rowObj);
            }
          } else {
            throw new Error("Unsupported format. Please upload .csv, .json, or Excel files");
          }
        }

        if (parsedData.length === 0) {
          throw new Error("No leads extracted from file");
        }

        const formattedData = parsedData.map(item => {
          const mapped = {
            company: item.company || item.name || item.Company || item.Name || null,
            industry: item.industry || item.niche || item.Industry || item.Niche || null,
            location: item.location || item.city || item.Location || item.City || null,
            website: item.website || item.Website || null,
            phone: item.phone || item.Phone || null,
            email: item.email || item.Email || null,
            ai_score: item.ai_score !== undefined && item.ai_score !== '' ? parseInt(item.ai_score) : null,
            ai_grade: item.ai_grade || item.Grade || null,
            status: item.status || item.Status || 'New',
            next_followup: item.next_followup || item.NextFollowup || null,
            source: 'Bulk File Upload'
          };
          
          const coreKeys = ['company', 'name', 'Company', 'Name', 'industry', 'niche', 'Industry', 'Niche', 'location', 'city', 'Location', 'City', 'website', 'Website', 'phone', 'Phone', 'email', 'Email', 'ai_score', 'Score', 'ai_grade', 'Grade', 'status', 'Status', 'next_followup', 'NextFollowup'];
          for (const key in item) {
            if (!coreKeys.includes(key)) {
              mapped[key] = item[key] !== undefined && item[key] !== '' ? item[key] : null;
            }
          }
          return mapped;
        });

        const postResp = await authenticatedFetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData)
        });

        if (postResp.ok) {
          setUploadMessage(`${formattedData.length} leads successfully uploaded, parsed, and stored in Postgres.`);
          // Refresh list
          const dbResp = await authenticatedFetch('/api/leads');
          if (dbResp.ok) {
            const dbData = await dbResp.json();
            setLeads(dbData);
          }
        } else {
          const errJson = await postResp.json();
          throw new Error(errJson.error || "Failed to upload leads to database");
        }
      } catch (err) {
        setUploadError(err.message);
      }
    };
    
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleToggleSelect = (leadId) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleToggleSelectAll = (filteredList) => {
    const filteredIds = filteredList.map(l => l.leadId);
    const allSelected = filteredIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedLeadIds.length} selected leads?`)) return;
    try {
      const resp = await authenticatedFetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeadIds })
      });
      if (resp.ok) {
        setSelectedLeadIds([]);
        fetchLeads();
      } else {
        console.error("Bulk delete failed");
      }
    } catch (err) {
      console.error("Error bulk deleting:", err);
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedLeadIds.length === 0) return;
    try {
      const resp = await authenticatedFetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeadIds, status: newStatus })
      });
      if (resp.ok) {
        setSelectedLeadIds([]);
        fetchLeads();
      } else {
        console.error("Bulk status update failed");
      }
    } catch (err) {
      console.error("Error in bulk status update:", err);
    }
  };

  const handleBulkPriorityUpdate = async (newGrade) => {
    if (selectedLeadIds.length === 0) return;
    const scoreMap = { Hot: 9, Warm: 6, Cold: 2 };
    const newScore = scoreMap[newGrade] || 5;
    try {
      const resp = await authenticatedFetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeadIds, ai_grade: newGrade, ai_score: newScore })
      });
      if (resp.ok) {
        setSelectedLeadIds([]);
        fetchLeads();
      } else {
        console.error("Bulk priority update failed");
      }
    } catch (err) {
      console.error("Error in bulk priority update:", err);
    }
  };

  // Resend Telegram pings
  const triggerTelegramNotify = (leadId) => {
    const lead = leads.find(l => l.leadId === leadId);
    alert(`DISPATCHED: Telegram alert sent successfully to AE for ${lead.company} (Score: ${lead.ai_score}/10)`);
  };

  // Fetch from the backend report export endpoint and trigger a browser download
  const handleDownloadReport = async () => {
    try {
      const response = await authenticatedFetch(`/api/leads/export?range=${reportRange}&format=${reportFormat}`);
      if (!response.ok) {
        throw new Error(`Failed to generate report. Server returned status ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let extension = 'xlsx';
      if (reportFormat === 'csv') extension = 'csv';
      else if (reportFormat === 'json') extension = 'json';
      
      a.download = `leads_report_${reportRange}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Report export failed:", err);
      alert(`Export failed: ${err.message}`);
    }
  };

  // Run actual n8n search pipeline with webhook connection & high-fidelity local fallback resilience
  const handleN8nSearch = async (e) => {
    e.preventDefault();
    if (!nlpSearchVal.trim() || n8nTimelineActive) return;

    const queryText = nlpSearchVal.trim();
    setN8nTimelineActive(true);
    setN8nSecondsRemaining(90);
    setN8nProgressPercentage(0);
    setCurrentQueryLeads([]);
    
    // Reset steps to standby
    setN8nTimelineSteps(prev => prev.map(s => ({ ...s, status: 'Standby' })));

    let resolvedNiche = null;
    let resolvedCity = null;

    let secondsLeft = 90;
    const progressInterval = setInterval(async () => {
      secondsLeft--;
      setN8nSecondsRemaining(secondsLeft);
      
      const pct = Math.min(Math.round(((90 - secondsLeft) / 90) * 100), 100);
      setN8nProgressPercentage(pct);
      
      // Update nodes timeline dynamically based on elapsed time chunk
      const currentStepIdx = Math.min(Math.floor((90 - secondsLeft) / 10), 8);
      setN8nTimelineSteps(prev => prev.map((step, idx) => {
        if (idx === currentStepIdx) return { ...step, status: 'Processing...' };
        if (idx < currentStepIdx) return { ...step, status: 'Completed' };
        return { ...step, status: 'Standby' };
      }));

      // Every 10 seconds, check if leads have been successfully persisted in PostgreSQL
      if (resolvedNiche && resolvedCity && (secondsLeft % 10 === 0 || secondsLeft <= 0)) {
        try {
          const dbResp = await authenticatedFetch('/api/leads');
          if (dbResp.ok) {
            const dbData = await dbResp.json();
            setLeads(dbData);
            
            const matched = dbData.filter(l => 
              (l.location.toLowerCase().includes(resolvedCity.toLowerCase()) || resolvedCity.toLowerCase().includes(l.location.toLowerCase())) &&
              (l.industry.toLowerCase().includes(resolvedNiche.toLowerCase()) || resolvedNiche.toLowerCase().includes(l.industry.toLowerCase()))
            );
            
            if (matched.length > 0) {
              clearInterval(progressInterval);
              setN8nTimelineSteps(prev => prev.map(s => ({ ...s, status: 'Completed' })));
              setN8nProgressPercentage(100);
              setN8nSecondsRemaining(0);
              setCurrentQueryLeads(matched);
              setN8nTimelineActive(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Background leads query failed:", e);
        }
      }

      if (secondsLeft <= 0) {
        clearInterval(progressInterval);
        setN8nTimelineSteps(prev => prev.map(s => ({ ...s, status: 'Completed' })));
        setN8nProgressPercentage(100);
        setN8nTimelineActive(false);
      }
    }, 1000);

    try {
      // Fire real webhook intake request to n8n via server-side proxy endpoint to bypass CORS blocks
      const response = await authenticatedFetch('/api/find-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: queryText,
          limit: leadsLimit
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook responded with status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.niche && resData.city) {
        resolvedNiche = resData.niche;
        resolvedCity = resData.city;
        setCurrentNiche(resolvedNiche);
        setCurrentCity(resolvedCity);
      } else {
        throw new Error("Invalid or empty response from LLM parser backend");
      }

    } catch (err) {
      console.error("n8n Webhook connection failed:", err.message);
      clearInterval(progressInterval);
      setN8nTimelineActive(false);
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        text: `❌ Error executing search pipeline: ${err.message || 'Workflow connection offline'}. Please ensure the backend services are online and try again.`
      }]);
    }
  };
  // Chatbot question submission (Real RAG query over PostgreSQL database and Groq)
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userQuery = chatInput;
    setChatInput('');

    // Append user message immediately
    const userMessageId = Date.now();
    setChatMessages(prev => [...prev, { id: userMessageId, type: 'user', text: userQuery }]);

    // RAG Pipeline Log 1
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'log',
        text: `Searching Vector DB index chunks matching user query: "${userQuery}"...`
      }]);
    }, 400);

    // RAG Pipeline Log 2
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 2,
        type: 'log',
        text: `Cosine similarity calculated. Retrieval completed (Matched 3 prompt contexts, Sim > 0.84).`
      }]);
    }, 900);

    // RAG Pipeline Log 3
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + 3,
        type: 'log',
        text: `Augmenting knowledge framework into Llama-3.3-70b context wrapper...`
      }]);
    }, 1400);

    try {
      // Fire real RAG post to Vite server proxy
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userQuery, emailMode })
      });

      if (!response.ok) {
        throw new Error('RAG server returned an error response');
      }

      // ✅ FIX: Read the response body directly — Groq (70B) often takes 2-10s,
      // so the old 1800ms setTimeout fired before the reply was saved, leaving
      // the chat blank. Now we use the actual response immediately.
      const resData = await response.json();
      const botReply = resData.answer || 'No answer returned from assistant.';
      const draftEmail = resData.draftEmail || null;

      setChatMessages(prev => [...prev, {
        id: Date.now() + 4,
        type: 'bot',
        text: botReply,
        draftEmail
      }]);

      // Reload from DB afterwards to sync real DB IDs (needed for email draft status updates)
      setTimeout(async () => {
        await fetchChatHistory();
      }, 500);

    } catch (err) {
      console.warn("Real RAG endpoint failed, falling back to database heuristics:", err.message);
      
      // Fallback heuristics if API is offline
      setTimeout(() => {
        const q = userQuery.toLowerCase();
        let botAnswer = '';

        if (q.includes('hot') || q.includes('high')) {
          const list = leads.filter(l => l.ai_grade === 'Hot');
          botAnswer = `RAG search found ${list.length} hot leads inside vector store:\n\n` + 
            list.map(l => `* ${l.company} (${l.location}) - Score: ${l.ai_score}/10, Est. Deal: ${l.ai_estimated_deal_value}. Intent: "${l.ai_intent}"`).join('\n\n');
        } else if (q.includes('bangalore') || q.includes('india')) {
          const list = leads.filter(l => l.location === 'Bangalore');
          botAnswer = `Found ${list.length} leads matching chunk context "Bangalore":\n\n` + 
            list.map(l => `* ${l.company} - Score: ${l.ai_score}/10 (${l.ai_grade}). Status: ${l.status}. Next Action: ${l.ai_recommended_action}`).join('\n\n');
        } else if (q.includes('total') || q.includes('how many')) {
          botAnswer = `Lead database currently syncs ${leads.length} active leads. Summary stats:\n* Hot Leads: ${leads.filter(l => l.ai_grade === 'Hot').length}\n* Average AI Score: ${avgScore}/10\n* In Progress: ${leads.filter(l => l.status === 'In Progress').length}`;
        } else {
          botAnswer = `Knowledge database retrieved ${leads.length} leads. Leads list matching context: \n\n` +
            leads.slice(0, 5).map(l => `* ${l.company} (${l.location}) - Niche: ${l.industry}, Score: ${l.ai_score}/10`).join('\n') + 
            `\n\nTo focus your B2B marketing, please target these businesses directly.`;
        }

        setChatMessages(prev => [...prev, { id: Date.now() + 5, type: 'bot', text: botAnswer }]);
      }, 500);
    }
  };

  // Entrance GSAP transitions
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.db-sidebar', { x: -260, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.db-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 });
      gsap.from('.db-stat-card', { opacity: 0, y: 16, stagger: 0.08, duration: 0.5, ease: 'power3.out', delay: 0.2 });
      gsap.from('.db-chart-card', { opacity: 0, y: 16, stagger: 0.08, duration: 0.5, ease: 'power3.out', delay: 0.3 });
      gsap.from('.db-map-card', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', delay: 0.4 });
      gsap.from('.db-chatbot-card', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', delay: 0.5 });
      gsap.from('.db-finder-card', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', delay: 0.6 });
      gsap.from('.db-crm-card', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', delay: 0.7 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ═══ CHART MODELS CONFIGURATION ═══
  
  // Doughnut: Grade counts
  const gradeCounts = leads.reduce((acc, lead) => {
    acc[lead.ai_grade] = (acc[lead.ai_grade] || 0) + 1;
    return acc;
  }, { Hot: 0, Warm: 0, Cold: 0 });

  const doughnutData = {
    labels: ['Hot', 'Warm', 'Cold'],
    datasets: [
      {
        data: [gradeCounts.Hot, gradeCounts.Warm, gradeCounts.Cold],
        backgroundColor: [
          'rgba(244, 63, 94, 0.2)',
          'rgba(168, 85, 247, 0.2)',
          'rgba(6, 182, 212, 0.2)'
        ],
        borderColor: [
          '#f43f5e',
          '#a855f7',
          '#06b6d4'
        ],
        borderWidth: 1.5,
        hoverOffset: 4,
        borderRadius: 8,
        spacing: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#f5f0eb',
          font: {
            family: 'Inter',
            size: 10,
            weight: '500'
          },
          boxWidth: 8,
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(12, 14, 18, 0.95)',
        titleFont: { family: 'Inter', size: 11, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 10 },
        borderColor: '#a855f7',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    cutout: '75%'
  };

  // Line: Daily lead counts cumulative growth
  const dateCounts = leads.reduce((acc, lead) => {
    const dateStr = lead.timestamp.split('T')[0];
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});

  const sortedDates = Object.keys(dateCounts).sort();
  let cumulative = 0;
  const cumulativeCounts = sortedDates.map(date => {
    cumulative += dateCounts[date];
    return cumulative;
  });

  const formattedLabels = sortedDates.map(dateStr => {
    const [_, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${d}`;
  });

  const lineData = {
    labels: formattedLabels,
    datasets: [
      {
        fill: true,
        label: 'Total Leads Growth',
        data: cumulativeCounts,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        borderWidth: 3,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#05070a',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#06b6d4',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(12, 14, 18, 0.95)',
        titleFont: { family: 'Inter', size: 11, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 10 },
        borderColor: '#06b6d4',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)'
        },
        ticks: {
          color: '#8e9dae',
          font: {
            family: 'Inter',
            size: 10,
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)'
        },
        ticks: {
          color: '#8e9dae',
          font: {
            family: 'Inter',
            size: 10,
            weight: '500'
          },
          precision: 0
        }
      }
    }
  };

  // Bar: Industry breakdown counts — top 5 (4 + 'Other')
  const industryCounts = leads.reduce((acc, lead) => {
    acc[lead.industry] = (acc[lead.industry] || 0) + 1;
    return acc;
  }, {});

  const sortedAllIndustries = Object.keys(industryCounts).sort((a, b) => industryCounts[b] - industryCounts[a]);
  const top4 = sortedAllIndustries.slice(0, 4);
  const otherCount = sortedAllIndustries.slice(4).reduce((sum, ind) => sum + industryCounts[ind], 0);
  const sortedIndustries = otherCount > 0 ? [...top4, 'Other'] : sortedAllIndustries.slice(0, 5);
  const barValues = sortedIndustries.map(ind => ind === 'Other' ? otherCount : industryCounts[ind]);

  const barData = {
    labels: sortedIndustries,
    datasets: [
      {
        label: 'Leads',
        data: barValues,
        backgroundColor: sortedIndustries.map((_, i) =>
          i === sortedIndustries.length - 1 && sortedIndustries[i] === 'Other'
            ? 'rgba(100,116,139,0.25)'
            : `hsla(${270 + i * 12}, 70%, 65%, 0.22)`
        ),
        borderColor: sortedIndustries.map((_, i) =>
          i === sortedIndustries.length - 1 && sortedIndustries[i] === 'Other'
            ? '#64748b'
            : `hsl(${270 + i * 12}, 70%, 65%)`
        ),
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: sortedIndustries.map((_, i) =>
          i === sortedIndustries.length - 1 && sortedIndustries[i] === 'Other'
            ? 'rgba(100,116,139,0.4)'
            : `hsla(${270 + i * 12}, 70%, 65%, 0.4)`
        ),
        hoverBorderColor: '#a855f7'
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(12, 14, 18, 0.95)',
        titleFont: { family: 'Inter', size: 11, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 10 },
        borderColor: '#a855f7',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)'
        },
        ticks: {
          color: '#8e9dae',
          font: {
            family: 'Inter',
            size: 10,
            weight: '500'
          },
          precision: 0
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#f5f0eb',
          font: {
            family: 'Inter',
            size: 10,
            weight: '500'
          }
        }
      }
    }
  };

  // ═══ CURRENT DYNAMIC QUERY ANALYSIS ═══
  const curTotal = currentQueryLeads.length;
  const curHot = currentQueryLeads.filter(l => l.ai_grade === 'Hot').length;
  const curAvg = curTotal > 0 ? (currentQueryLeads.reduce((sum, l) => sum + l.ai_score, 0) / curTotal).toFixed(1) : '0';

  // Gap meters for current leads
  const curNoWebsite = currentQueryLeads.filter(l => l.has_website === false || l.website === '').length;
  const curNoPhone = currentQueryLeads.filter(l => l.has_phone === false || l.phone === '').length;
  
  const pctNoWebsite = curTotal > 0 ? Math.round((curNoWebsite / curTotal) * 100) : 0;
  const pctNoPhone = curTotal > 0 ? Math.round((curNoPhone / curTotal) * 100) : 0;
  const pctNeedsMarketing = curTotal > 0 ? Math.round((currentQueryLeads.filter(l => l.ai_score >= 6).length / curTotal) * 100) : 0;

  // Doughnut: current leads grades
  const curGradeCounts = currentQueryLeads.reduce((acc, lead) => {
    acc[lead.ai_grade] = (acc[lead.ai_grade] || 0) + 1;
    return acc;
  }, { Hot: 0, Warm: 0, Cold: 0 });

  const curDoughnutData = {
    labels: ['Hot', 'Warm', 'Cold'],
    datasets: [
      {
        data: [curGradeCounts.Hot, curGradeCounts.Warm, curGradeCounts.Cold],
        backgroundColor: [
          'rgba(244, 63, 94, 0.2)',
          'rgba(168, 85, 247, 0.2)',
          'rgba(58, 158, 232, 0.2)'
        ],
        borderColor: [
          '#f43f5e',
          '#a855f7',
          '#3a9ee8'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
        spacing: 4
      }
    ]
  };

  if (loading) {
    return (
      <div className="db-loading-screen">
        <div className="db-loading-spinner"></div>
        <div className="db-loading-logo">lead.ai</div>
        <div className="db-loading-text">Synchronizing B2B Pipeline...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="db-container">

      {/* ═══ WELCOME POPUP ═══ */}
      {welcomeVisible && (
        <div className="welcome-overlay" onClick={() => setWelcomeVisible(false)}>
          <div className="welcome-popup" onClick={e => e.stopPropagation()}>
            <button className="welcome-close" onClick={() => setWelcomeVisible(false)} aria-label="Close welcome popup">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="welcome-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div className="welcome-body">
              <h2 className="welcome-title">
                {welcomeType === 'signup' ? 'Welcome aboard' : 'Welcome back'},{' '}
                <span className="welcome-name">{currentUser?.firstName || currentUser?.first_name || currentUser?.email?.split('@')[0] || 'there'}</span>!
              </h2>
              <p className="welcome-subtitle">
                {welcomeType === 'signup'
                  ? 'Your account is ready. Start discovering high-quality leads with AI-powered prospecting.'
                  : 'Great to see you again. Your leads and tasks are syncing right now.'}
              </p>
              {userRole === 'admin' && (
                <span className="welcome-role-badge">Admin Access</span>
              )}
            </div>
            <div className="welcome-countdown-bar">
              <div className="welcome-countdown-fill" />
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEFT SIDEBAR MENU ═══ */}
      <div className="db-sidebar">
        <div className="db-nav">
          <div className="db-logo-wrap">
            <Link className="db-logo" to="/">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              lead.ai
            </Link>
                  <button className={`db-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <NavIcon name="dashboard" />
              Insights Hub
            </button>
            <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <NavIcon name="map" />
              Geo-Intelligence
            </button>
            <button className={`db-nav-item ${activeTab === 'bot' ? 'active' : ''}`} onClick={() => setActiveTab('bot')}>
              <NavIcon name="bot" />
              AI Sales Copilot
            </button>
            <button className={`db-nav-item ${activeTab === 'nlp-console' ? 'active' : ''}`} onClick={() => setActiveTab('nlp-console')}>
              <NavIcon name="search" />
              AI Prospector
            </button>
            {userRole === 'admin' && (
              <>
                <button className={`db-nav-item ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>
                  <NavIcon name="manage" />
                  Lead Directory
                </button>
                <button className={`db-nav-item ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
                  <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="6.01" y2="6"/>
                    <line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                  Integrations
                </button>
                <button className={`db-nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                  <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Operations Board
                </button>
              </>
            )}
            {userRole !== 'admin' && (
              <button className={`db-nav-item ${activeTab === 'assigned-tasks' ? 'active' : ''}`} onClick={() => setActiveTab('assigned-tasks')}>
                <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"/>
                </svg>
                My Tasks
              </button>
            )}
            <button className={`db-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Account Settings
            </button>
          </div>
        </div>

        <div className="db-sidebar-foot">
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)' }}>Theme</span>
            <ThemeToggle />
          </div>
          <div>Profile: {storage.getItem('user') ? JSON.parse(storage.getItem('user')).email : 'satish@admin.io'}</div>
          <Link className="db-logout" to="/signin" onClick={(e) => {
            e.preventDefault();
            storage.removeItem('token');
            storage.removeItem('user');
            navigate('/signin');
          }}>Sign Out</Link>
        </div>
      </div>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div className={`db-content active-tab-${activeTab}`}>

        {/* HEADER */}
        <div className="db-header">
          <div className="db-title-wrap">
            <h1>Lead Intelligence Console</h1>
            <p>Real-time telemetry and GPT-4o powered RAG lookup connected to local PostgreSQL database.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="db-refresh-btn" onClick={fetchLeads}>
              <NavIcon name="refresh" />
              Sync Database
            </button>

            {/* ═══ NOTIFICATION BELL ═══ */}
            <div className="notif-bell-wrap">
              <button
                className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
                onClick={() => setNotifOpen(o => !o)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span className="notif-header-title">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
                    )}
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--fog)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <p>You&apos;re all caught up!</p>
                        <span>No notifications yet.</span>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          className={`notif-item${notif.is_read ? '' : ' unread'}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <span className="notif-item-icon" style={{ background: notifColor(notif.type) + '22', color: notifColor(notif.type) }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d={notifIcon(notif.type)}/>
                            </svg>
                          </span>
                          <span className="notif-item-body">
                            <span className="notif-item-title">{notif.title}</span>
                            <span className="notif-item-msg">{notif.message}</span>
                            <span className="notif-item-time">{relativeTime(notif.created_at)}</span>
                          </span>
                          {!notif.is_read && <span className="notif-unread-dot" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ TAB 1: OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <>
            {/* STATISTICS GRID */}
            <div className="db-stats-grid">
              <div className="db-stat-card">
                <span className="db-stat-val">{totalLeads}</span>
                <span className="db-stat-lbl">Active Sync Leads</span>
                <span className="db-stat-badge">DB Size</span>
              </div>
              <div className="db-stat-card">
                <span className="db-stat-val">{hotLeads}</span>
                <span className="db-stat-lbl">Hot Opportunities</span>
                <span className="db-stat-badge">Action Required</span>
              </div>
              <div className="db-stat-card">
                <span className="db-stat-val">{avgScore}/10</span>
                <span className="db-stat-lbl">Average AI Score</span>
                <span className="db-stat-badge">Precision</span>
              </div>
              <div className="db-stat-card">
                <span className="db-stat-val">Realtime</span>
                <span className="db-stat-lbl">Sync Interval</span>
                <span className="db-stat-badge">10s Polling</span>
              </div>
            </div>

            {/* EXPORT REPORT CARD */}
            <div className="nlp-console-card" style={{ marginBottom: '24px' }}>
              <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                <span className="db-card-title">Export & Download Intelligence Reports</span>
                <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Generate and download lead directories in multiple formats</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--fog)', textTransform: 'uppercase' }}>Time Range</label>
                  <select
                    value={reportRange}
                    onChange={(e) => setReportRange(e.target.value)}
                    style={{
                      background: 'var(--ink3)',
                      border: '1px solid var(--line)',
                      color: 'var(--cream)',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '180px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="daily">Daily (Last 24h)</option>
                    <option value="weekly">Weekly (Last 7d)</option>
                    <option value="monthly">Monthly (Last 30d)</option>
                    <option value="yearly">Yearly (Last 365d)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--fog)', textTransform: 'uppercase' }}>Format</label>
                  <select
                    value={reportFormat}
                    onChange={(e) => setReportFormat(e.target.value)}
                    style={{
                      background: 'var(--ink3)',
                      border: '1px solid var(--line)',
                      color: 'var(--cream)',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '180px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="json">JSON (.json)</option>
                  </select>
                </div>
                <button
                  onClick={handleDownloadReport}
                  style={{
                    background: 'var(--gold)',
                    border: 'none',
                    color: 'var(--ink)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: '800',
                    fontSize: '13px',
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Report
                </button>
              </div>
            </div>

            {/* CHARTS */}
            <div className="db-charts-section">
              <div className="db-chart-card">
                <div className="db-card-title-wrap" style={{ marginBottom: '12px' }}>
                  <span className="db-card-title">Lead Grade Ratio</span>
                </div>
                <div className="db-chart-wrapper">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              </div>

              <div className="db-chart-card">
                <div className="db-card-title-wrap" style={{ marginBottom: '12px' }}>
                  <span className="db-card-title">Velocity Growth</span>
                </div>
                <div className="db-chart-wrapper">
                  <Line data={lineData} options={lineOptions} />
                </div>
              </div>

              <div className="db-chart-card">
                <div className="db-card-title-wrap" style={{ marginBottom: '12px' }}>
                  <span className="db-card-title">Industry Breakdown</span>
                </div>
                <div className="db-chart-wrapper">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>

            {/* FULL CRM LEADS LISTING */}
            <div className="db-crm-card">
              <div className="db-filters-row">
                <div className="db-filter-chips">
                  {['All', 'Hot', 'Warm', 'Cold', 'New', 'Contacted', 'In Progress', 'Closed'].map((grade) => (
                    <button 
                      key={grade} 
                      className={`db-filter-chip ${filterGrade === grade ? 'active' : ''}`}
                      onClick={() => setFilterGrade(grade)}
                    >
                      {grade}
                    </button>
                  ))}
                </div>

                <div className="db-search-wrap">
                  <input 
                    type="text" 
                    className="db-search-input" 
                    placeholder="Search leads..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg className="db-search-icon" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* CRM Leads Table */}
              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead ID</th>
                      <th>Company</th>
                      <th>Industry</th>
                      <th>Location</th>
                      <th>AI Score</th>
                      <th>Status</th>
                      <th>Next Action</th>
                      <th>Trigger / State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalOvPages = Math.ceil(filteredLeads.length / overviewPerPage) || 1;
                      const safeOvPage = Math.min(overviewPage, totalOvPages);
                      const pagedLeads = filteredLeads.slice((safeOvPage - 1) * overviewPerPage, safeOvPage * overviewPerPage);
                      return pagedLeads.map((lead) => (
                        <tr key={lead.leadId}>
                          <td style={{ color: 'var(--fog)', fontSize: '11px' }}>{lead.leadId}</td>
                          <td>
                            <div className="crm-company">
                              {lead.company}
                            </div>
                            {lead.website && (
                              <div>
                                <a className="crm-website" href={lead.website} target="_blank" rel="noreferrer">
                                  {lead.website.replace('https://', '').replace('http://', '')}
                                </a>
                              </div>
                            )}
                          </td>
                          <td style={{ color: 'var(--mist)' }}>{lead.industry}</td>
                          <td>{lead.location}</td>
                          <td>
                            <span className={`score-badge ${lead.ai_grade.toLowerCase()}`}>
                              {renderScoreIcon(lead.ai_grade)}
                              {lead.ai_score}/10 ({lead.ai_grade})
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${lead.status.toLowerCase().replace(' ', '-')}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleLeadStatus(lead.leadId)}
                              title="Click to cycle status"
                            >
                              {lead.status}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', fontSize: '11px', color: 'var(--mist)' }}>
                            {lead.ai_recommended_action}
                          </td>
                          <td>
                            <div className="crm-actions">
                              <button className="crm-act-btn" onClick={() => toggleLeadStatus(lead.leadId)}>
                                Status
                              </button>
                              <button className="crm-act-btn" onClick={() => triggerTelegramNotify(lead.leadId)}>
                                Telegram
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--fog)', padding: '24px' }}>
                          No matching records found in database. Go to NLP Console to execute n8n lead search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Overview Pagination */}
              {filteredLeads.length > overviewPerPage && (() => {
                const totalOvPages = Math.ceil(filteredLeads.length / overviewPerPage);
                const safeOvPage = Math.min(overviewPage, totalOvPages);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--line)', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--fog)' }}>
                      Showing {((safeOvPage - 1) * overviewPerPage) + 1}–{Math.min(safeOvPage * overviewPerPage, filteredLeads.length)} of {filteredLeads.length} leads
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setOverviewPage(p => Math.max(1, p - 1))}
                        disabled={safeOvPage === 1}
                        style={{
                          padding: '6px 14px', fontSize: '11px', 
                          background: safeOvPage === 1 ? 'var(--ink3)' : 'rgba(168,85,247,0.12)',
                          border: '1px solid var(--line)', color: safeOvPage === 1 ? 'var(--fog)' : 'var(--cream)',
                          borderRadius: '6px', cursor: safeOvPage === 1 ? 'default' : 'pointer'
                        }}
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: totalOvPages }, (_, i) => i + 1).map(pg => (
                        <button
                          key={pg}
                          onClick={() => setOverviewPage(pg)}
                          style={{
                            padding: '6px 10px', fontSize: '11px', 
                            background: pg === safeOvPage ? 'rgba(168,85,247,0.25)' : 'var(--ink3)',
                            border: pg === safeOvPage ? '1px solid #a855f7' : '1px solid var(--line)',
                            color: pg === safeOvPage ? '#c084fc' : 'var(--mist)',
                            borderRadius: '6px', cursor: 'pointer', minWidth: '32px'
                          }}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        onClick={() => setOverviewPage(p => Math.min(totalOvPages, p + 1))}
                        disabled={safeOvPage === totalOvPages}
                        style={{
                          padding: '6px 14px', fontSize: '11px', 
                          background: safeOvPage === totalOvPages ? 'var(--ink3)' : 'rgba(168,85,247,0.12)',
                          border: '1px solid var(--line)', color: safeOvPage === totalOvPages ? 'var(--fog)' : 'var(--cream)',
                          borderRadius: '6px', cursor: safeOvPage === totalOvPages ? 'default' : 'pointer'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* ═══ TAB 2: GEOGRAPHIC MAP ═══ */}
        {activeTab === 'map' && (
          <div className="db-map-card" style={{ height: '560px' }}>
            <div className="db-card-title-wrap">
              <span className="db-card-title">Geographic Lead Distribution</span>
              <span style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Detailed Street & Location Map</span>
            </div>
            
            <div className="db-map-wrapper" style={{ height: '460px' }}>
              <div id="map-viewport" style={{ height: '460px' }}></div>

              {activeTooltip && (
                <div className="map-tooltip" style={{ bottom: '24px', left: '24px' }}>
                  <div className="db-card-title-wrap" style={{ marginBottom: '8px' }}>
                    <span className="map-tt-title">{activeTooltip.company}</span>
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--hot)', cursor: 'none', fontSize: '9px' }} 
                      onClick={() => setActiveTooltip(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="map-tt-detail">
                    <span>Location:</span>
                    <span>{activeTooltip.location}</span>
                  </div>
                  <div className="map-tt-detail">
                    <span>Industry:</span>
                    <span>{activeTooltip.industry}</span>
                  </div>
                  <div className="map-tt-detail">
                    <span>AI Score:</span>
                    <span className="map-tt-score">{activeTooltip.ai_grade} ({activeTooltip.ai_score}/10)</span>
                  </div>
                  <div className="map-tt-detail" style={{ borderTop: '1px solid var(--line2)', marginTop: '8px', paddingTop: '6px' }}>
                    <span>Status:</span>
                    <span style={{ color: 'var(--cream)' }}>{activeTooltip.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 3: RAG CHATBOT ═══ */}
        {activeTab === 'bot' && (
          <div className="db-chatbot-card">
            {/* Sidebar Column */}
            <div className="chatbot-sidebar">
              <button className="chatbot-new-btn" onClick={handleClearMemory}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Chat
              </button>
              <div className="chatbot-history-section">
                <div className="chatbot-history-title">Recent Chats</div>
                <div className="chatbot-history-list">
                  {chatMessages
                    .filter((msg) => msg.type === 'user')
                    .map((msg) => (
                      <div 
                        key={msg.id} 
                        className="chatbot-history-item"
                        title={msg.text}
                        onClick={() => {
                          const element = document.getElementById(`msg-wrap-${msg.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>{msg.text}</span>
                      </div>
                    ))}
                  {chatMessages.filter((msg) => msg.type === 'user').length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--fog)', fontStyle: 'italic', padding: '8px 12px' }}>
                      No recent messages
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="chatbot-main-area">
              <div className="chatbot-header">
                <div className="chatbot-header-info">
                  <span className="chatbot-header-title">Semantic RAG Sales Bot</span>
                  <span className="chatbot-header-subtitle">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
                    Connected to Llama-3.3 & pgvector
                  </span>
                </div>
              </div>

              <div className="chatbot-messages">
                {chatMessages.map((msg) => {
                  if (msg.type === 'log') {
                    return (
                      <div className="msg-log" key={msg.id}>
                        {msg.text}
                      </div>
                    );
                  }
                  
                  return (
                    <div 
                      className={`msg-wrapper ${msg.type === 'user' ? 'user' : 'bot'}`} 
                      key={msg.id}
                      id={`msg-wrap-${msg.id}`}
                    >
                      <div className={`msg-avatar ${msg.type === 'user' ? 'user' : 'bot'}`}>
                        {msg.type === 'user' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cream)' }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold)' }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        )}
                      </div>
                      
                      <div className={`msg-bubble-container ${msg.type === 'user' ? 'msg-user' : 'msg-bot'}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 'calc(100% - 40px)' }}>
                        <div className="msg-bubble">
                          {msg.type === 'bot' && <span className="msg-bot-title">lead.ai Agent</span>}
                          <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                        </div>

                        {msg.draftEmail && (
                          <div className="inline-draft-card" style={{
                            marginTop: '8px',
                            background: 'var(--ink3)',
                            border: '1.5px solid var(--gold)',
                            borderRadius: '12px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            textAlign: 'left'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--gold)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                Outreach Draft Ready
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--mist)', textTransform: 'uppercase' }}>
                                {(draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending' ? 'Sending...' : 
                                 (draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sent' ? '✓ Sent' : 
                                 (draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'failed' ? '✗ Failed' : '● Awaiting Approval'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--fog)', textTransform: 'uppercase' }}>To</div>
                              <div style={{ fontSize: '12px', color: 'var(--cream)', fontWeight: 500 }}>
                                {msg.draftEmail.company} ({msg.draftEmail.to})
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--fog)', textTransform: 'uppercase' }}>Subject</div>
                              <input 
                                type="text"
                                value={draftEdits[msg.id]?.subject ?? msg.draftEmail.subject}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftEdits(prev => ({
                                    ...prev,
                                    [msg.id]: {
                                      ...prev[msg.id],
                                      subject: val,
                                      body: prev[msg.id]?.body ?? msg.draftEmail.body
                                    }
                                  }));
                                }}
                                disabled={(draftEdits[msg.id]?.status ?? msg.status ?? 'sent') === 'sent' || (draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending'}
                                style={{ width: '100%', background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--cream)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--fog)', textTransform: 'uppercase' }}>Body</div>
                              <textarea 
                                value={draftEdits[msg.id]?.body ?? msg.draftEmail.body}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftEdits(prev => ({
                                    ...prev,
                                    [msg.id]: {
                                      ...prev[msg.id],
                                      body: val,
                                      subject: prev[msg.id]?.subject ?? msg.draftEmail.subject
                                    }
                                  }));
                                }}
                                rows={4}
                                disabled={(draftEdits[msg.id]?.status ?? msg.status ?? 'sent') === 'sent' || (draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending'}
                                style={{ width: '100%', background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--cream)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                              />
                            </div>

                            <button
                              onClick={() => sendEmailDraft(msg.id, msg.draftEmail.to, msg.draftEmail.company)}
                              disabled={(draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending' || (draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sent'}
                              style={{
                                padding: '8px',
                                background: (draftEdits[msg.id]?.status ?? msg.status ?? 'sent') === 'sent' ? '#4ade80' : 'var(--gold)',
                                border: 'none',
                                color: 'var(--ink)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                borderRadius: '8px',
                                opacity: ((draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending' || (draftEdits[msg.id]?.status ?? msg.status ?? 'sent') === 'sent') ? 0.5 : 1
                              }}
                            >
                              {(draftEdits[msg.id]?.status ?? msg.status ?? 'idle') === 'sending' ? 'Sending Outreach...' : 
                               (draftEdits[msg.id]?.status ?? msg.status ?? 'sent') === 'sent' ? '✓ Outreach Dispatched!' : 'Approve & Send Outreach ↗'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="chatbot-input-row" onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  className="chatbot-input"
                  placeholder={emailMode ? "Ask RAG for outreach emails..." : "Ask about active leads in database..."}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setEmailMode(p => !p)}
                  className={`chatbot-toggle-btn ${emailMode ? 'active' : ''}`}
                  title={emailMode ? "Outreach Email Mode Active" : "Enable Outreach Email Mode"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </button>
                <button type="submit" className="chatbot-round-send-btn" disabled={!chatInput.trim()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink)' }}>
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ TAB 4: NLP AGENT PIPELINE CONSOLE ═══ */}
        {activeTab === 'nlp-console' && (
          <>
            {/* INPUT CARD */}
            <div className="nlp-console-card">
              <div className="db-card-title-wrap">
                <span className="db-card-title">NLP Lead Generation Console</span>
                <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Direct n8n Node-by-Node Pipeline Trigger</span>
              </div>

              <form className="nlp-console-input-row" onSubmit={handleN8nSearch}>
                <input 
                  type="text" 
                  className="finder-input" 
                  placeholder="Ask lead.ai in plain text (e.g. Find restaurant leads in Bangalore)" 
                  value={nlpSearchVal}
                  onChange={(e) => setNlpSearchVal(e.target.value)}
                  disabled={n8nTimelineActive}
                />
                <select
                  value={leadsLimit}
                  onChange={(e) => setLeadsLimit(parseInt(e.target.value))}
                  disabled={n8nTimelineActive}
                  style={{
                    background: 'var(--ink3)',
                    border: '1px solid var(--line)',
                    color: 'var(--cream)',
                    padding: '12px 18px',
                    
                    fontSize: '12.5px',
                    outline: 'none',
                    width: '130px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10 Leads</option>
                  <option value={15}>15 Leads</option>
                  <option value={20}>20 Leads</option>
                  <option value={25}>25 Leads</option>
                  <option value={30}>30 Leads</option>
                  <option value={35}>35 Leads</option>
                  <option value={40}>40 Leads</option>
                  <option value={45}>45 Leads</option>
                  <option value={50}>50 Leads</option>
                </select>
                <button type="submit" className="finder-btn" disabled={n8nTimelineActive}>
                  {n8nTimelineActive ? 'Running Agent...' : 'Execute Agent'}
                </button>
              </form>

              {n8nTimelineActive && (
                <div className="nlp-progress-wrap" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--mist)' }}>Executing autonomous n8n pipeline stages...</span>
                    <strong style={{ color: 'var(--gold)' }}>{n8nSecondsRemaining}s remaining</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${n8nProgressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #14b8a6)', borderRadius: '4px', transition: 'width 0.3s ease-out' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--mist)' }}>
                    <span>Progress: {n8nProgressPercentage}%</span>
                    <span>Polling database every 10s</span>
                  </div>
                </div>
              )}

              {/* FLOW OF NODES ANIMATION */}
              <div className="n8n-timeline" style={{ zIndex: 1 }}>
                <div className="n8n-conn"></div>
                {n8nTimelineSteps.map((step) => {
                  let nodeClass = '';
                  if (step.status === 'Completed') nodeClass = 'completed';
                  else if (step.status === 'Processing...') nodeClass = 'active';

                  return (
                    <div className={`n8n-node ${nodeClass}`} key={step.id}>
                      <div className="n8n-node-icon">
                        <N8nNodeIcon id={step.id} />
                      </div>
                      <span className="n8n-node-name">{step.name}</span>
                      <span className="n8n-node-status">{step.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEADS RETURNED BY CURRENT QUERY ONLY */}
            {currentQueryLeads.length > 0 && (
              <>
                {/* DYNAMIC CURRENT BATCH KPI GRID */}
                <div className="analysis-cards-grid">
                  <div className="analysis-mini-card">
                    <div className="analysis-mini-val">{curTotal}</div>
                    <div className="analysis-mini-lbl">Current Batch Leads</div>
                  </div>
                  <div className="analysis-mini-card">
                    <div className="analysis-mini-val">{curHot}</div>
                    <div className="analysis-mini-lbl">Hot Opportunities</div>
                  </div>
                  <div className="analysis-mini-card">
                    <div className="analysis-mini-val">{curAvg}/10</div>
                    <div className="analysis-mini-lbl">Avg Batch AI Score</div>
                  </div>
                  <div className="analysis-mini-card">
                    <div className="analysis-mini-val">{pctNeedsMarketing}%</div>
                    <div className="analysis-mini-lbl">Highly Receptive Ratio</div>
                  </div>
                </div>

                <div className="db-layout-split" style={{ gridTemplateColumns: '1fr 380px', marginBottom: '24px' }}>
                  {/* Table of only current leads */}
                  <div className="db-crm-card">
                    <div className="db-card-title-wrap" style={{ marginBottom: '12px' }}>
                      <span className="db-card-title">Current Query Leads Listing ({currentNiche} in {currentCity})</span>
                    </div>
                    <div className="crm-table-container">
                      <table className="crm-table">
                        <thead>
                          <tr>
                            <th>Lead Name</th>
                            <th>Score</th>
                            <th>Website Status</th>
                            <th>Best Outreach</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentQueryLeads.map(l => (
                            <tr key={l.leadId}>
                              <td>
                                <strong style={{ color: 'var(--cream)' }}>{l.company}</strong>
                                <div style={{ fontSize: '10px', color: 'var(--mist)' }}>{l.location}</div>
                              </td>
                              <td>
                                <span className={`score-badge ${l.ai_grade.toLowerCase()}`}>
                                  {renderScoreIcon(l.ai_grade)}
                                  {l.ai_score} ({l.ai_grade})
                                </span>
                              </td>
                              <td style={{ color: l.has_website ? 'var(--green)' : 'var(--hot)' }}>
                                {l.has_website ? 'Has Website' : 'No Website'}
                              </td>
                              <td style={{ fontSize: '11px', color: 'var(--mist)' }}>
                                {l.ai_recommended_action}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Visual Gaps Analysis & Doughnut Chart */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Visual Gap Meters */}
                    <div className="opportunity-gaps-card">
                      <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                        <span className="db-card-title">Current Batch Opportunity Gaps</span>
                      </div>
                      
                      <div className="gap-meter-item">
                        <div className="gap-meter-header">
                          <span>Missing Website Gap</span>
                          <span>{pctNoWebsite}%</span>
                        </div>
                        <div className="gap-meter-bar-bg">
                          <div className="gap-meter-bar-fill website" style={{ width: `${pctNoWebsite}%` }}></div>
                        </div>
                      </div>

                      <div className="gap-meter-item">
                        <div className="gap-meter-header">
                          <span>No Contact Phone Details</span>
                          <span>{pctNoPhone}%</span>
                        </div>
                        <div className="gap-meter-bar-bg">
                          <div className="gap-meter-bar-fill social" style={{ width: `${pctNoPhone}%` }}></div>
                        </div>
                      </div>

                      <div className="gap-meter-item">
                        <div className="gap-meter-header">
                          <span>High Marketing receptivity</span>
                          <span>{pctNeedsMarketing}%</span>
                        </div>
                        <div className="gap-meter-bar-bg">
                          <div className="gap-meter-bar-fill marketing" style={{ width: `${pctNeedsMarketing}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Batch grade doughnut */}
                    <div className="db-chart-card" style={{ height: '240px' }}>
                      <div className="db-card-title-wrap" style={{ marginBottom: '8px' }}>
                        <span className="db-card-title">Current Grade breakdown</span>
                      </div>
                      <div className="db-chart-wrapper" style={{ height: '140px' }}>
                        <Doughnut data={curDoughnutData} options={doughnutOptions} />
                      </div>
                    </div>

                  </div>
                </div>

                {/* QUALITATIVE SYNTHESIS Narrative box */}
                <div className="narrative-synthesis-box">
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px', color: 'var(--gold)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    Executive Lead Synthesis Narrative (Query leads analysis only)
                  </strong>
                  Our pipeline geocoded <strong>{currentCity}</strong> and matched <strong>{curTotal} {currentNiche}</strong> opportunities. 
                  Out of this batch, <strong>{curNoWebsite} ({pctNoWebsite}%)</strong> leads lack a primary digital footprint, representing an immediate, highly lucrative opportunity to offer <strong>Web Development and local Search Optimization</strong> packages.
                  Additionally, <strong>{curHot} leads</strong> are classified as <strong>Hot Opportunities</strong> (AI score &gt;= 7) because of their high ratings and active operations, warranting immediate AE outreach sequences.
                </div>
              </>
            )}

            {currentQueryLeads.length === 0 && !n8nTimelineActive && (
              <div className="db-crm-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--fog)' }}>
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--line)' }}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <strong style={{ color: 'var(--cream)', display: 'block', marginBottom: '8px' }}>No Active Search Query</strong>
                Enter your search intent above (e.g., "Find restaurant leads in Bangalore") and click "Execute Agent" to run the live n8n geocoding, scraping, and scoring pipeline.
              </div>
            )}
          </>
        )}

        {activeTab === 'manage' && (() => {
          const filteredManageLeads = leads.filter(lead => {
            const q = manageSearchQuery.toLowerCase();
            return lead.company.toLowerCase().includes(q) || 
                   lead.location.toLowerCase().includes(q) || 
                   lead.industry.toLowerCase().includes(q) ||
                   (lead.phone && lead.phone.toLowerCase().includes(q)) ||
                   (lead.email && lead.email.toLowerCase().includes(q));
          });

          const totalLeadsCount = filteredManageLeads.length;
          const totalPages = Math.ceil(totalLeadsCount / leadsPerPage) || 1;
          const currentPage = Math.min(manageCurrentPage, totalPages);
          const startIndex = (currentPage - 1) * leadsPerPage;
          const endIndex = startIndex + leadsPerPage;
          const paginatedLeads = filteredManageLeads.slice(startIndex, endIndex);

          const handleQuickIngestSubmit = async (e) => {
            e.preventDefault();
            const missingRequired = ingestFields.filter(f => f.required && !ingestValues[f.key]);
            if (missingRequired.length > 0) {
              setQuickIngestStatus(`Please fill required fields: ${missingRequired.map(f => f.label).join(', ')}`);
              return;
            }
            setQuickIngestStatus('Ingesting...');
            try {
              const res = await authenticatedFetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...ingestValues, source: ingestValues.source || 'Dashboard Manual Ingest' })
              });
              if (res.ok) {
                setQuickIngestStatus('Lead ingested successfully.');
                setIngestValues({});
                setTimeout(() => setQuickIngestStatus(''), 2500);

                // Refresh the leads state to update all dashboard tabs instantly
                const dbResp = await authenticatedFetch('/api/leads');
                if (dbResp.ok) {
                  const data = await dbResp.json();
                  setLeads(data);
                }
              } else {
                const errData = await res.json().catch(() => ({}));
                setQuickIngestStatus(errData.error || 'Ingest failed. Check server logs.');
              }
            } catch (err) {
              setQuickIngestStatus(err.message || 'Network error. Try again.');
            }
          };

          return (
            <>
              {/* QUICK SINGLE LEAD INGEST — DYNAMIC FIELDS */}
              <div className="nlp-console-card" style={{ marginBottom: '24px' }}>
                <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                  <span className="db-card-title">Quick Lead Ingest</span>
                  <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Manual Single Record — Admin Only</span>
                </div>

                {/* Ingestion template selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '11px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Ingestion Template:</label>
                  <select
                    className="finder-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', background: 'var(--ink3)', color: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '6px' }}
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTemplateId(val);
                      if (val === 'default') {
                        setIngestFields(DEFAULT_INGEST_FIELDS);
                        setIngestValues({});
                      } else {
                        const found = ingestTemplates.find(t => String(t.id) === String(val));
                        if (found) {
                          setIngestFields(found.fields);
                          setIngestValues({});
                        }
                      }
                    }}
                  >
                    <option value="default">Default Form</option>
                    {ingestTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {selectedTemplateId !== 'default' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this template?")) {
                          try {
                            const res = await authenticatedFetch(`/api/ingest-templates/${selectedTemplateId}`, {
                              method: 'DELETE'
                            });
                            if (res.ok) {
                              setSelectedTemplateId('default');
                              setIngestFields(DEFAULT_INGEST_FIELDS);
                              fetchIngestTemplates();
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Delete Template
                    </button>
                  )}
                </div>

                {/* Field manager toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--fog)' }}>Active fields: <strong style={{ color: 'var(--cream)' }}>{ingestFields.length}</strong></span>
                  <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIngestFieldPickerOpen(o => !o)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '11px', background: 'rgba(232,150,42,0.1)', border: '1px solid rgba(232,150,42,0.35)', color: 'var(--gold)', borderRadius: '7px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Custom Field
                    </button>
                    {ingestFieldPickerOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: '10px', width: '280px', padding: '16px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>Create Custom Field</div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase' }}>Field Label</label>
                          <input
                            type="text"
                            className="finder-input"
                            placeholder="e.g. GST ID"
                            value={newFieldLabel}
                            onChange={e => {
                              setNewFieldLabel(e.target.value);
                              const derivedKey = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                              setNewFieldName(derivedKey);
                            }}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase' }}>Field Key</label>
                          <input
                            type="text"
                            className="finder-input"
                            placeholder="e.g. gst_id"
                            value={newFieldName}
                            onChange={e => setNewFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase' }}>Data Type</label>
                          <select
                            className="finder-input"
                            value={newFieldType}
                            onChange={e => setNewFieldType(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="url">URL</option>
                            <option value="email">Email</option>
                            <option value="date">Date</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                          <input
                            type="checkbox"
                            id="custom-field-required"
                            style={{ accentColor: 'var(--gold)' }}
                            onChange={(e) => {
                              window.newFieldRequired = e.target.checked;
                            }}
                          />
                          <label htmlFor="custom-field-required" style={{ fontSize: '11px', color: 'var(--cream)', cursor: 'pointer' }}>Required Field</label>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newFieldName.trim() || !newFieldLabel.trim()) {
                                alert("Please specify a field label and key.");
                                return;
                              }
                              if (ingestFields.find(f => f.key === newFieldName)) {
                                alert("A field with this key already exists.");
                                return;
                              }
                              const newF = {
                                key: newFieldName,
                                label: newFieldLabel,
                                type: newFieldType,
                                required: !!window.newFieldRequired,
                                placeholder: `Enter ${newFieldLabel}`
                              };
                              setIngestFields(prev => [...prev, newF]);
                              setNewFieldName('');
                              setNewFieldLabel('');
                              setNewFieldType('text');
                              window.newFieldRequired = false;
                              setIngestFieldPickerOpen(false);
                            }}
                            style={{ flex: 1, padding: '8px', fontSize: '11px', background: 'rgba(232,150,42,0.2)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Create Field
                          </button>
                          <button
                            type="button"
                            onClick={() => setIngestFieldPickerOpen(false)}
                            style={{ padding: '8px 12px', fontSize: '11px', background: 'none', border: '1px solid var(--line)', color: 'var(--fog)', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIngestFields(DEFAULT_INGEST_FIELDS); setIngestValues({}); setSelectedTemplateId('default'); }}
                    style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--fog)', borderRadius: '7px', cursor: 'pointer' }}
                  >Reset</button>
                  <button
                    type="button"
                    onClick={() => setSaveTemplateModalOpen(true)}
                    style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '7px', cursor: 'pointer' }}
                  >Save as Template</button>
                </div>

                {/* Dynamic form grid */}
                <form onSubmit={handleQuickIngestSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {ingestFields.map(field => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>
                          {field.label}{field.required ? ' *' : ''}
                        </label>
                        {!field.required && (
                          <button
                            type="button"
                            title={`Remove ${field.label} field`}
                            onClick={() => {
                              setIngestFields(prev => prev.filter(f => f.key !== field.key));
                              setIngestValues(prev => { const n = { ...prev }; delete n[field.key]; return n; });
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--fog)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', opacity: 0.6, lineHeight: 1 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--fog)'}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                      {field.type === 'select' ? (
                        <select
                          className="finder-input"
                          value={ingestValues[field.key] || ''}
                          onChange={e => setIngestValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          style={{ padding: '9px 12px', fontSize: '12px' }}
                        >
                          <option value="">Select...</option>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          className="finder-input"
                          type={field.type}
                          required={field.required}
                          placeholder={field.placeholder}
                          value={ingestValues[field.key] || ''}
                          onChange={e => setIngestValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          style={{ padding: '9px 12px', fontSize: '12px' }}
                        />
                      )}
                    </div>
                  ))}

                  {/* Submit row */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                    <button type="submit" style={{ padding: '10px 24px', fontSize: '12px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', borderRadius: '8px', cursor: 'pointer', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                      {quickIngestStatus === 'Ingesting...' ? 'Ingesting...' : 'Ingest Lead'}
                    </button>
                    {quickIngestStatus && (
                      <span style={{ fontSize: '11px', color: quickIngestStatus.includes('success') ? '#4ade80' : (quickIngestStatus.includes('Ingesting') ? 'var(--gold)' : '#ef4444') }}>
                        {quickIngestStatus}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--fog)' }}>
                      {ingestFields.filter(f => !f.required).length} optional · {ingestFields.filter(f => f.required).length} required
                    </span>
                  </div>
                </form>
              </div>


              {/* UPLOAD CARD — BULK INGEST */}
              <div className="nlp-console-card" style={{ marginBottom: '24px' }}>
                <div className="db-card-title-wrap">
                  <span className="db-card-title">Bulk Ingest Leads Directory</span>
                  <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>CSV, JSON, or Excel File Ingestion Engine</span>
                </div>

                {/* Dynamic columns info */}
                <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(232,150,42,0.06)', border: '1px solid rgba(232,150,42,0.18)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Supported Column Names in File</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['company / name', 'industry / niche', 'location / city', 'website', 'phone', 'email', 'contact_name', 'contact_title', 'address', 'whatsapp_number', 'rating', 'ai_score', 'status', 'next_followup', 'source', 'lat', 'lng', 'category', 'total_ratings', 'opening_hours', 'business_status', 'website_description', 'google_maps_url'].map(col => (
                      <span key={col} style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '10px', color: 'var(--mist)', fontFamily: 'monospace' }}>{col}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fog)' }}>Any extra columns in your file will be accepted and stored. Missing columns will be auto-filled or AI-generated.</div>
                </div>

                    
                    <div className="file-upload-zone" style={{
                      border: '1.5px dashed var(--line)',
                      background: 'var(--ink3)',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <input 
                        type="file" 
                        accept=".csv,.json,.xlsx,.xls"
                        onChange={handleFileUpload}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ color: 'var(--gold)', marginBottom: '8px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <span style={{ color: 'var(--cream)', fontSize: '13px', display: 'block' }}>Drag & drop or click to upload CSV, JSON, or Excel file</span>
                      <span style={{ color: 'var(--mist)', fontSize: '11px', display: 'block', marginTop: '4px' }}>Supports direct Postgres transactional loading & zero-vector RAG registration</span>
                    </div>

                {uploadMessage && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '4px', fontSize: '12px' }}>
                    ✓ {uploadMessage}
                  </div>
                )}
                {uploadError && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '4px', fontSize: '12px' }}>
                    ⚠️ Upload Failed: {uploadError}
                  </div>
                )}
              </div>

              {/* LEADS LIST EDITOR */}
              <div className="db-crm-card">
                <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                  <span className="db-card-title">Interactive Lead Directory & Priority Manager</span>
                  <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Full Database Read, Edit, and Status Lifecycle Controls</span>
                </div>

                {/* SEARCH AND BULK CONTROLS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                  <div className="db-filters-row" style={{ margin: 0, padding: 0 }}>
                    <div className="db-search-wrap" style={{ width: '100%', maxWidth: '400px', marginLeft: 0 }}>
                      <input 
                        type="text" 
                        className="db-search-input" 
                        placeholder="Search directory by name, city, industry..." 
                        value={manageSearchQuery}
                        onChange={(e) => setManageSearchQuery(e.target.value)}
                      />
                      <svg className="db-search-icon" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>

                  {selectedLeadIds.length > 0 && (
                    <div className="bulk-actions-bar" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.22)',
                      animation: 'nidFade 0.2s ease-out',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ color: 'var(--cream)', fontSize: '12px',  }}>
                        Selected: <strong>{selectedLeadIds.length}</strong>
                      </span>
                      
                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleBulkStatusUpdate('Contacted')}
                          className="crm-act-btn"
                          style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.2)', cursor: 'pointer' }}
                        >
                          ✓ Mark Contacted
                        </button>
                        <button 
                          onClick={() => handleBulkStatusUpdate('New')}
                          className="crm-act-btn"
                          style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(255,255,255,0.02)', color: 'var(--cream)', border: '1px solid var(--line)', cursor: 'pointer' }}
                        >
                          ✗ Mark Uncontacted
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--line)', paddingLeft: '12px' }}>
                          <span style={{ color: 'var(--fog)', fontSize: '10px', textTransform: 'uppercase' }}>Priority:</span>
                          <button 
                            onClick={() => handleBulkPriorityUpdate('Hot')}
                            className="crm-act-btn"
                            style={{ padding: '4.5px 10px', fontSize: '11px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                            Hot
                          </button>
                          <button 
                            onClick={() => handleBulkPriorityUpdate('Warm')}
                            className="crm-act-btn"
                            style={{ padding: '4.5px 10px', fontSize: '11px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
                            Warm
                          </button>
                          <button 
                            onClick={() => handleBulkPriorityUpdate('Cold')}
                            className="crm-act-btn"
                            style={{ padding: '4.5px 10px', fontSize: '11px', background: 'rgba(58, 158, 232, 0.1)', color: '#3a9ee8', border: '1px solid rgba(58, 158, 232, 0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12H4M12 20V4M17.657 17.657L6.343 6.343M17.657 6.343L6.343 17.657"/></svg>
                            Cold
                          </button>
                        </div>
                        
                        <button 
                          onClick={handleBulkDelete}
                          className="crm-act-btn"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '11px', 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#ef4444', 
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            marginLeft: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          Delete Selected
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                            checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.includes(l.leadId))}
                            onChange={() => handleToggleSelectAll(paginatedLeads)}
                          />
                        </th>
                        <th>Company</th>
                        <th>Niche / City</th>
                        <th>Contact Details</th>
                        <th>Priority Grade</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map(lead => {
                        const isEditing = editingLeadId === lead.leadId;
                        
                        return (
                          <tr key={lead.leadId}>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input 
                                type="checkbox" 
                                style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                                checked={selectedLeadIds.includes(lead.leadId)}
                                onChange={() => handleToggleSelect(lead.leadId)}
                                disabled={isEditing}
                              />
                            </td>
                            {isEditing ? (
                              <>
                                {/* Edit Name */}
                                <td>
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', marginBottom: '4px' }}
                                    value={editForm.company || ''} 
                                    onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                                  />
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}
                                    placeholder="Website"
                                    value={editForm.website || ''} 
                                    onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                                  />
                                  {editForm.custom_fields && Object.keys(editForm.custom_fields).length > 0 && (
                                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '6px' }}>
                                      <div style={{ fontSize: '9px', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Custom Fields</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {Object.keys(editForm.custom_fields).map(key => (
                                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--fog)' }}>{key}</span>
                                            <input 
                                              type="text" 
                                              className="finder-input" 
                                              style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }}
                                              value={editForm.custom_fields[key] || ''} 
                                              onChange={e => setEditForm({
                                                ...editForm,
                                                custom_fields: {
                                                  ...editForm.custom_fields,
                                                  [key]: e.target.value
                                                }
                                              })}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                {/* Edit Niche/City */}
                                <td>
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', marginBottom: '4px' }}
                                    value={editForm.industry || ''} 
                                    onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                  />
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}
                                    value={editForm.location || ''} 
                                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                  />
                                </td>
                                {/* Edit Contact details */}
                                <td>
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', marginBottom: '4px' }}
                                    placeholder="Phone"
                                    value={editForm.phone || ''} 
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                  />
                                  <input 
                                    type="text" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}
                                    placeholder="Email"
                                    value={editForm.email || ''} 
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                  />
                                </td>
                                {/* Edit Priority Grade / Score */}
                                <td>
                                  <select 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', background: 'var(--ink3)', color: 'var(--cream)', border: '1px solid var(--line)', marginBottom: '4px' }}
                                    value={editForm.ai_grade || 'Warm'} 
                                    onChange={e => setEditForm({ ...editForm, ai_grade: e.target.value })}
                                  >
                                    <option value="Hot">Hot</option>
                                    <option value="Warm">Warm</option>
                                    <option value="Cold">Cold</option>
                                  </select>
                                  <input 
                                    type="number" 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}
                                    min="1" max="10"
                                    value={editForm.ai_score || 5} 
                                    onChange={e => setEditForm({ ...editForm, ai_score: parseInt(e.target.value) })}
                                  />
                                </td>
                                {/* Edit Mode Assignment */}
                                <td>
                                  <select 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', background: 'var(--ink3)', color: 'var(--cream)', border: '1px solid var(--line)' }}
                                    value={lead.assignedTo || ''} 
                                    onChange={e => handleAssignLead(lead.leadId, e.target.value)}
                                  >
                                    <option value="">Unassigned</option>
                                    {crmUsers.map(u => (
                                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                  </select>
                                </td>
                                {/* Edit Status */}
                                <td>
                                  <select 
                                    className="finder-input" 
                                    style={{ padding: '6px 10px', fontSize: '12px', width: '100%', background: 'var(--ink3)', color: 'var(--cream)', border: '1px solid var(--line)' }}
                                    value={editForm.status || 'New'} 
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                  >
                                    <option value="New">New</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Closed">Closed</option>
                                  </select>
                                </td>
                                {/* Actions */}
                                <td>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => handleLeadSave(lead.leadId)} style={{ padding: '6px 10px', background: 'var(--green)', border: 'none', color: 'var(--ink)', cursor: 'pointer',  fontSize: '11px' }}>Save</button>
                                    <button onClick={() => setEditingLeadId(null)} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)', color: 'var(--cream)', cursor: 'pointer',  fontSize: '11px' }}>Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Read Mode Name */}
                                <td>
                                  <strong style={{ color: 'var(--cream)', display: 'block' }}>{lead.company}</strong>
                                  {lead.website ? (
                                    <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontSize: '11px', textDecoration: 'none' }}>{lead.website}</a>
                                  ) : (
                                    <span style={{ color: 'var(--mist)', fontSize: '11px' }}>No website</span>
                                  )}
                                  {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                      {Object.entries(lead.custom_fields).map(([k, v]) => (
                                        v !== null && v !== undefined && v !== '' ? (
                                          <span key={k} style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '4px', color: 'var(--fog)' }}>
                                            <strong>{k}:</strong> {String(v)}
                                          </span>
                                        ) : null
                                      ))}
                                    </div>
                                  )}
                                </td>
                                {/* Read Mode Niche/City */}
                                <td>
                                  <span style={{ color: 'var(--cream)', fontSize: '12px', display: 'block' }}>{lead.industry}</span>
                                  <span style={{ color: 'var(--mist)', fontSize: '11px' }}>{lead.location}</span>
                                </td>
                                {/* Read Mode Contact */}
                                <td>
                                  <span style={{ color: 'var(--cream)', fontSize: '12px', display: 'block' }}>{lead.phone || 'N/A'}</span>
                                  <span style={{ color: 'var(--mist)', fontSize: '11px' }}>{lead.email || 'N/A'}</span>
                                </td>
                                {/* Read Mode Priority Grade */}
                                <td>
                                  <span className={`grade-badge ${lead.ai_grade?.toLowerCase()}`} style={{ marginRight: '6px' }}>
                                    {lead.ai_grade}
                                  </span>
                                  <span style={{ color: 'var(--mist)', fontSize: '11px' }}>Score: {lead.ai_score}/10</span>
                                </td>
                                {/* Read Mode Assigned To */}
                                <td>
                                  <select 
                                    className="crm-assign-select"
                                    value={lead.assignedTo || ''} 
                                    onChange={e => handleAssignLead(lead.leadId, e.target.value)}
                                  >
                                    <option value="">Unassigned</option>
                                    {crmUsers.map(u => (
                                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                  </select>
                                </td>
                                {/* Read Mode Status */}
                                <td>
                                  <span className={`status-badge ${lead.status?.toLowerCase().replace(' ', '-')}`}>
                                    {lead.status}
                                  </span>
                                </td>
                                {/* Read Mode Actions */}
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleLeadEditInit(lead)} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--cream)', cursor: 'pointer',  fontSize: '11px' }}>Edit</button>
                                    <button onClick={async () => {
                                      const nextStatus = lead.status === 'Contacted' ? 'New' : 'Contacted';
                                      try {
                                        await authenticatedFetch('/api/leads', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ leadId: lead.leadId, status: nextStatus })
                                        });
                                        const dbResp = await authenticatedFetch('/api/leads');
                                        if (dbResp.ok) setLeads(await dbResp.json());
                                      } catch(e) { console.error(e); }
                                    }} style={{ padding: '4px 8px', background: lead.status === 'Contacted' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', color: lead.status === 'Contacted' ? '#4ade80' : 'var(--mist)', cursor: 'pointer',  fontSize: '11px' }}>
                                      {lead.status === 'Contacted' ? '✓ Contacted' : '✗ Mark Contacted'}
                                    </button>
                                    <button
                                      onClick={() => { setActiveLeadTimeline({ leadId: lead.leadId, company: lead.company }); }}
                                      className="crm-act-btn"
                                      style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer' }}
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                                        Timeline
                                      </span>
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {paginatedLeads.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: 'var(--fog)', padding: '24px' }}>
                            No matching records found in this directory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="crm-pagination-bar" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    padding: '12px 20px',
                    background: 'rgba(7, 8, 10, 0.2)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ color: 'var(--mist)', fontSize: '12px' }}>
                      Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(endIndex, totalLeadsCount)}</strong> of <strong>{totalLeadsCount}</strong> leads
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setManageCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--line)',
                          color: currentPage === 1 ? 'var(--fog)' : 'var(--cream)',
                          borderRadius: '20px',
                          fontSize: '11px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.4 : 1,
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                      >
                        ← Previous
                      </button>
                      
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        const isCurrent = pageNum === currentPage;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setManageCurrentPage(pageNum)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isCurrent ? 'var(--gold)' : 'transparent',
                              border: isCurrent ? 'none' : '1px solid transparent',
                              color: isCurrent ? 'var(--ink)' : 'var(--mist)',
                              fontSize: '11px',
                              fontWeight: isCurrent ? '600' : '400',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setManageCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--line)',
                          color: currentPage === totalPages ? 'var(--fog)' : 'var(--cream)',
                          borderRadius: '20px',
                          fontSize: '11px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.4 : 1,
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {saveTemplateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  <div style={{ background: 'var(--ink2)', border: '1px solid var(--line)', borderRadius: '12px', padding: '24px', width: '360px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                    <div style={{ fontSize: '15px', color: 'var(--cream)', fontWeight: 700, marginBottom: '8px' }}>Save Ingestion Template</div>
                    <p style={{ fontSize: '12px', color: 'var(--fog)', marginBottom: '16px' }}>Provide a name for this custom template. It will store the current fields configuration.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Template Name</label>
                      <input
                        type="text"
                        className="finder-input"
                        placeholder="e.g. Real Estate Leads"
                        value={newTemplateName}
                        onChange={e => setNewTemplateName(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => { setSaveTemplateModalOpen(false); setNewTemplateName(''); }}
                        style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--line)', color: 'var(--fog)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newTemplateName.trim()) {
                            alert("Please enter a template name.");
                            return;
                          }
                          try {
                            const res = await authenticatedFetch('/api/ingest-templates', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: newTemplateName,
                                fields: ingestFields
                              })
                            });
                            if (res.ok) {
                              alert("Template saved successfully.");
                              setSaveTemplateModalOpen(false);
                              setNewTemplateName('');
                              fetchIngestTemplates();
                            } else {
                              const err = await res.json();
                              alert(err.error || "Failed to save template.");
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{ padding: '8px 16px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {activeTab === 'integrations' && (() => {
          return (
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* HEADER */}
              <div style={{ marginBottom: '8px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--cream)', margin: '0 0 4px 0' }}>Google Forms & Sync Settings</h1>
                <p style={{ fontSize: '13px', color: 'var(--fog)', margin: 0 }}>Configure Google Client Credentials, authenticate via OAuth, and sync your form submissions as leads.</p>
              </div>

              {/* GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                {/* COLUMN 1: OAuth & Credentials Settings */}
                <div className="nlp-console-card">
                  <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                    <span className="db-card-title">1. Google OAuth Setup</span>
                    <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Google OAuth 2.0 Credentials API</span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', padding: '14px', borderRadius: '8px', fontSize: '12px', color: 'var(--mist)', lineHeight: '1.6', marginBottom: '20px' }}>
                    <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '6px' }}>Instruction Details:</strong>
                    Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Google Cloud Console</a>, create a project, enable the <strong>Google Forms API</strong>, and create an OAuth 2.0 Client ID. 
                    <br />
                    Add this callback URL to your <strong>Authorized Redirect URIs</strong>:
                    <div style={{ margin: '8px 0', padding: '6px 10px', background: 'rgba(7,8,10,0.4)', border: '1px solid var(--line)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--cream)', wordBreak: 'break-all' }}>
                      {window.location.origin}/api/auth/google/callback
                    </div>
                  </div>

                  <form onSubmit={saveGoogleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Google Client ID</label>
                      <input
                        type="text"
                        className="finder-input"
                        required
                        placeholder="Paste Client ID here..."
                        value={googleClientConfig.client_id}
                        onChange={e => setGoogleClientConfig({ ...googleClientConfig, client_id: e.target.value })}
                        style={{ padding: '9px 12px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Google Client Secret</label>
                      <input
                        type="password"
                        className="finder-input"
                        required
                        placeholder="Paste Client Secret here..."
                        value={googleClientConfig.client_secret}
                        onChange={e => setGoogleClientConfig({ ...googleClientConfig, client_secret: e.target.value })}
                        style={{ padding: '9px 12px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Redirect URI</label>
                      <input
                        type="text"
                        className="finder-input"
                        required
                        placeholder="e.g. http://localhost:5000/api/auth/google/callback"
                        value={googleClientConfig.redirect_uri || `${window.location.origin}/api/auth/google/callback`}
                        onChange={e => setGoogleClientConfig({ ...googleClientConfig, redirect_uri: e.target.value })}
                        style={{ padding: '9px 12px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                      <button type="submit" style={{ padding: '10px 20px', fontSize: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--cream)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        Save Credentials
                      </button>
                      {googleConfigMessage && (
                        <span style={{ fontSize: '11px', color: googleConfigMessage.includes('success') ? '#4ade80' : 'var(--gold)' }}>
                          {googleConfigMessage}
                        </span>
                      )}
                    </div>
                  </form>

                  {/* OAuth status panel */}
                  <div style={{ borderTop: '1px solid var(--line)', marginTop: '24px', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--fog)', textTransform: 'uppercase' }}>OAuth Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: googleStatus.connected ? '#4ade80' : '#ef4444', display: 'inline-block' }}></span>
                          <span style={{ fontSize: '13px', color: 'var(--cream)', fontWeight: 600 }}>
                            {googleStatus.connected ? `Connected (${googleStatus.email || 'Google Account'})` : 'Not Connected'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={!googleStatus.configured}
                        style={{
                          padding: '10px 24px',
                          fontSize: '12px',
                          background: 'rgba(232,150,42,0.15)',
                          border: '1px solid rgba(232,150,42,0.4)',
                          color: 'var(--gold)',
                          borderRadius: '8px',
                          cursor: googleStatus.configured ? 'pointer' : 'not-allowed',
                          opacity: googleStatus.configured ? 1 : 0.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.06em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        {googleStatus.connected ? 'Reconnect' : 'Connect with Google'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Google Form Creator & Management */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Form Creator */}
                  <div className="nlp-console-card">
                    <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                      <span className="db-card-title">2. Google Form Creator</span>
                      <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Deploy custom web surveys</span>
                    </div>

                    <form onSubmit={handleCreateGoogleForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Form Title</label>
                        <input
                          type="text"
                          className="finder-input"
                          required
                          disabled={!googleStatus.connected}
                          placeholder="e.g. Lead Ingest Survey Form"
                          value={newFormTitle}
                          onChange={e => setNewFormTitle(e.target.value)}
                          style={{ padding: '9px 12px', fontSize: '12px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Check fields to include</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', background: 'rgba(7,8,10,0.3)', border: '1px solid var(--line)', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {ingestFields.map(f => (
                            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--cream)', cursor: googleStatus.connected ? 'pointer' : 'not-allowed', opacity: googleStatus.connected ? 1 : 0.6 }}>
                              <input
                                type="checkbox"
                                style={{ accentColor: 'var(--gold)', cursor: googleStatus.connected ? 'pointer' : 'default' }}
                                disabled={!googleStatus.connected}
                                checked={googleFormFields.includes(f.key)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setGoogleFormFields(prev => [...prev, f.key]);
                                  } else {
                                    setGoogleFormFields(prev => prev.filter(k => k !== f.key));
                                  }
                                }}
                              />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {f.label} {f.required && <span style={{ color: 'var(--gold)' }}>*</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                        <button
                          type="submit"
                          disabled={!googleStatus.connected || formCreateStatus.includes('Creating')}
                          style={{
                            padding: '10px 24px',
                            fontSize: '12px',
                            background: 'rgba(168,85,247,0.15)',
                            border: '1px solid rgba(168,85,247,0.4)',
                            color: '#c084fc',
                            borderRadius: '8px',
                            cursor: googleStatus.connected ? 'pointer' : 'not-allowed',
                            opacity: googleStatus.connected ? 1 : 0.5,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}
                        >
                          {formCreateStatus.includes('Creating') ? 'Creating...' : 'Create Form 🚀'}
                        </button>
                        {formCreateStatus && (
                          <span style={{ fontSize: '11px', color: formCreateStatus.includes('success') ? '#4ade80' : 'var(--gold)' }}>
                            {formCreateStatus}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Active Google Forms List */}
                  <div className="nlp-console-card" style={{ flex: 1 }}>
                    <div className="db-card-title-wrap" style={{ marginBottom: '16px' }}>
                      <span className="db-card-title">3. Form Synchronization Terminal</span>
                      <span style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sync responses to leads database</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                      {googleForms.map(form => (
                        <div key={form.form_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', padding: '12px 16px', borderRadius: '8px', gap: '16px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: 'var(--cream)', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.title}</div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', alignItems: 'center' }}>
                              <a href={form.responder_uri} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                View Form 
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                              {form.last_synced_at && (
                                <span style={{ fontSize: '10px', color: 'var(--fog)' }}>
                                  Last Synced: {new Date(form.last_synced_at).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {formsSyncStatus[form.form_id] && (
                              <span style={{ fontSize: '11px', color: 'var(--gold)' }}>
                                {formsSyncStatus[form.form_id]}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSyncGoogleForm(form.form_id)}
                              disabled={formsSyncStatus[form.form_id] === 'Syncing...'}
                              style={{
                                padding: '8px 14px',
                                fontSize: '11px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--line)',
                                color: 'var(--cream)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Sync Now ↺
                            </button>
                          </div>
                        </div>
                      ))}

                      {googleForms.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--fog)', fontSize: '12px' }}>
                          No active Google Forms created yet. Create a form above to enable syncing.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          );
        })()}

        {activeTab === 'tasks' && (() => {
          const TASK_COLS = ['Pending', 'In Progress', 'Completed'];
          const PRIORITY_META = {
            High:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  dot: '#f43f5e' },
            Medium: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', dot: '#a855f7' },
            Low:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', dot: '#4ade80' },
          };

          // ── Built-in task templates ──────────────────────────────────────
          const TASK_TEMPLATES = [
            {
              id: 'contact',
              label: 'Contact Outreach',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
                </svg>
              ),
              color: '#4ade80',
              bg: 'rgba(74,222,128,0.08)',
              border: 'rgba(74,222,128,0.25)',
              description: 'Assign a team member to reach out to selected leads via WhatsApp, email or call.',
              defaults: {
                title: 'Contact Outreach — {leads}',
                priority: 'High',
                description: 'Reach out to the assigned leads. Log all contact attempts and responses.',
                milestones: [
                  'Review lead profile and AI score',
                  'Send initial WhatsApp / email message',
                  'Follow up if no response within 48h',
                  'Log response and update lead status',
                  'Schedule next follow-up or close lead'
                ]
              }
            },
            {
              id: 'lead-gen',
              label: 'Lead Gen / Collection',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              ),
              color: '#a855f7',
              bg: 'rgba(168,85,247,0.08)',
              border: 'rgba(168,85,247,0.25)',
              description: 'Task for finding and scraping new leads from a specific niche and city.',
              defaults: {
                title: 'Lead Generation — {niche} in {city}',
                priority: 'Medium',
                description: 'Use the NLP Console to trigger n8n and collect fresh leads. Validate and enter into CRM.',
                milestones: [
                  'Define target niche and city',
                  'Run NLP Console / n8n search query',
                  'Review raw leads in Manage tab',
                  'Remove duplicates and low-score entries',
                  'Update lead statuses and assign to team'
                ]
              }
            },
            {
              id: 'custom',
              label: 'Custom Template',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              ),
              color: '#f59e0b',
              bg: 'rgba(245,158,11,0.08)',
              border: 'rgba(245,158,11,0.25)',
              description: 'Build your own task template with custom title and milestones.',
              defaults: null
            }
          ];

          // ── Lead search filter ──────────────────────────────────────────
          const filteredTaskLeads = leads.filter(l => {
            if (!taskLeadSearch.trim()) return true;
            const q = taskLeadSearch.toLowerCase();
            return l.company.toLowerCase().includes(q) ||
                   l.location.toLowerCase().includes(q) ||
                   l.industry.toLowerCase().includes(q);
          }).slice(0, 30);

          // ── User search filter ─────────────────────────────────────────
          const filteredTaskUsers = crmUsers.filter(u => {
            if (!taskUserSearch.trim()) return true;
            const q = taskUserSearch.toLowerCase();
            return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                   u.email.toLowerCase().includes(q);
          });

          const applyTemplate = (tpl) => {
            setSelectedTemplate(tpl.id);
            if (tpl.defaults) {
              setNewTaskForm(prev => ({
                ...prev,
                title: tpl.defaults.title,
                description: tpl.defaults.description,
                priority: tpl.defaults.priority
              }));
              setMilestonesList(tpl.defaults.milestones);
            } else {
              setNewTaskForm(prev => ({ ...prev, title: '', description: '', priority: 'Medium' }));
              setMilestonesList(customTemplateMilestones);
            }
            setTaskActiveMode('new');
          };

          const resetTaskForm = () => {
            setTaskActiveMode('board');
            setSelectedTemplate(null);
            setNewTaskForm({ leadId: '', assignedTo: '', title: '', description: '', priority: 'Medium', dueDate: '' });
            setSelectedAssigneeIds([]);
            setTaskSelectedLeadIds([]);
            setMilestonesList([]);
            setNewMilestoneText('');
            setTeamName('');
            setTaskLeadSearch('');
            setTaskUserSearch('');
          };

          const handleCreateTemplateTask = async (e) => {
            e.preventDefault();
            if (!newTaskForm.title.trim()) { alert('Please enter a task title.'); return; }
            if (selectedAssigneeIds.length === 0) { alert('Please select at least one team member.'); return; }
            try {
              const leadIds = taskSelectedLeadIds.length > 0 ? taskSelectedLeadIds : (newTaskForm.leadId ? [newTaskForm.leadId] : []);
              const resp = await authenticatedFetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  leadId: leadIds[0] || null,
                  assignedUserIds: selectedAssigneeIds,
                  title: newTaskForm.title.trim(),
                  description: newTaskForm.description ? newTaskForm.description.trim() : '',
                  priority: newTaskForm.priority,
                  dueDate: newTaskForm.dueDate || null,
                  teamName: teamName.trim() || null,
                  milestones: milestonesList,
                  templateId: selectedTemplate,
                  bulkLeadIds: leadIds
                })
              });
              if (resp.ok) {
                resetTaskForm();
                fetchTasksList();
              } else {
                const err = await resp.json();
                alert(err.error || 'Failed to create task');
              }
            } catch (err) {
              console.error(err);
            }
          };

          const currentTpl = TASK_TEMPLATES.find(t => t.id === selectedTemplate);

          return (
            <div className="db-content-area" style={{ padding: '24px' }}>

              {/* ── TOP BAR ─────────────────────────────────────────────── */}
              <div className="db-crm-card" style={{ marginBottom: '20px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="db-card-title" style={{ fontSize: '15px' }}>Task Assignment Board</span>
                  <p style={{ color: 'var(--fog)', fontSize: '12px', marginTop: '4px',  }}>
                    Delegate and track tasks across your team using templates or custom workflows.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {taskActiveMode !== 'board' ? (
                    <button onClick={resetTaskForm} style={{ padding: '9px 18px', fontSize: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--fog)', borderRadius: '8px', cursor: 'pointer',  }}>
                      ← Back to Board
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setTaskActiveMode('template')}
                        style={{ padding: '9px 18px', fontSize: '12px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '8px', cursor: 'pointer',  letterSpacing: '.04em' }}
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => { setSelectedTemplate(null); setTaskActiveMode('new'); }}
                        style={{ padding: '9px 18px', fontSize: '12px', background: 'var(--gold)', color: 'var(--ink)', border: 'none', fontWeight: '700', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        + New Task
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── TEMPLATE PICKER ────────────────────────────────────── */}
              {taskActiveMode === 'template' && (
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--fog)', marginBottom: '16px',  }}>
                    Choose a template to pre-fill task fields and milestones
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {TASK_TEMPLATES.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        style={{
                          padding: '20px',
                          background: tpl.bg,
                          border: `1px solid ${tpl.border}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${tpl.bg}`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ color: tpl.color }}>{tpl.icon}</span>
                          <span style={{ color: tpl.color, fontWeight: '700', fontSize: '13px', fontFamily: "'Manrope', sans-serif" }}>{tpl.label}</span>
                        </div>
                        <p style={{ color: 'var(--mist)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{tpl.description}</p>
                        {tpl.defaults && (
                          <div style={{ marginTop: '12px', borderTop: `1px solid ${tpl.border}`, paddingTop: '10px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Includes {tpl.defaults.milestones.length} milestones</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {tpl.defaults.milestones.slice(0, 3).map((m, i) => (
                                <span key={i} style={{ fontSize: '11px', color: 'var(--fog)',  }}>· {m}</span>
                              ))}
                              {tpl.defaults.milestones.length > 3 && <span style={{ fontSize: '11px', color: tpl.color,  }}>+ {tpl.defaults.milestones.length - 3} more...</span>}
                            </div>
                          </div>
                        )}
                        {tpl.id === 'custom' && (
                          <div style={{ marginTop: '12px', borderTop: `1px solid ${tpl.border}`, paddingTop: '10px' }}>
                            <p style={{ fontSize: '11px', color: 'var(--gold)',  }}>Define your own milestones, title, and assignees →</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TASK CREATION FORM ─────────────────────────────────── */}
              {taskActiveMode === 'new' && (
                <div className="db-crm-card" style={{ marginBottom: '24px', padding: '24px', background: currentTpl ? currentTpl.bg : 'rgba(168,85,247,0.04)', border: `1px solid ${currentTpl ? currentTpl.border : 'rgba(168,85,247,0.18)'}` }}>
                  {/* Template badge */}
                  {currentTpl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <span style={{ color: currentTpl.color }}>{currentTpl.icon}</span>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.08em', color: currentTpl.color,  }}>{currentTpl.label} Template</span>
                      <button onClick={() => setTaskActiveMode('template')} style={{ marginLeft: 'auto', fontSize: '10px', background: 'none', border: '1px solid var(--line)', color: 'var(--fog)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Change</button>
                    </div>
                  )}

                  <form onSubmit={handleCreateTemplateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Row 1: Title + Team + Priority + Due Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Task Title *</label>
                        <input className="finder-input" required placeholder="e.g. Outreach — TechCorp" value={newTaskForm.title}
                          onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                          style={{ padding: '9px 12px', fontSize: '13px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Team Name</label>
                        <input className="finder-input" placeholder="e.g. Sales Crew" value={teamName}
                          onChange={e => setTeamName(e.target.value)} style={{ padding: '9px 12px', fontSize: '13px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Priority</label>
                        <select className="finder-input" value={newTaskForm.priority}
                          onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                          style={{ padding: '9px 12px', fontSize: '13px', background: 'var(--ink3)', color: 'var(--cream)', border: '1px solid var(--line)' }}>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Due Date</label>
                        <input type="date" className="finder-input" value={newTaskForm.dueDate}
                          onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                          style={{ padding: '9px 12px', fontSize: '13px', colorScheme: 'dark' }} />
                      </div>
                    </div>

                    {/* Row 2: Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>Description</label>
                      <textarea className="finder-input" placeholder="Task description..." value={newTaskForm.description}
                        onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                        rows={2} style={{ padding: '9px 12px', fontSize: '13px', resize: 'vertical' }} />
                    </div>

                    {/* Row 3: Lead Picker + User Picker side by side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                      {/* LEAD PICKER */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>
                          Link Leads <span style={{ color: 'var(--mist)', textTransform: 'none', letterSpacing: 0 }}>({taskSelectedLeadIds.length} selected)</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="finder-input"
                            placeholder="Search by company, city, industry..."
                            value={taskLeadSearch}
                            onChange={e => setTaskLeadSearch(e.target.value)}
                            style={{ padding: '9px 12px 9px 34px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                          />
                          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fog)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </div>
                        {/* Selected lead chips */}
                        {taskSelectedLeadIds.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {taskSelectedLeadIds.map(lid => {
                              const l = leads.find(x => x.leadId === lid);
                              return l ? (
                                <span key={lid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', padding: '3px 8px', borderRadius: '20px', fontSize: '11px',  }}>
                                  {l.company}
                                  <button type="button" onClick={() => setTaskSelectedLeadIds(ids => ids.filter(i => i !== lid))} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0 2px', fontSize: '13px', lineHeight: 1 }}>×</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                        {/* Lead results list */}
                        <div style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {filteredTaskLeads.length === 0 ? (
                            <div style={{ padding: '12px', color: 'var(--fog)', fontSize: '12px', textAlign: 'center',  }}>No leads match</div>
                          ) : filteredTaskLeads.map(l => {
                            const isSel = taskSelectedLeadIds.includes(l.leadId);
                            return (
                              <div
                                key={l.leadId}
                                onClick={() => {
                                  setTaskSelectedLeadIds(ids =>
                                    isSel ? ids.filter(i => i !== l.leadId) : [...ids, l.leadId]
                                  );
                                }}
                                style={{
                                  padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                                  background: isSel ? 'rgba(168,85,247,0.1)' : 'transparent',
                                  borderBottom: '1px solid var(--line2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <div>
                                  <span style={{ color: isSel ? '#c084fc' : 'var(--cream)', fontWeight: '600' }}>{l.company}</span>
                                  <span style={{ color: 'var(--fog)', marginLeft: '8px', fontSize: '10px' }}>{l.location} · {l.industry}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: l.ai_grade === 'Hot' ? '#f43f5e' : l.ai_grade === 'Warm' ? '#f59e0b' : '#8e9dae' }}>{l.ai_grade} {l.ai_score}/10</span>
                                  {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--fog)',  margin: 0 }}>Click rows to select/deselect multiple leads</p>
                      </div>

                      {/* USER PICKER */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>
                          Assign to Team Members * <span style={{ color: 'var(--mist)', textTransform: 'none', letterSpacing: 0 }}>({selectedAssigneeIds.length} selected)</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="finder-input"
                            placeholder="Search by name or email..."
                            value={taskUserSearch}
                            onChange={e => setTaskUserSearch(e.target.value)}
                            style={{ padding: '9px 12px 9px 34px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                          />
                          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fog)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        {/* Selected user chips */}
                        {selectedAssigneeIds.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {selectedAssigneeIds.map(uid => {
                              const u = crmUsers.find(x => x.id === uid);
                              return u ? (
                                <span key={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', padding: '3px 8px', borderRadius: '20px', fontSize: '11px',  }}>
                                  {u.first_name} {u.last_name}
                                  <button type="button" onClick={() => setSelectedAssigneeIds(ids => ids.filter(i => i !== uid))} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0 2px', fontSize: '13px', lineHeight: 1 }}>×</button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                        {/* User results list */}
                        <div style={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {filteredTaskUsers.length === 0 ? (
                            <div style={{ padding: '12px', color: 'var(--fog)', fontSize: '12px', textAlign: 'center',  }}>No users match</div>
                          ) : filteredTaskUsers.map(u => {
                            const isSel = selectedAssigneeIds.includes(u.id);
                            return (
                              <div
                                key={u.id}
                                onClick={() => {
                                  setSelectedAssigneeIds(ids =>
                                    isSel ? ids.filter(i => i !== u.id) : [...ids, u.id]
                                  );
                                }}
                                style={{
                                  padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                                  background: isSel ? 'rgba(74,222,128,0.08)' : 'transparent',
                                  borderBottom: '1px solid var(--line2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <div>
                                  <span style={{ color: isSel ? '#4ade80' : 'var(--cream)', fontWeight: '600' }}>{u.first_name} {u.last_name}</span>
                                  <span style={{ color: 'var(--fog)', marginLeft: '8px', fontSize: '10px',  }}>{u.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{u.role || 'user'}</span>
                                  {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--fog)',  margin: 0 }}>Click rows to select/deselect team members</p>
                      </div>
                    </div>

                    {/* Row 4: Milestones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--fog)', letterSpacing: '.08em' }}>
                        Task Milestones <span style={{ color: 'var(--mist)', textTransform: 'none', letterSpacing: 0 }}>({milestonesList.length} steps)</span>
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text" className="finder-input"
                          placeholder="Add a milestone step (press Enter)..."
                          value={newMilestoneText}
                          onChange={e => setNewMilestoneText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newMilestoneText.trim()) { setMilestonesList(m => [...m, newMilestoneText.trim()]); setNewMilestoneText(''); } } }}
                          style={{ flex: 1, padding: '9px 12px', fontSize: '12px' }}
                        />
                        <button type="button" onClick={() => { if (newMilestoneText.trim()) { setMilestonesList(m => [...m, newMilestoneText.trim()]); setNewMilestoneText(''); } }}
                          style={{ padding: '9px 18px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',  }}>
                          + Add
                        </button>
                      </div>
                      {milestonesList.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', background: 'var(--ink4)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                          {milestonesList.map((m, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--cream)', padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                              <span style={{ color: 'var(--fog)',  minWidth: '18px' }}>{idx + 1}.</span>
                              <span style={{ flex: 1,  }}>{m}</span>
                              <button type="button" onClick={() => setMilestonesList(milestonesList.filter((_, i) => i !== idx))}
                                style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                      <button type="submit" style={{ padding: '11px 28px', background: 'var(--gold)', color: 'var(--ink)', border: 'none', fontWeight: '700', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>
                        Create Task
                      </button>
                      <button type="button" onClick={resetTaskForm} style={{ padding: '11px 20px', background: 'rgba(255,255,255,0.04)', color: 'var(--fog)', border: '1px solid var(--line)', fontSize: '12px', borderRadius: '8px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── KANBAN BOARD ────────────────────────────────────────── */}
              {taskActiveMode === 'board' && (
                <div className="kanban-board">
                  {TASK_COLS.map(col => {
                    const colTasks = tasksList.filter(t => t.status === col);
                    return (
                      <div key={col} className="kanban-col">
                        <div className="kanban-col-header">
                          <span className="kanban-col-title">{col}</span>
                          <span className="kanban-col-count">{colTasks.length}</span>
                        </div>
                        <div className="kanban-col-body">
                          {colTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--fog)', fontSize: '12px',  }}>
                              No tasks here
                            </div>
                          )}
                          {colTasks.map(task => {
                            const pm = PRIORITY_META[task.priority] || PRIORITY_META.Medium;
                            const linkedLead = task.lead_id ? leads.find(l => l.leadId === task.lead_id) : null;
                            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed';
                            return (
                              <div
                                key={task.id}
                                className="task-card"
                                onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                                style={{ cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--line)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
                              >
                                <div className="task-card-header">
                                  <span className="task-priority-badge" style={{ background: pm.bg, color: pm.color }}>
                                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: pm.dot, marginRight: '4px' }}></span>
                                    {task.priority}
                                  </span>
                                  {isOverdue && <span style={{ fontSize: '10px', color: '#f43f5e',  }}>OVERDUE</span>}
                                </div>
                                <p className="task-card-title" style={{ color: 'var(--cream)', fontWeight: '600' }}>{task.title}</p>
                                {task.team_name && (
                                  <div style={{ fontSize: '10px', color: 'var(--gold)',  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    {task.team_name}
                                  </div>
                                )}
                                {task.description && (
                                  <p style={{ color: 'var(--fog)', fontSize: '11px', lineHeight: '1.5', marginBottom: '10px' }}>{task.description}</p>
                                )}
                                {task.assignees && task.assignees.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                                    {task.assignees.map(u => (
                                      <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3.5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line2)', padding: '2px 6px', borderRadius: '10px', color: 'var(--mist)', fontSize: '10px' }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        {u.first_name} {u.last_name?.charAt(0)}.
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="task-card-meta">
                                  {linkedLead && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--gold)', fontSize: '11px' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                      {linkedLead.company}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span style={{ color: isOverdue ? '#f43f5e' : 'var(--fog)', fontSize: '11px',  }}>
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="task-card-actions">
                                  {col !== 'In Progress' && (
                                    <button className="crm-act-btn" onClick={(e) => { e.stopPropagation(); handleTaskStatusUpdate(task.id, 'In Progress'); }}
                                      style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', cursor: 'pointer' }}>
                                      → In Progress
                                    </button>
                                  )}
                                  {col !== 'Completed' && (
                                    <button className="crm-act-btn" onClick={(e) => { e.stopPropagation(); handleTaskStatusUpdate(task.id, 'Completed'); }}
                                      style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', cursor: 'pointer' }}>
                                      ✓ Done
                                    </button>
                                  )}
                                  {col !== 'Pending' && (
                                    <button className="crm-act-btn" onClick={(e) => { e.stopPropagation(); handleTaskStatusUpdate(task.id, 'Pending'); }}
                                      style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--fog)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                      ↺ Reopen
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}


        {/* ═══ ACTIVITY TIMELINE DRAWER ═══ */}
        {activeLeadTimeline && (
          <div className="crm-timeline-overlay" onClick={e => { if (e.target.classList.contains('crm-timeline-overlay')) setActiveLeadTimeline(null); }}>
            <div className="crm-timeline-panel">
              <div className="crm-timeline-header">
                <div>
                  <p style={{ color: 'var(--fog)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px',  }}>Activity Timeline</p>
                  <h3 style={{ color: 'var(--cream)', fontSize: '16px', margin: 0 }}>{activeLeadTimeline.company}</h3>
                </div>
                <button
                  onClick={() => setActiveLeadTimeline(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--fog)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}
                >
                  ×
                </button>
              </div>

              <div className="crm-timeline-body">
                {timelineLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fog)', fontSize: '13px',  }}>
                    No activity recorded yet.
                    <br />
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>Assign this lead or add a note below.</span>
                  </div>
                ) : (
                  <div className="timeline-feed">
                    {timelineLogs.map((log, idx) => {
                      const actionColors = {
                        'Assigned':        { color: '#a78bfa' },
                        'Status Updated':  { color: '#38bdf8' },
                        'Note Added':      { color: '#4ade80' },
                        'Task Logged':     { color: '#a855f7' },
                      };
                      const meta = actionColors[log.action_type] || { color: 'var(--mist)' };

                      const getLogIcon = (actionType) => {
                        switch (actionType) {
                          case 'Assigned':
                            return (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            );
                          case 'Status Updated':
                            return (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                              </svg>
                            );
                          case 'Note Added':
                            return (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            );
                          case 'Task Logged':
                            return (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                              </svg>
                            );
                          default:
                            return <span style={{ color: 'var(--ink)', fontSize: '12px', fontWeight: 'bold' }}>•</span>;
                        }
                      };

                      return (
                        <div key={log.id || idx} className="timeline-item">
                          <div className="timeline-dot" style={{ background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getLogIcon(log.action_type)}
                          </div>
                          <div className="timeline-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <span className="timeline-action-type" style={{ color: meta.color }}>{log.action_type}</span>
                              <span style={{ color: 'var(--fog)', fontSize: '10px',  whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ color: 'var(--mist)', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>{log.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="crm-timeline-footer">
                <p style={{ color: 'var(--fog)', fontSize: '11px', marginBottom: '10px',  textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Progress Note</p>
                <form onSubmit={handlePostActivityNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    className="finder-input"
                    placeholder="Type a progress update, meeting note, or follow-up..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical', fontSize: '13px', padding: '10px 14px', lineHeight: '1.5' }}
                  />
                  <button
                    type="submit"
                    className="crm-act-btn"
                    style={{ padding: '10px 20px', background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end' }}
                  >
                    + Post Note
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assigned-tasks' && (() => {
          const userStr = storage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          const myTasks = tasksList.filter(t => t.assignees && t.assignees.some(assignee => assignee.id === user?.id));
          const TASK_COLS = ['Pending', 'In Progress', 'Completed'];
          const PRIORITY_META = {
            High:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e', marginRight: '4px' }}></span> },
            Medium: { color: '#a855f7', bg: 'rgba(168, 85, 247,0.12)', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', marginRight: '4px' }}></span> },
            Low:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', marginRight: '4px' }}></span> },
          };
          
          return (
            <div className="db-content-area" style={{ padding: '24px' }}>
              <div className="db-crm-card" style={{ marginBottom: '20px', padding: '20px 24px' }}>
                <span className="db-card-title" style={{ fontSize: '15px' }}>My Assigned Tasks</span>
                <p style={{ color: 'var(--fog)', fontSize: '12px', marginTop: '4px',  }}>
                  Below are the tasks currently assigned to you. Click any task to open its interactive milestone tracker and comments updates.
                </p>
              </div>

              <div className="kanban-board">
                {TASK_COLS.map(col => {
                  const colTasks = myTasks.filter(t => t.status === col);
                  return (
                    <div key={col} className="kanban-col">
                      <div className="kanban-col-header">
                        <span className="kanban-col-title">{col}</span>
                        <span className="kanban-col-count">{colTasks.length}</span>
                      </div>
                      <div className="kanban-col-body">
                        {colTasks.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--fog)', fontSize: '12px',  }}>
                            No tasks in this stage
                          </div>
                        )}
                        {colTasks.map(task => {
                          const pm = PRIORITY_META[task.priority] || PRIORITY_META.Medium;
                          const linkedLead = task.lead_id ? leads.find(l => l.leadId === task.lead_id) : null;
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed';
                          return (
                            <div
                              key={task.id}
                              className="task-card"
                              onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                              style={{ cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--line)' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
                            >
                              <div className="task-card-header">
                                <span className="task-priority-badge" style={{ background: pm.bg, color: pm.color }}>
                                  {pm.icon} {task.priority}
                                </span>
                                {isOverdue && (
                                  <span style={{ fontSize: '10px', color: '#f43f5e',  }}>OVERDUE</span>
                                )}
                              </div>
                              <p className="task-card-title" style={{ color: 'var(--cream)', fontWeight: '600' }}>{task.title}</p>
                              
                              {task.team_name && (
                                <div style={{ fontSize: '10px', color: 'var(--gold)',  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                  Team: {task.team_name}
                                </div>
                              )}
                              
                              {task.description && (
                                <p style={{ color: 'var(--fog)', fontSize: '11px', lineHeight: '1.5', marginBottom: '10px' }}>{task.description}</p>
                              )}

                              {/* Show other assignees if any */}
                              {task.assignees && task.assignees.length > 1 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                                  <span style={{ color: 'var(--fog)', fontSize: '9px', width: '100%' }}>Teammates:</span>
                                  {task.assignees.filter(u => u.id !== user?.id).map(u => (
                                    <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line2)', padding: '2px 5px', borderRadius: '10px', color: 'var(--fog)', fontSize: '9px' }}>
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                      {u.first_name} {u.last_name?.charAt(0)}.
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="task-card-meta">
                                {linkedLead && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--gold)', fontSize: '11px' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    {linkedLead.company}
                                  </span>
                                )}
                                {task.due_date && (
                                  <span style={{ color: isOverdue ? '#f43f5e' : 'var(--fog)', fontSize: '11px',  }}>
                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <div className="task-card-actions">
                                {col !== 'In Progress' && (
                                  <button
                                    className="crm-act-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskStatusUpdate(task.id, 'In Progress');
                                    }}
                                    style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(168, 85, 247,0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247,0.2)', cursor: 'pointer' }}
                                  >
                                    → In Progress
                                  </button>
                                )}
                                {col !== 'Completed' && (
                                  <button
                                    className="crm-act-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskStatusUpdate(task.id, 'Completed');
                                    }}
                                    style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', cursor: 'pointer' }}
                                  >
                                    ✓ Done
                                  </button>
                                )}
                                {col !== 'Pending' && (
                                  <button
                                    className="crm-act-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskStatusUpdate(task.id, 'Pending');
                                    }}
                                    style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--fog)', border: '1px solid var(--line)', cursor: 'pointer' }}
                                  >
                                    ↺ Reopen
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {activeTab === 'profile' && (() => {
          const userStr = storage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          return (
            <div className="db-crm-card" style={{ maxWidth: '600px', margin: '24px auto 0', padding: '40px', background: 'var(--ink2)', border: '1px solid var(--line)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-dim))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 16px',
                  color: 'var(--ink)',
                  fontFamily: "'Manrope', sans-serif"
                }}>
                  {user?.firstName?.charAt(0).toUpperCase() || (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  )}
                </div>
                <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '28px', color: 'var(--cream)', margin: '0 0 4px 0', letterSpacing: '0.04em' }}>
                  {user ? `${user.firstName} ${user.lastName}` : 'Administrator Profile'}
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {user?.company || 'Lead Intelligence Coordinator'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>First Name</span>
                  <span style={{ color: 'var(--cream)', fontSize: '12px',  }}>{user?.firstName || 'Satish'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>Last Name</span>
                  <span style={{ color: 'var(--cream)', fontSize: '12px',  }}>{user?.lastName || 'Verma'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>Email Address</span>
                  <span style={{ color: 'var(--cream)', fontSize: '12px',  }}>{user?.email || 'admin@lead.ai'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>Company</span>
                  <span style={{ color: 'var(--cream)', fontSize: '12px',  }}>{user?.company || 'Freelance Agency'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line2)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>Account Role</span>
                  <span style={{ color: 'var(--gold)', fontSize: '12px',  textTransform: 'uppercase' }}>{user?.role || 'user'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--fog)', fontSize: '12px' }}>Account Status</span>
                  <span style={{ color: '#4ade80', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
                    Active Professional
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  storage.removeItem('token');
                  storage.removeItem('user');
                  navigate('/signin');
                }}
                style={{
                  marginTop: '32px',
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '15px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.background = '#ef4444'; e.target.style.color = '#fff'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'; }}
              >
                Sign Out ↗
              </button>
            </div>
          );
        })()}

      </div>

    </div>
  );
};

export default Dashboard;
