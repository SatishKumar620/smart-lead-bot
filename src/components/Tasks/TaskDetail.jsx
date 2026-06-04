import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TaskDetail.css';

/* ─── helpers ─────────────────────────────────────────────────── */
const PRIORITY_META = {
  High:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.10)',  icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e', marginRight: '4px' }}></span> },
  Medium: { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', marginRight: '4px' }}></span> },
  Low:    { color: '#4ade80', bg: 'rgba(74,222,128,0.10)', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', marginRight: '4px' }}></span> },
};
const STATUS_META = {
  'Pending':     { color: '#94a3b8', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', marginRight: '4px' }}></span> },
  'In Progress': { color: '#a855f7', icon: <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', marginRight: '4px' }}></span> },
  'Completed':   { color: '#4ade80', icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12" /></svg> },
};

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Component ────────────────────────────────────────────────── */
const TaskDetail = () => {
  const { taskId }      = useParams();
  const navigate        = useNavigate();
  const commentEndRef   = useRef(null);
  const commentInputRef = useRef(null);

  const [task,               setTask]               = useState(null);
  const [milestones,         setMilestones]         = useState([]);
  const [comments,           setComments]           = useState([]);
  const [newComment,         setNewComment]         = useState('');
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState(null);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [togglingId,         setTogglingId]         = useState(null);
  const [updatingStatus,     setUpdatingStatus]     = useState(false);
  const [currentUser,        setCurrentUser]        = useState(null);
  const [activeTab,          setActiveTab]          = useState('timeline'); // 'timeline' | 'milestones'

  /* ── auth ── */
  useEffect(() => {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { navigate('/signin'); return; }
    setCurrentUser(JSON.parse(userStr));
  }, [navigate]);

  /* ── auth fetch ── */
  const api = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/signin'); throw new Error('No token'); }
    const resp = await fetch(url, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token}`, ...opts.headers },
    });
    if (resp.status === 401) {
      localStorage.clear();
      navigate('/signin');
      throw new Error('Unauthorized');
    }
    return resp;
  };

  /* ── load ── */
  const loadTask = async () => {
    try {
      setIsLoading(true);
      const r = await api(`/api/tasks/${taskId}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || (r.status === 404 ? 'Task not found' : 'Failed to load task'));
      }
      const data = await r.json();
      setTask(data.task);
      setMilestones(data.milestones || []);
      setComments(data.comments   || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (taskId) loadTask(); }, [taskId]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
    }
  }, [comments, isLoading]);

  /* ── permission ── */
  const isAssignee = task?.assignees?.some(u => u.id === currentUser?.id);
  const isAdmin    = currentUser?.role === 'admin';
  const canAct     = isAssignee || isAdmin;

  /* ── milestone toggle ── */
  const toggleMilestone = async (m) => {
    if (!canAct) return;
    setTogglingId(m.id);
    try {
      const r = await api(`/api/tasks/${taskId}/milestones/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !m.completed }),
      });
      if (r.ok) {
        setMilestones(prev => prev.map(x => x.id === m.id
          ? { ...x, completed: !m.completed, completed_at: !m.completed ? new Date().toISOString() : null }
          : x
        ));
        const fresh = await (await api(`/api/tasks/${taskId}`)).json();
        setComments(fresh.comments || []);
      }
    } catch(e) { console.error(e); }
    finally    { setTogglingId(null); }
  };

  /* ── status update ── */
  const updateStatus = async (nextStatus) => {
    if (!canAct || task.status === nextStatus) return;
    setUpdatingStatus(true);
    try {
      const r = await api(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (r.ok) {
        setTask(prev => ({ ...prev, status: nextStatus }));
        const fresh = await (await api(`/api/tasks/${taskId}`)).json();
        setComments(fresh.comments || []);
      }
    } catch(e) { console.error(e); }
    finally    { setUpdatingStatus(false); }
  };

  /* ── submit comment ── */
  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !canAct) return;
    setIsSubmitting(true);
    try {
      const r = await api(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (r.ok) {
        const added = await r.json();
        setComments(prev => [...prev, added]);
        setNewComment('');
      }
    } catch(e) { console.error(e); }
    finally    { setIsSubmitting(false); }
  };

  /* ── build unified timeline ── */
  const buildTimeline = () => {
    const events = [];
    comments.forEach(c => {
      const isSystem = c.comment.startsWith('Status updated to:') || c.comment.startsWith('Milestone "');
      events.push({ type: isSystem ? 'system' : 'comment', ts: c.created_at, data: c });
    });
    milestones.filter(m => m.completed && m.completed_at).forEach(m => {
      // milestones already logged via comments; skip duplicate
    });
    return events.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  };

  /* ── computed ── */
  const done      = milestones.filter(m => m.completed).length;
  const total     = milestones.length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const pMeta     = PRIORITY_META[task?.priority] || PRIORITY_META.Medium;
  const sMeta     = STATUS_META[task?.status]     || STATUS_META['Pending'];
  const timeline  = buildTimeline();

  /* ═══════════════════════════ LOADING ══════════════════════════ */
  if (isLoading) return (
    <div className="td-screen-center">
      <div className="td-spinner" />
      <p className="td-loading-text">Loading task intel…</p>
    </div>
  );

  /* ═══════════════════════════ ERROR ════════════════════════════ */
  if (error || !task) return (
    <div className="td-screen-center">
      <div className="td-error-box">
        <span className="td-error-icon">⚠️</span>
        <h2 className="td-error-title">Task Not Found</h2>
        <p className="td-error-msg">{error || 'This task is unavailable.'}</p>
        <button onClick={() => navigate('/dashboard')} className="td-btn-primary">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="td-root">
      {/* ── scanlines overlay ── */}
      <div className="td-scanlines" />

      {/* ══════════════ TOP BAR ══════════════ */}
      <header className="td-topbar">
        <div className="td-topbar-left">
          <button onClick={() => navigate('/dashboard')} className="td-back-btn">
            ← Dashboard
          </button>
          <div className="td-breadcrumb">
            <span>Tasks</span>
            <span className="td-bc-sep">/</span>
            <span className="td-bc-current">{task.title}</span>
          </div>
        </div>
        <div className="td-topbar-right">
          <span className="td-id-badge">TASK #{task.id}</span>
          {task.team_name && (
            <span className="td-team-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Team: {task.team_name}
            </span>
          )}
        </div>
      </header>

      {/* ══════════════ MAIN LAYOUT ══════════════ */}
      <div className="td-layout">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="td-sidebar">

          {/* Task Title & Meta */}
          <div className="td-card td-hero-card">
            <h1 className="td-task-title">{task.title}</h1>
            <div className="td-pills-row">
              <span className="td-pill" style={{ color: pMeta.color, background: pMeta.bg, borderColor: pMeta.color + '44' }}>
                {pMeta.icon} {task.priority}
              </span>
              <span className="td-pill" style={{ color: sMeta.color }}>
                {sMeta.icon} {task.status}
              </span>
              {task.due_date && (
                <span className="td-pill td-pill-date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {fmtDate(task.due_date)}
                </span>
              )}
            </div>

            {task.description && (
              <div className="td-desc-box">
                <span className="td-lbl">Description</span>
                <p className="td-desc-text">{task.description}</p>
              </div>
            )}

            {task.lead_name && (
              <div className="td-meta-row">
                <span className="td-lbl">Linked Lead</span>
                <span className="td-meta-val td-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h.01M16 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/></svg>
                  {task.lead_company || task.lead_name}
                </span>
              </div>
            )}

            <div className="td-meta-row">
              <span className="td-lbl">Created</span>
              <span className="td-meta-val">{fmtDateTime(task.created_at)}</span>
            </div>
          </div>

          {/* Assignees */}
          <div className="td-card">
            <h3 className="td-card-title">Assigned Team</h3>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="td-assignees">
                {task.assignees.map(u => (
                  <div key={u.id} className="td-assignee-row">
                    <div className="td-avatar">
                      {(u.first_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="td-assignee-info">
                      <span className="td-assignee-name">{u.first_name} {u.last_name}</span>
                      <span className="td-assignee-role td-role-badge" data-role={u.role}>{u.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="td-empty-text">No assignees yet.</p>
            )}
          </div>

          {/* Status Changer */}
          {canAct && (
            <div className="td-card">
              <h3 className="td-card-title">Update Status</h3>
              <div className="td-status-btns">
                {['Pending', 'In Progress', 'Completed'].map(st => (
                  <button
                    key={st}
                    disabled={updatingStatus}
                    onClick={() => updateStatus(st)}
                    className={`td-status-btn ${task.status === st ? 'active' : ''}`}
                    data-status={st}
                  >
                    {STATUS_META[st].icon} {st}
                  </button>
                ))}
              </div>
              {updatingStatus && <p className="td-saving-text">Saving…</p>}
            </div>
          )}

          {/* Progress Ring Summary */}
          <div className="td-card td-progress-card">
            <h3 className="td-card-title">Milestone Progress</h3>
            <div className="td-progress-ring-wrap">
              <svg className="td-ring" viewBox="0 0 80 80">
                <circle className="td-ring-bg"  cx="40" cy="40" r="32" />
                <circle
                  className="td-ring-fill"
                  cx="40" cy="40" r="32"
                  strokeDasharray={`${pct * 2.01} 201`}
                />
              </svg>
              <div className="td-ring-label">
                <span className="td-ring-pct">{pct}%</span>
                <span className="td-ring-sub">{done}/{total}</span>
              </div>
            </div>
            <p className="td-progress-caption">{done} of {total} milestones completed</p>
          </div>
        </aside>

        {/* ── RIGHT MAIN ── */}
        <main className="td-main">

          {/* Tab Bar */}
          <div className="td-tabs">
            <button
              className={`td-tab ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              Activity Timeline
              {comments.length > 0 && <span className="td-tab-count">{comments.length}</span>}
            </button>
            <button
              className={`td-tab ${activeTab === 'milestones' ? 'active' : ''}`}
              onClick={() => setActiveTab('milestones')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              Milestones Checklist
              {total > 0 && <span className="td-tab-count">{done}/{total}</span>}
            </button>
          </div>

          {/* ── TAB: TIMELINE ── */}
          {activeTab === 'timeline' && (
            <div className="td-panel">
              <div className="td-timeline-feed">
                {timeline.length === 0 ? (
                  <div className="td-empty-timeline">
                    <span className="td-empty-icon" style={{ color: 'var(--line)', display: 'block', marginBottom: '8px' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </span>
                    <p>No activity yet. Post the first update below.</p>
                  </div>
                ) : (
                  timeline.map((ev, idx) => {
                    const c = ev.data;
                    const isSystem = ev.type === 'system';
                    return (
                      <div key={c.id || idx} className={`td-tl-item ${isSystem ? 'system' : 'user'}`}>
                        <div className="td-tl-spine">
                          <div className="td-tl-dot" />
                          {idx < timeline.length - 1 && <div className="td-tl-line" />}
                        </div>
                        <div className="td-tl-body">
                          <div className="td-tl-header">
                            {isSystem ? (
                              <span className="td-tl-author system-author">⚙️ System</span>
                            ) : (
                              <>
                                <div className="td-tl-avatar">
                                  {(c.first_name?.[0] || '?').toUpperCase()}
                                </div>
                                <span className="td-tl-author">
                                  {c.first_name} {c.last_name}
                                </span>
                                {c.role && (
                                  <span className="td-tl-role td-role-badge" data-role={c.role}>
                                    {c.role}
                                  </span>
                                )}
                              </>
                            )}
                            <span className="td-tl-time">{fmtDateTime(c.created_at)}</span>
                          </div>
                          <div className={`td-tl-content ${isSystem ? 'system-content' : ''}`}>
                            {c.comment}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentEndRef} />
              </div>

              {/* Comment Composer */}
              {canAct ? (
                <form onSubmit={submitComment} className="td-composer">
                  <div className="td-composer-inner">
                    <div className="td-composer-avatar">
                      {(currentUser?.first_name?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="td-composer-field">
                      <textarea
                        ref={commentInputRef}
                        className="td-composer-textarea"
                        placeholder="Add a progress update, ask a question, or leave feedback…"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(e); }}
                        rows={3}
                      />
                      <div className="td-composer-footer">
                        <span className="td-composer-hint">Ctrl+Enter to post</span>
                        <button
                          type="submit"
                          disabled={isSubmitting || !newComment.trim()}
                          className="td-btn-primary"
                        >
                          {isSubmitting ? 'Posting…' : 'Post Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="td-no-perm">
                  Only assigned teammates or admins can post updates.
                </div>
              )}
            </div>
          )}

          {/* ── TAB: MILESTONES ── */}
          {activeTab === 'milestones' && (
            <div className="td-panel">

              {/* Progress Bar */}
              <div className="td-bar-wrap">
                <div className="td-bar-track">
                  <div className="td-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="td-bar-label">{pct}% Complete — {done} of {total} done</span>
              </div>

              {total === 0 ? (
                <div className="td-empty-timeline">
                  <span className="td-empty-icon" style={{ color: 'var(--line)', display: 'block', marginBottom: '8px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </span>
                  <p>No milestones configured for this task.</p>
                </div>
              ) : (
                <div className="td-ms-list">
                  {milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`td-ms-row ${m.completed ? 'done' : ''} ${togglingId === m.id ? 'toggling' : ''}`}
                      onClick={() => canAct && toggleMilestone(m)}
                    >
                      <div className="td-ms-num">{idx + 1}</div>
                      <div className="td-ms-check">
                        {togglingId === m.id ? (
                          <div className="td-mini-spinner" />
                        ) : (
                          <div className={`td-checkbox ${m.completed ? 'checked' : ''}`}>
                            {m.completed && <span className="td-check-mark">✓</span>}
                          </div>
                        )}
                      </div>
                      <div className="td-ms-body">
                        <span className="td-ms-title">{m.title}</span>
                        {m.completed && m.completed_at && (
                          <span className="td-ms-done-time" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Completed {fmtDateTime(m.completed_at)}
                          </span>
                        )}
                        {!m.completed && (
                          <span className="td-ms-pending-label">Pending</span>
                        )}
                      </div>
                      {!canAct && (
                        <span className="td-ms-lock" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!canAct && (
                <div className="td-no-perm" style={{ marginTop: '16px' }}>
                  Only assigned teammates or admins can check off milestones.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TaskDetail;
