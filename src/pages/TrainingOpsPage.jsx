import { useState } from 'react';
import { utils, writeFile } from 'xlsx';
import Layout from '../components/Layout';
import EditableTable from '../components/EditableTable';
import { useApp } from '../context/AppContext';
import { statusConfig } from '../data/mockData';

const fmtD  = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';
const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('ar-SA') : '—';

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || {};
  return <span className={`badge ${cfg.badge}`}><span className="badge-dot" />{cfg.label}</span>;
}

// ── LMS Upload Result Modal ───────────────────────────────────────────────────
function LMSResultModal({ course, onClose }) {
  const { recordLMSUpload } = useApp();
  const [result, setResult] = useState('success');
  const [notes, setNotes] = useState('');
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>تسجيل نتيجة الرفع على LMS</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-info mb-12">
            <span>ℹ️</span>
            <div>الدورة: <strong>{course.name}</strong> — {course.participants.length} مشارك</div>
          </div>
          <div className="form-group">
            <label className="form-label">نتيجة الرفع</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[{ v: 'success', label: '✅ ناجح', c: 'var(--success)', l: 'var(--success-light)' },
                { v: 'failed',  label: '❌ فاشل',  c: 'var(--danger)',  l: 'var(--danger-light)' }].map(o => (
                <button key={o.v} onClick={() => setResult(o.v)} style={{
                  flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${result === o.v ? o.c : 'var(--border)'}`,
                  background: result === o.v ? o.l : 'white',
                  fontSize: '15px', fontWeight: '700', color: result === o.v ? o.c : 'var(--text-light)',
                  fontFamily: 'Cairo, Tahoma', transition: 'all 0.18s',
                }}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ملاحظات{result === 'failed' && ' — سبب الفشل'}</label>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={result === 'failed' ? 'اكتب سبب الفشل أو الخطأ الذي ظهر...' : 'ملاحظات إضافية (اختياري)'} />
          </div>
        </div>
        <div className="modal-footer">
          <button className={`btn ${result === 'success' ? 'btn-success' : 'btn-danger'}`}
            onClick={() => { recordLMSUpload(course.id, result, notes); onClose(); }}>
            {result === 'success' ? '✅ تأكيد الرفع الناجح' : '❌ تسجيل الفشل'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── LMS Excel Export — matches mdl_training_schedule_students_ar.xlsx format ──
const exportToExcel = (course) => {
  // Split full Arabic name into parts for LMS columns
  const splitName = (fullName = '') => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first  = parts[0]  || '';
    const last   = parts.length > 1 ? parts[parts.length - 1] : '';
    const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    return { first, last, middle };
  };

  // Exact 9 column headers matching LMS template
  const headers = [
    'الاسم الأول',
    'اسم العائلة',
    'الاسم الأوسط',
    'اسم العائلة',
    'البريد الإلكتروني',
    'جوال',
    'المستفيد',
    'قطاع',
    'نوع السعر',
  ];

  const rows = course.participants.map(p => {
    const { first, last, middle } = splitName(p.name);
    return [
      first,          // الاسم الأول
      last,           // اسم العائلة
      middle,         // الاسم الأوسط
      last,           // اسم العائلة (repeated per LMS template)
      p.email  || '',
      p.phone  || '',
      1,              // المستفيد — constant
      p.organization || '',  // قطاع
      'لا رسوم',      // نوع السعر — constant
    ];
  });

  const ws = utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 20 }, // الاسم الأول
    { wch: 20 }, // اسم العائلة
    { wch: 20 }, // الاسم الأوسط
    { wch: 20 }, // اسم العائلة
    { wch: 32 }, // البريد الإلكتروني
    { wch: 16 }, // جوال
    { wch: 10 }, // المستفيد
    { wch: 26 }, // قطاع
    { wch: 12 }, // نوع السعر
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Sheet1');

  wb.Props = {
    Title: `mdl_participants_${course.code}`,
    CreatedDate: new Date(),
  };

  const date = new Date().toISOString().slice(0, 10);
  writeFile(wb, `mdl_participants_${course.code}_${date}.xlsx`);
};

// ── Course Review ─────────────────────────────────────────────────────────────
function CourseReview({ course, onBack }) {
  const { receiveCourse, exportLMS } = useApp();
  const [showResult, setShowResult] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      exportToExcel(course);
      // Update status to exported
      exportLMS(course.id);
      setExporting(false);
    }, 400);
  };

  return (
    <div className="animate-up">
      {showResult && <LMSResultModal course={course} onClose={() => setShowResult(false)} />}

      <button className="back-btn" onClick={onBack}>← القوائم المعتمدة</button>

      {/* Header */}
      <div className="detail-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{course.code}</div>
            <h2>{course.name}</h2>
          </div>
          <StatusBadge status={course.status} />
        </div>
        <div className="detail-header-meta" style={{ marginTop: '10px' }}>
          <div className="detail-meta-item">📅 {fmtD(course.startDate)} — {fmtD(course.endDate)}</div>
          <div className="detail-meta-item">📍 {course.location}</div>
          <div className="detail-meta-item">👥 {course.participants.length} مشارك</div>
          <div className="detail-meta-item">✅ اعتُمد {fmtDT(course.approvedAt)}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {course.status === 'approved' && (
          <button className="btn btn-primary" onClick={() => receiveCourse(course.id)}>
            📬 تأكيد الاستلام
          </button>
        )}
        {['received', 'exported'].includes(course.status) && (
          <button className="btn btn-gold" onClick={handleExport} disabled={exporting}>
            {exporting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ التصدير...</>
              : '📥 تصدير ملف Excel لـ LMS'}
          </button>
        )}
        {course.status === 'exported' && (
          <button className="btn btn-primary" onClick={() => setShowResult(true)}>
            📊 تسجيل نتيجة الرفع على LMS
          </button>
        )}
        {course.status === 'lms_uploaded' && (
          <div className={`alert ${course.lmsUploadResult === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ margin: 0 }}>
            {course.lmsUploadResult === 'success' ? '🎓 تم الرفع على LMS بنجاح' : '❌ فشل الرفع على LMS'}
          </div>
        )}
        {/* Always allow re-export */}
        {['exported', 'lms_uploaded'].includes(course.status) && (
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            ↩ تصدير مرة أخرى
          </button>
        )}
      </div>

      {/* Participant table (read-only for review) */}
      <div className="card">
        <div className="card-header">
          <h3>مراجعة قائمة المشاركين ({course.participants.length})</h3>
        </div>
        <div className="card-body">
          <EditableTable rows={course.participants} onChange={() => {}} readOnly={true} />
        </div>
      </div>

      {/* Audit log */}
      {course.auditLog?.length > 0 && (
        <div className="card mt-16">
          <div className="card-header"><h3>📋 سجل المراجعة</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <tbody>
                {course.auditLog.slice().reverse().map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', width: 180 }}>{new Date(e.at).toLocaleString('ar-SA')}</td>
                    <td>{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Approved List ─────────────────────────────────────────────────────────────
function ApprovedList({ onSelect }) {
  const { courses } = useApp();
  const [filter, setFilter] = useState('all');

  const opsCourses = courses.filter(c => ['approved','received','exported','lms_uploaded'].includes(c.status));
  const visible = filter === 'all' ? opsCourses : opsCourses.filter(c => c.status === filter);

  const filters = [
    { key: 'all',         label: 'الكل' },
    { key: 'approved',    label: 'بانتظار الاستلام' },
    { key: 'received',    label: 'جاهزة للتصدير' },
    { key: 'exported',    label: 'تم التصدير' },
    { key: 'lms_uploaded',label: 'مكتملة' },
  ];

  return (
    <div className="animate-up">
      <div className="page-header-row mb-16">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800' }}>القوائم المعتمدة</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-light)', marginTop: '3px' }}>
            القوائم الجاهزة لمراجعتها وتصديرها إلى منصة LMS
          </p>
        </div>
      </div>

      <div className="filter-tabs mb-16">
        {filters.map(f => (
          <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div style={{ fontSize: '15px', fontWeight: '700' }}>لا توجد قوائم معتمدة بعد</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>انتظر اعتماد إدارة تطوير الأعمال للقوائم</div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الدورة</th>
                  <th>تاريخ البدء</th>
                  <th>عدد المشاركين</th>
                  <th>تاريخ الاعتماد</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(c.id)}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{c.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{c.code}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{fmtD(c.startDate)}</td>
                    <td style={{ fontSize: '13px' }}>👥 {c.participants.length}</td>
                    <td style={{ fontSize: '13px' }}>{fmtDT(c.approvedAt)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.status === 'approved'    && <button className="btn btn-primary btn-xs" onClick={() => onSelect(c.id)}>استلام</button>}
                        {c.status === 'received'    && <button className="btn btn-gold btn-xs" onClick={(e) => { e.stopPropagation(); exportToExcel(c); }}>📥 Excel</button>}
                        {c.status === 'exported'    && <button className="btn btn-outline btn-xs" onClick={() => onSelect(c.id)}>تسجيل النتيجة</button>}
                        {c.status === 'lms_uploaded' && (
                          <span style={{ fontSize: '12px', fontWeight: '700', color: c.lmsUploadResult === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                            {c.lmsUploadResult === 'success' ? '✅ ناجح' : '❌ فاشل'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const { courses, currentUser } = useApp();
  const pending  = courses.filter(c => c.status === 'approved').length;
  const ready    = courses.filter(c => c.status === 'received').length;
  const exported = courses.filter(c => c.status === 'exported').length;
  const done     = courses.filter(c => c.status === 'lms_uploaded').length;

  return (
    <div className="animate-up">
      <div className="page-header-row mb-20">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800' }}>مرحباً، {currentUser?.name} 👋</h1>
          <p style={{ color: 'var(--text-light)', marginTop: '4px' }}>استلام القوائم المعتمدة وتصديرها إلى منصة LMS</p>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: 'بانتظار الاستلام', value: pending,  icon: '📬', bg: '#dbeafe', border: 'var(--info)' },
          { label: 'جاهزة للتصدير',   value: ready,    icon: '📂', bg: 'var(--warning-light)', border: 'var(--warning)' },
          { label: 'تم تصدير Excel',   value: exported, icon: '📥', bg: '#ecfdf5', border: '#065f46' },
          { label: 'مكتملة على LMS',   value: done,     icon: '🎓', bg: '#e0f2fe', border: '#0369a1' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderRightColor: s.border, cursor: 'pointer' }} onClick={() => onNavigate('approved')}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending action */}
      {courses.filter(c => ['approved','received','exported'].includes(c.status)).length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3>📋 يحتاج إجراء الآن</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('approved')}>عرض الكل</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead><tr><th>الدورة</th><th>تاريخ البدء</th><th>الحالة</th><th>المطلوب</th></tr></thead>
              <tbody>
                {courses.filter(c => ['approved','received','exported'].includes(c.status)).map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('course_' + c.id)}>
                    <td style={{ fontWeight: '700' }}>{c.name}</td>
                    <td style={{ fontSize: '13px' }}>{fmtD(c.startDate)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                      {c.status === 'approved'  && '📬 استلام القائمة'}
                      {c.status === 'received'  && '📥 تصدير ملف Excel'}
                      {c.status === 'exported'  && '📊 تسجيل نتيجة الرفع'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-success">
          <span>✅</span>لا توجد مهام معلقة حالياً
        </div>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function History() {
  const { courses } = useApp();
  const done = courses.filter(c => c.status === 'lms_uploaded');
  return (
    <div className="animate-up">
      <div className="page-header"><h1>سجل التصدير</h1><p style={{ color: 'var(--text-light)', marginTop: 4 }}>الدورات التي اكتمل رفعها على LMS</p></div>
      {done.length === 0
        ? <div className="empty-state"><div className="empty-icon">📁</div><div>لا يوجد سجل بعد</div></div>
        : (
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead><tr><th>الدورة</th><th>تاريخ البدء</th><th>المشاركون</th><th>تاريخ الرفع</th><th>النتيجة</th></tr></thead>
                <tbody>
                  {done.map(c => (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight: '700' }}>{c.name}</div><div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{c.code}</div></td>
                      <td style={{ fontSize: '13px' }}>{fmtD(c.startDate)}</td>
                      <td>👥 {c.participants.length}</td>
                      <td style={{ fontSize: '13px' }}>{fmtDT(c.lmsUploadedAt)}</td>
                      <td><span className={`badge ${c.lmsUploadResult === 'success' ? 'badge-approved' : 'badge-errors'}`}>{c.lmsUploadResult === 'success' ? '✅ ناجح' : '❌ فاشل'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TrainingOpsPage() {
  const { courses } = useApp();
  const [view, setView] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);

  const handleNavigate = (v) => {
    if (v.startsWith('course_')) { setSelectedId(v.replace('course_', '')); setView('course_detail'); }
    else { setView(v); setSelectedId(null); }
  };

  return (
    <Layout activeView={view === 'course_detail' ? 'approved' : view} onNavigate={handleNavigate}>
      {view === 'dashboard'    && <Dashboard onNavigate={handleNavigate} />}
      {view === 'approved'     && <ApprovedList onSelect={id => handleNavigate('course_' + id)} />}
      {view === 'history'      && <History />}
      {view === 'course_detail' && selectedId && (
        <CourseReview course={courses.find(c => c.id === selectedId)} onBack={() => setView('approved')} />
      )}
    </Layout>
  );
}
