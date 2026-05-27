import { useState } from 'react';
import Layout from '../components/Layout';
import CreateCourseModal from '../components/CreateCourseModal';
import { useApp, ROLE_LABELS } from '../context/AppContext';
import { statusConfig } from '../data/mockData';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';
const fmtDT   = (iso) => iso ? new Date(iso).toLocaleString('ar-SA') : '—';

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || {};
  return <span className={`badge ${cfg.badge}`}><span className="badge-dot" />{cfg.label}</span>;
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ rows, unit = '', maxVal }) {
  const max = maxVal || Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="bar-chart">
      {rows.map((r, i) => (
        <div key={i} className="bar-row">
          <div className="bar-label" title={r.label}>{r.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${(r.value / max) * 100}%`,
              background: r.color || 'var(--primary)',
              animationDelay: `${i * 0.08}s`,
            }} />
          </div>
          <div className="bar-val">{r.value}{unit}</div>
        </div>
      ))}
    </div>
  );
}

// ── Quality ring ─────────────────────────────────────────────────────────────
function ScoreCircle({ score, size = 64 }) {
  const radius = size / 2 - 5;
  const circ   = 2 * Math.PI * radius;
  const fill   = (score / 100) * circ;
  const color  = score >= 90 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--gray)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="13" fontWeight="800"
            fill={color} fontFamily="Cairo,Tahoma">{score}%</text>
    </svg>
  );
}

// ── KPI Dashboard ─────────────────────────────────────────────────────────────
function KPIDashboard() {
  const { courses } = useApp();
  const total       = courses.length;
  const onTime      = courses.filter(c => c.daysLate === 0 && c.status !== 'pending_upload').length;
  const onTimeRate  = total > 0 ? Math.round((onTime / total) * 100) : 0;
  const scored      = courses.filter(c => c.qualityScore > 0);
  const avgQuality  = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.qualityScore, 0) / scored.length) : 0;
  const needsAtt    = courses.filter(c => ['has_errors','pending_upload','uploaded'].includes(c.status)).length;
  const completed   = courses.filter(c => c.status === 'lms_uploaded').length;

  const delayRows = courses.map(c => ({
    label: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
    value: c.daysLate,
    color: c.daysLate === 0 ? 'var(--success)' : c.daysLate <= 2 ? 'var(--warning)' : 'var(--danger)',
  }));
  const qualityRows = scored.map(c => ({
    label: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
    value: c.qualityScore,
    color: c.qualityScore >= 90 ? 'var(--success)' : c.qualityScore >= 70 ? 'var(--warning)' : 'var(--danger)',
  }));
  const statusDist = Object.entries(
    courses.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([s, n]) => ({ label: statusConfig[s]?.label || s, value: n }));

  return (
    <div className="animate-up">
      <div className="page-header">
        <h1>لوحة المؤشرات</h1>
      </div>

      <div className="stats-grid">
        {[
          { label: 'إجمالي الأنشطة', value: total, sub: 'نشاط تدريبي', icon: '📋', color: 'var(--primary)' },
          { label: 'تسليم في الوقت', value: `${onTimeRate}%`, sub: `${onTime} من ${total}`, icon: '⏱', color: onTimeRate >= 70 ? 'var(--success)' : 'var(--danger)' },
          { label: 'متوسط جودة البيانات', value: `${avgQuality}%`, sub: 'متوسط عام', icon: '🎯', color: avgQuality >= 80 ? 'var(--success)' : 'var(--warning)' },
          { label: 'تحتاج تدخلاً', value: needsAtt, sub: `${completed} مكتملة`, icon: needsAtt > 0 ? '⚠️' : '✅', color: needsAtt > 0 ? 'var(--danger)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} className="stat-card" style={{ borderRightColor: k.color }}>
            <div className="stat-icon">{k.icon}</div>
            <div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value">{k.value}</div>
              <div className="stat-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card">
          <div className="card-header"><h3>أيام التأخير</h3></div>
          <div className="card-body"><BarChart rows={delayRows} unit=" يوم" /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>جودة البيانات</h3></div>
          <div className="card-body"><BarChart rows={qualityRows} unit="%" maxVal={100} /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
        <div className="card">
          <div className="card-header"><h3>توزيع الحالات</h3></div>
          <div className="card-body"><BarChart rows={statusDist} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3>جودة كل نشاط</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              {scored.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: 76 }}>
                  <ScoreCircle score={c.qualityScore} />
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.3 }}>
                    {c.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                </div>
              ))}
              {scored.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>لا توجد بيانات بعد</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── All Courses Table ─────────────────────────────────────────────────────────
function AllCourses({ onCreateCourse }) {
  const { courses } = useApp();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('startDate');

  const filters = [
    { key: 'all', label: 'الكل' },
    { key: 'pending_upload', label: 'لم يُرفع' },
    { key: 'has_errors', label: 'أخطاء' },
    { key: 'approved', label: 'معتمدة' },
    { key: 'lms_uploaded', label: 'مكتمل' },
  ];

  const visible = (filter === 'all' ? courses : courses.filter(c => c.status === filter))
    .slice().sort((a, b) => {
      if (sortBy === 'startDate') return a.startDate.localeCompare(b.startDate);
      if (sortBy === 'quality')   return b.qualityScore - a.qualityScore;
      if (sortBy === 'delay')     return b.daysLate - a.daysLate;
      return 0;
    });

  return (
    <div className="animate-up">
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>جميع الأنشطة</h1></div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={onCreateCourse}>➕ نشاط جديد</button>
            {[{ key: 'startDate', label: 'التاريخ' }, { key: 'quality', label: 'الجودة' }, { key: 'delay', label: 'التأخير' }].map(s => (
              <button key={s.key} className={`filter-tab ${sortBy === s.key ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setSortBy(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="filter-tabs mb-16">
        {filters.map(f => (
          <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} {f.key !== 'all' && <span style={{ fontWeight: 800, marginRight: 3 }}>{courses.filter(c => c.status === f.key).length}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>النشاط</th><th>تاريخ البدء</th><th>المشاركون</th>
                <th>الحالة</th><th>التأخير</th><th>جودة البيانات</th><th>آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const lastUpdate = c.exportedAt || c.receivedAt || c.approvedAt || c.uploadedAt;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{c.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{c.code}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{fmtDate(c.startDate)}</td>
                    <td>
                      <div style={{ fontSize: '13px' }}>👥 {c.participants.length}</div>
                      <div className="progress-bar mt-4" style={{ width: '80px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min((c.participants.length / c.capacity) * 100, 100)}%` }} />
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.daysLate === 0
                        ? <span className="badge badge-approved">في الوقت</span>
                        : <span className="badge badge-errors">⏰ {c.daysLate} أيام</span>}
                    </td>
                    <td>
                      {c.qualityScore > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar" style={{ width: '80px' }}>
                            <div className="progress-fill" style={{
                              width: `${c.qualityScore}%`,
                              background: c.qualityScore >= 90 ? 'var(--success)' : c.qualityScore >= 70 ? 'var(--warning)' : 'var(--danger)',
                            }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700',
                            color: c.qualityScore >= 90 ? 'var(--success)' : c.qualityScore >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                            {c.qualityScore}%
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-light)' }}>{lastUpdate ? fmtDT(lastUpdate) : '—'}</td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '14px' }}>لا توجد أنشطة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Data Quality ──────────────────────────────────────────────────────────────
function DataQuality() {
  const { courses } = useApp();
  const uploaded = courses.filter(c => c.participants.length > 0);
  const errLabels = { invalid_email: 'بريد إلكتروني', invalid_phone: 'رقم جوال', invalid_id: 'رقم هوية', missing_org: 'جهة مفقودة', duplicate: 'مكرر' };

  return (
    <div className="animate-up">
      <div className="page-header"><h1>جودة البيانات</h1></div>
      {uploaded.map(c => {
        const errs   = c.participants.filter(p => p.errors.length > 0);
        const counts = c.participants.flatMap(p => p.errors).reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {});
        return (
          <div key={c.id} className="card mb-16">
            <div className="card-header">
              <div>
                <h3>{c.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.code}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="progress-bar" style={{ width: '100px' }}>
                  <div className="progress-fill" style={{
                    width: `${c.qualityScore}%`,
                    background: c.qualityScore >= 90 ? 'var(--success)' : c.qualityScore >= 70 ? 'var(--warning)' : 'var(--danger)',
                  }} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '15px',
                  color: c.qualityScore >= 90 ? 'var(--success)' : c.qualityScore >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                  {c.qualityScore}%
                </span>
                <StatusBadge status={c.status} />
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {[
                  { val: c.participants.length, label: 'إجمالي المشاركين', bg: 'var(--white)', bd: 'var(--border)', clr: 'var(--text)' },
                  { val: c.participants.length - errs.length, label: 'بيانات صحيحة', bg: 'var(--success-light)', bd: '#b6dfc4', clr: 'var(--success)' },
                  { val: errs.length, label: 'تحتاج تصحيح', bg: 'var(--danger-light)', bd: '#e8c0cc', clr: 'var(--danger)' },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${item.bd}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: item.clr }}>{item.val}</div>
                    <div style={{ fontSize: '12px', color: item.clr }}>{item.label}</div>
                  </div>
                ))}
                {Object.entries(counts).map(([type, cnt]) => (
                  <div key={type} style={{ background: 'var(--warning-light)', borderRadius: 8, padding: '10px 14px', border: '1px solid #fcd34d', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--warning)' }}>{cnt}</div>
                    <div style={{ fontSize: '12px', color: 'var(--warning)' }}>{errLabels[type] || type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {uploaded.length === 0 && (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px', fontSize: '14px' }}>لا توجد بيانات مرفوعة بعد</div></div>
      )}
    </div>
  );
}

// ── User Modal (Add / Edit) ───────────────────────────────────────────────────
function UserModal({ title, user, onClose, onSubmit, isEdit }) {
  const [form, setForm]       = useState({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'business_dev' });
  const [errors, setErrors]   = useState({});
  const [srvErr, setSrvErr]   = useState('');

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); setSrvErr(''); };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)  e.name     = 'الاسم مطلوب';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد غير صالح';
    if (!isEdit && (!form.password || form.password.length < 6)) e.password = 'كلمة المرور 6 أحرف على الأقل';
    if (isEdit && form.password && form.password.length < 6)     e.password = 'كلمة المرور 6 أحرف على الأقل';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const data = { ...form };
    if (isEdit && !form.password) delete data.password;
    const result = onSubmit(data);
    if (result && !result.ok) setSrvErr(result.error);
  };

  const inp = (hasErr) => ({
    width: '100%', boxSizing: 'border-box', padding: '10px 13px',
    border: `1.5px solid ${hasErr ? '#fca5a5' : 'var(--border)'}`,
    borderRadius: '9px', fontSize: '13.5px',
    fontFamily: 'Cairo, Tahoma, sans-serif', outline: 'none',
    color: 'var(--text)', transition: 'border-color 0.18s',
  });

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Name */}
          <div className="form-group">
            <label className="form-label">الاسم</label>
            <input style={inp(errors.name)} value={form.name}
                   onChange={e => set('name')(e.target.value)}
                   placeholder="مثال: نايف سعيد"
                   onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                   onBlur={e  => { e.target.style.borderColor = errors.name ? '#fca5a5' : 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            {errors.name && <div className="form-error">⚠ {errors.name}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">البريد الإلكتروني</label>
            <input style={{ ...inp(errors.email), direction: 'ltr', textAlign: 'left' }}
                   type="email" value={form.email}
                   onChange={e => set('email')(e.target.value)}
                   placeholder="example@nauss.edu.sa"
                   onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                   onBlur={e  => { e.target.style.borderColor = errors.email ? '#fca5a5' : 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            {errors.email && <div className="form-error">⚠ {errors.email}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              كلمة المرور
              {isEdit && <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginRight: '6px' }}>(اتركها فارغة للإبقاء على الحالية)</span>}
            </label>
            <input style={{ ...inp(errors.password), direction: 'ltr', textAlign: 'left' }}
                   type="password" value={form.password}
                   onChange={e => set('password')(e.target.value)}
                   placeholder="••••••••"
                   onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                   onBlur={e  => { e.target.style.borderColor = errors.password ? '#fca5a5' : 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            {errors.password && <div className="form-error">⚠ {errors.password}</div>}
          </div>

          {/* Role */}
          <div className="form-group">
            <label className="form-label">الدور</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { value: 'business_dev', label: 'تطوير أعمال' },
                { value: 'training_ops', label: 'عمليات تدريب' },
              ].map(r => (
                <button key={r.value} type="button"
                        onClick={() => set('role')(r.value)}
                        style={{
                          flex: 1, padding: '11px 10px', borderRadius: '9px',
                          border: `2px solid ${form.role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.role === r.value ? 'rgba(42,99,100,0.07)' : 'white',
                          cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                          color: form.role === r.value ? 'var(--primary)' : 'var(--text-light)',
                          fontFamily: 'Cairo, Tahoma, sans-serif', transition: 'all 0.18s',
                        }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {srvErr && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: 9, padding: '10px 14px', fontSize: '13px', color: 'var(--danger)', display: 'flex', gap: 8 }}>
              <span>⚠</span>{srvErr}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSubmit}>حفظ</button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── Users Management ──────────────────────────────────────────────────────────
function UsersManagement() {
  const { users, updateUser, deleteUser, createUser } = useApp();
  const [editUser, setEditUser]     = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const roleBadge = (role) => ({
    business_dev: { label: 'تطوير أعمال', bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
    training_ops: { label: 'عمليات تدريب', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  })[role] || {};

  return (
    <div className="animate-up">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>إدارة المستخدمين</h1>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            + مستخدم جديد
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rb = roleBadge(u.role);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '800', flexShrink: 0,
                        }}>
                          {u.name[0]}
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '13.5px' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '13px', color: 'var(--text-light)' }}>{u.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        background: rb.bg, color: rb.color, border: `1px solid ${rb.border}`,
                      }}>
                        {rb.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-light)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setEditUser({ ...u, password: '' })}
                          className="btn btn-ghost btn-sm"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setConfirmDel(u)}
                          style={{
                            background: 'transparent', border: '1px solid #fecaca',
                            borderRadius: '7px', color: '#b91c1c',
                            fontSize: '12px', fontWeight: '600',
                            padding: '5px 10px', cursor: 'pointer',
                            fontFamily: 'Cairo, Tahoma, sans-serif',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px', fontSize: '14px' }}>
                    لا يوجد مستخدمون مسجلون — ادع الموظفين للتسجيل أو أضفهم يدوياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <UserModal
          title="تعديل بيانات المستخدم"
          user={editUser}
          isEdit
          onClose={() => setEditUser(null)}
          onSubmit={(data) => {
            updateUser(editUser.id, data);
            setEditUser(null);
            return { ok: true };
          }}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <UserModal
          title="إضافة مستخدم جديد"
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => {
            const result = createUser(data);
            if (result.ok) setShowAdd(false);
            return result;
          }}
        />
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>تأكيد الحذف</h3>
              <button className="close-btn" onClick={() => setConfirmDel(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
                <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                  هل تريد حذف المستخدم <strong>{confirmDel.name}</strong>؟
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  لا يمكن التراجع عن هذا الإجراء.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => { deleteUser(confirmDel.id); setConfirmDel(null); }}
                style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
              >
                نعم، احذف
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function ManagerPage() {
  const [view, setView]         = useState('dashboard');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <Layout
      activeView={view}
      onNavigate={setView}
      topBarContent={
        view !== 'users'
          ? <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>➕ نشاط جديد</button>
          : null
      }
    >
      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} />}
      {view === 'dashboard' && <KPIDashboard />}
      {view === 'courses'   && <AllCourses onCreateCourse={() => setShowCreate(true)} />}
      {view === 'quality'   && <DataQuality />}
      {view === 'users'     && <UsersManagement />}
    </Layout>
  );
}
