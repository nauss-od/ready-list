import { useState } from 'react';
import Layout from '../components/Layout';
import EditableTable, { countErrors } from '../components/EditableTable';
import UploadPasteZone from '../components/UploadPasteZone';
import CreateCourseModal from '../components/CreateCourseModal';
import { useApp } from '../context/AppContext';
import { statusConfig } from '../data/mockData';

const fmtD = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || {};
  return (
    <span className={`badge ${cfg.badge}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  );
}

/* ── Step indicator for course editor ──────────────────────────────────────── */
function WorkflowBar({ status }) {
  const steps = [
    { key: ['pending_upload'], label: 'رفع الأسماء', num: 1 },
    { key: ['uploaded', 'has_errors', 'corrected'], label: 'مراجعة وتصحيح', num: 2 },
    { key: ['approved', 'received', 'exported', 'lms_uploaded'], label: 'اعتماد وإحالة', num: 3 },
  ];

  const stepIdx = steps.findIndex(s => s.key.includes(status));

  return (
    <div className="workflow-steps animate-in">
      {steps.map((s, i) => {
        const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending';
        return (
          <div key={s.num} className="workflow-step">
            <div className={`wf-num ${state}`}>
              {state === 'done' ? '✓' : s.num}
            </div>
            <div className="wf-texts">
              <div className="wf-title">{s.label}</div>
              <div className={`wf-status ${state}`}>
                {state === 'done' ? 'مكتملة' : state === 'active' ? 'الخطوة الحالية' : 'لاحقاً'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Approve modal ──────────────────────────────────────────────────────────── */
function ApproveModal({ course, onClose }) {
  const { approveCourse } = useApp();
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>اعتماد القائمة وإحالتها</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-warning">
            <span style={{ fontSize: 18 }}>⚠</span>
            <div>بعد الاعتماد، تُحال القائمة إلى إدارة عمليات التدريب ولا يمكن تعديلها.</div>
          </div>
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: '800', marginBottom: '10px', fontSize: '14px' }}>ملخص ما سيُرسل:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px' }}>
              <div>📋 <strong>النشاط:</strong> {course.name}</div>
              <div>📅 <strong>التاريخ:</strong> {fmtD(course.startDate)}</div>
              <div>📍 <strong>المقر:</strong> {course.location}</div>
              <div>👥 <strong>عدد المشاركين:</strong> {course.participants.length} مشارك</div>
              {course.nominationLetter && <div>📄 <strong>خطاب الترشيح:</strong> {course.nominationLetter}</div>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-success" onClick={() => { approveCourse(course.id); onClose(); }}>
            ✅ اعتماد وإحالة لعمليات التدريب
          </button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ── Audit log ──────────────────────────────────────────────────────────────── */
function AuditLog({ log = [] }) {
  const [open, setOpen] = useState(false);
  if (!log.length) return null;
  return (
    <div style={{ marginTop: '16px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)}>
        📋 سجل العمليات ({log.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="card mt-8 animate-in">
          <div className="card-body" style={{ padding: '8px 16px' }}>
            {log.slice().reverse().map((e, i) => (
              <div key={i} className="audit-row">
                <span className="audit-time">{new Date(e.at).toLocaleString('ar-SA')}</span>
                <span>{e.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Course editor ──────────────────────────────────────────────────────────── */
function CourseEditor({ courseId, onBack }) {
  const { courses, uploadParticipants } = useApp();
  const course = courses.find(c => c.id === courseId);

  const [rows,        setRows]        = useState(() => course?.participants || []);
  const [showUpload,  setShowUpload]  = useState(!course?.participants?.length);
  const [showApprove, setShowApprove] = useState(false);
  const [saved,       setSaved]       = useState(true);

  if (!course) return null;

  const isEditable = ['pending_upload', 'uploaded', 'has_errors', 'corrected'].includes(course.status);
  const isApproved = ['approved', 'received', 'exported', 'lms_uploaded'].includes(course.status);
  const errCount   = countErrors(rows);
  const canApprove = rows.length > 0 && errCount === 0 && isEditable;

  const handleRowsChange = (newRows) => {
    setRows(newRows);
    setSaved(false);
    clearTimeout(window._saveTimer);
    window._saveTimer = setTimeout(() => {
      uploadParticipants(course.id, newRows, course.sourceFile || 'تعديل يدوي');
      setSaved(true);
    }, 900);
  };

  const handleImport = (participants) => {
    const merged = [...rows, ...participants];
    setRows(merged);
    setShowUpload(false);
    uploadParticipants(course.id, merged, 'ملف مستورد');
    setSaved(true);
  };

  return (
    <div className="animate-up">
      {showApprove && (
        <ApproveModal
          course={{ ...course, participants: rows }}
          onClose={() => setShowApprove(false)}
        />
      )}

      <button className="back-btn" onClick={onBack}>← العودة للقائمة</button>

      {/* Course header */}
      <div className="detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', fontWeight: '700' }}>
              {course.code}
            </div>
            <h2>{course.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={course.status} />
            {!saved && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>⟳ حفظ...</span>}
            {saved && rows.length > 0 && <span style={{ fontSize: '12px', color: '#86efac' }}>✓ محفوظ</span>}
          </div>
        </div>
        <div className="detail-header-meta">
          <div className="detail-meta-item">📅 {fmtD(course.startDate)}{course.endDate && ` — ${fmtD(course.endDate)}`}</div>
          <div className="detail-meta-item">📍 {course.location}</div>
          <div className="detail-meta-item">👥 {rows.length} / {course.capacity} مشارك</div>
          {course.nominationLetter && <div className="detail-meta-item">📄 {course.nominationLetter}</div>}
        </div>
      </div>

      {/* Workflow bar */}
      <WorkflowBar status={course.status} />

      {/* Post-approval notice */}
      {isApproved && (
        <div className="alert alert-success mb-16">
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            {course.status === 'approved'     && `اعتُمدت القائمة وأُحيلت لعمليات التدريب — ${new Date(course.approvedAt).toLocaleString('ar-SA')}`}
            {course.status === 'received'     && 'استلمت إدارة عمليات التدريب القائمة وتجري مراجعتها'}
            {course.status === 'exported'     && 'صدّرت عمليات التدريب ملف LMS — بانتظار تأكيد الرفع'}
            {course.status === 'lms_uploaded' && `رُفعت على LMS — ${course.lmsUploadResult === 'success' ? 'بنجاح ✅' : 'فشل ❌'}`}
          </div>
        </div>
      )}

      {/* Upload prompt hero — shown when no participants yet */}
      {showUpload && isEditable && rows.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '16px',
          border: '2px dashed #93c5fd',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
        }}>
          <div style={{ fontSize: '48px', flexShrink: 0 }}>📂</div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#1d4ed8', marginBottom: '4px' }}>
              الخطوة التالية: ارفع قائمة الأسماء
            </div>
            <div style={{ fontSize: '13px', color: '#1d4ed8', opacity: 0.75 }}>
              ارفع ملف Excel الذي وصلك بالإيميل، أو الصق الأسماء مباشرة من الإيميل
            </div>
          </div>
        </div>
      )}

      {/* Upload zone */}
      {showUpload && isEditable && (
        <div style={{ marginBottom: '20px' }}>
          <UploadPasteZone
            onData={handleImport}
            onCancel={rows.length > 0 ? () => setShowUpload(false) : null}
          />
        </div>
      )}

      {/* Participants table */}
      {(rows.length > 0 || !showUpload) && (
        <div className="card">
          <div className="card-header">
            <h3>
              {isEditable ? '✏ قائمة المشاركين — قابلة للتعديل' : '👁 قائمة المشاركين'}
              {rows.length > 0 && (
                <span style={{ marginRight: '8px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px' }}>
                  ({rows.length})
                  {errCount > 0 && <span style={{ color: 'var(--danger)', marginRight: '6px' }}> — {errCount} أخطاء</span>}
                </span>
              )}
            </h3>
            {isEditable && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUpload(!showUpload)}>
                {showUpload ? 'إخفاء' : '📎 استيراد / إضافة'}
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <div className="empty-title">لم يُرفع ملف الأسماء بعد</div>
                <div className="empty-hint">ارفع ملف Excel أو الصق البيانات من وورد أو إيميل</div>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📎 رفع ملف الأسماء</button>
              </div>
            ) : (
              <EditableTable
                rows={rows}
                onChange={isEditable ? handleRowsChange : undefined}
                readOnly={!isEditable}
              />
            )}
          </div>
        </div>
      )}

      {/* Approve button */}
      {isEditable && rows.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
          {errCount > 0 && (
            <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>
              ⚠ {errCount} سطر بأخطاء — صحّح البيانات أولاً
            </span>
          )}
          <button
            className="btn btn-success"
            disabled={!canApprove}
            onClick={() => setShowApprove(true)}
            style={{ fontSize: '14px', padding: '10px 22px' }}
          >
            ✅ اعتماد وإحالة لعمليات التدريب
          </button>
        </div>
      )}

      <AuditLog log={course.auditLog} />
    </div>
  );
}

/* ── Course list ────────────────────────────────────────────────────────────── */
function CourseList({ onSelect, onCreate }) {
  const { courses } = useApp();
  const [filter, setFilter] = useState('all');

  const filters = [
    { key: 'all',           label: 'الكل',          match: () => true },
    { key: 'pending',       label: 'بانتظار الأسماء', match: c => c.status === 'pending_upload' },
    { key: 'has_errors',    label: 'تحتاج تصحيح',  match: c => c.status === 'has_errors' },
    { key: 'ready',         label: 'جاهزة للاعتماد', match: c => c.status === 'corrected' },
    { key: 'approved',      label: 'معتمدة',        match: c => ['approved','received','exported','lms_uploaded'].includes(c.status) },
  ];

  const visible = courses.filter(c => {
    const f = filters.find(f => f.key === filter);
    return f ? f.match(c) : true;
  });

  const getCount = (f) => courses.filter(c => {
    const fd = filters.find(x => x.key === f);
    return fd ? fd.match(c) : true;
  }).length;

  return (
    <div className="animate-up">

      {/* ── Hero Create Button ─────────────────────────────────────── */}
      <div
        onClick={onCreate}
        style={{
          background: 'linear-gradient(135deg, #2A6364 0%, #1a3f40 100%)',
          borderRadius: '16px',
          padding: '22px 28px',
          marginBottom: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          boxShadow: '0 8px 32px rgba(42,99,100,0.38)',
          border: '1px solid rgba(199,176,140,0.18)',
          transition: 'all 0.22s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(42,99,100,0.50)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(42,99,100,0.38)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{
          width: 60, height: 60, flexShrink: 0,
          background: 'rgba(255,255,255,0.14)',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>📋</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: '900', marginBottom: '4px' }}>
            إنشاء نشاط تدريبي جديد
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
            حدد اسم النشاط والتاريخ، ثم ارفع قائمة الأسماء مباشرة
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.16)',
          borderRadius: '10px',
          padding: '11px 22px',
          color: 'white',
          fontWeight: '900',
          fontSize: '15px',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.22)',
        }}>+ إنشاء</div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>
          الأنشطة التدريبية
          <span style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '13px', marginRight: '8px' }}>({courses.length})</span>
        </h2>
      </div>

      <div className="filter-tabs">
        {filters.map(f => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="tab-count">{getCount(f.key)}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '16px' }}>
          <div className="empty-icon">{filter === 'all' ? '📋' : '🔍'}</div>
          {filter === 'all' ? (
            <>
              <div className="empty-title">لا توجد أنشطة تدريبية بعد</div>
              <div className="empty-hint">انقر على الزر أعلاه لإنشاء أول نشاط</div>
            </>
          ) : (
            <div className="empty-title">لا توجد أنشطة في هذه الفئة</div>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {visible.map(c => {
            const errCnt = (c.participants || []).filter(p => p.errors?.length > 0).length;
            const isEditable = ['pending_upload', 'uploaded', 'has_errors', 'corrected'].includes(c.status);
            const needsAction = c.status === 'pending_upload' || c.status === 'has_errors';
            return (
              <div
                key={c.id}
                className={`course-card ${c.daysLate > 0 ? 'late' : ''}`}
                onClick={() => onSelect(c.id)}
                style={needsAction ? { borderRight: '3px solid var(--primary)' } : {}}
              >
                <div className="course-card-top">
                  <div className="course-code">{c.code}</div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="course-name">{c.name}</div>
                <div className="course-meta">
                  <div className="course-meta-item">📅 {fmtD(c.startDate)}</div>
                  <div className="course-meta-item">📍 {c.location?.split('—')[0]?.split('–')[0]?.trim()}</div>
                </div>
                <div className="course-footer">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-light)' }}>
                      👥 {(c.participants || []).length} / {c.capacity}
                    </span>
                    {errCnt > 0 && (
                      <span className="badge badge-errors" style={{ fontSize: '11px', padding: '2px 7px' }}>
                        ⚠ {errCnt}
                      </span>
                    )}
                  </div>
                  <div className="course-action-link" style={needsAction ? { color: 'var(--primary)', fontWeight: '800' } : {}}>
                    {c.status === 'pending_upload' ? '📂 ارفع الأسماء ←' : isEditable ? 'فتح للتعديل ←' : 'عرض ←'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function BusinessDevPage() {
  const [view,       setView]       = useState('courses');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleSelect = (id) => { setSelectedId(id); setView('edit'); };
  const handleBack   = ()   => { setView('courses'); setSelectedId(null); };

  return (
    <Layout activeView={view === 'edit' ? 'courses' : view} onNavigate={v => { setView(v); setSelectedId(null); }}>
      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setSelectedId(id); setView('edit'); setShowCreate(false); }}
        />
      )}

      {view !== 'edit' && (
        <CourseList onSelect={handleSelect} onCreate={() => setShowCreate(true)} />
      )}
      {view === 'edit' && selectedId && (
        <CourseEditor courseId={selectedId} onBack={handleBack} />
      )}
    </Layout>
  );
}
