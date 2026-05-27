import { useApp } from '../context/AppContext';
import { statusConfig } from '../data/mockData';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';

/* ── Field definitions ─────────────────────────────────────────────────────── */
const FIELDS = [
  { key: 'phone',        label: 'رقم الجوال',          test: p => /^05\d{8}$/.test((p.phone||'').replace(/[\s\-]/g,'')),     color: '#ef4444' },
  { key: 'nationalId',   label: 'رقم الهوية',          test: p => /^\d{10}$/.test((p.nationalId||'').replace(/\s/g,'')),      color: '#f97316' },
  { key: 'organization', label: 'الجهة',               test: p => !!(p.organization?.trim()),                                color: '#eab308' },
  { key: 'email',        label: 'البريد الإلكتروني',   test: p => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email||''),            color: '#3b82f6' },
  { key: 'jobTitle',     label: 'المسمى الوظيفي',     test: p => !!(p.jobTitle?.trim()),                                    color: '#8b5cf6' },
];

/* ── Donut SVG ─────────────────────────────────────────────────────────────── */
function DonutChart({ pct, size = 140, color = '#2A6364', label = '' }) {
  const r = (size / 2) - 14;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const scoreColor = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor} strokeWidth="12"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size/2} y={size/2 - 6} textAnchor="middle"
        style={{ fontSize: '22px', fontWeight: 900, fill: scoreColor, fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif' }}>
        {pct}%
      </text>
      {label && (
        <text x={size/2} y={size/2 + 14} textAnchor="middle"
          style={{ fontSize: '10px', fill: '#64748b', fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif' }}>
          {label}
        </text>
      )}
    </svg>
  );
}

/* ── Horizontal bar ────────────────────────────────────────────────────────── */
function HorizBar({ label, count, pct, total, color }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{count} من {total}</span>
          <span style={{
            fontSize: '12px', fontWeight: '800', color,
            background: `${color}18`, padding: '2px 8px', borderRadius: '12px',
            border: `1px solid ${color}30`,
          }}>{pct}% مفقود</span>
        </div>
      </div>
      <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '6px',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

/* ── Mini donut for per-course ─────────────────────────────────────────────── */
function MiniDonut({ pct, size = 52 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        style={{ fontSize: '10px', fontWeight: 900, fill: color, fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif' }}>
        {pct}%
      </text>
    </svg>
  );
}

/* ── Main analytics page ───────────────────────────────────────────────────── */
export default function ManagerAnalyticsPage() {
  const { courses } = useApp();

  /* Compute aggregated stats */
  const withParts = courses.filter(c => c.participants?.length > 0);
  const allParts  = withParts.flatMap(c => c.participants);
  const total     = allParts.length;

  const fieldStats = FIELDS.map(f => {
    const have    = allParts.filter(f.test).length;
    const missing = total - have;
    const pct     = total > 0 ? Math.round((missing / total) * 100) : 0;
    return { ...f, have, missing, pct };
  });

  const fullyComplete   = allParts.filter(p => !p.errors || p.errors.length === 0).length;
  const completenessRate = total > 0 ? Math.round((fullyComplete / total) * 100) : 0;
  const incompleteCourses = withParts.filter(c => c.participants.some(p => p.errors?.length > 0));
  const incompleteApproved = courses.filter(c => c.isIncomplete);

  /* Per-course completeness */
  const courseStats = withParts.map(c => {
    const cp    = c.participants;
    const complete = cp.filter(p => !p.errors || p.errors.length === 0).length;
    const pct   = cp.length > 0 ? Math.round((complete / cp.length) * 100) : 0;
    const fieldsMissing = FIELDS.map(f => {
      const count = cp.filter(p => !f.test(p)).length;
      return count > 0 ? { label: f.label, count, pct: Math.round(count/cp.length*100) } : null;
    }).filter(Boolean);
    return { ...c, completePct: pct, fieldsMissing };
  }).sort((a, b) => a.completePct - b.completePct); // worst first

  const worstField = fieldStats.reduce((a, b) => a.pct > b.pct ? a : b, { pct: 0, label: '—' });

  if (withParts.length === 0) {
    return (
      <div className="animate-up">
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '14px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>لا توجد بيانات كافية للتحليل</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>يظهر التحليل بعد رفع قوائم المشاركين للأنشطة</div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-up">

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0d1a1a', marginBottom: '4px' }}>
              الرصد التشغيلي
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              تحليل جودة بيانات المشاركين وتشخيص المشاكل التشغيلية للإدارة العليا
            </p>
          </div>
          <div style={{
            padding: '8px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '10px', fontSize: '12px', color: '#166534', fontWeight: '700',
          }}>
            📅 {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Alert banner if there are incomplete approved lists */}
        {incompleteApproved.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1.5px solid #fcd34d',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '22px' }}>⚠</span>
            <div>
              <div style={{ fontWeight: '800', color: '#92400e', fontSize: '14px' }}>
                {incompleteApproved.length} قائمة معتمدة تحتوي بيانات ناقصة
              </div>
              <div style={{ fontSize: '12.5px', color: '#78350f', marginTop: '2px' }}>
                هذه القوائم وصلت من العملاء ببيانات غير مكتملة وتم اعتمادها مع تسجيل التحفظ
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          {
            label: 'إجمالي الأنشطة',
            value: withParts.length,
            sub: `${courses.length} إجمالي في النظام`,
            icon: '📋',
            color: '#2A6364',
            bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
            border: '#99f6e4',
          },
          {
            label: 'إجمالي المشاركين',
            value: total.toLocaleString('ar-SA'),
            sub: `في ${withParts.length} نشاط`,
            icon: '👥',
            color: '#1d4ed8',
            bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '#93c5fd',
          },
          {
            label: 'معدل اكتمال البيانات',
            value: `${completenessRate}%`,
            sub: `${fullyComplete} مشارك مكتمل`,
            icon: completenessRate >= 80 ? '✅' : completenessRate >= 50 ? '⚠' : '❌',
            color: completenessRate >= 80 ? '#059669' : completenessRate >= 50 ? '#d97706' : '#dc2626',
            bg: completenessRate >= 80 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : completenessRate >= 50 ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: completenessRate >= 80 ? '#86efac' : completenessRate >= 50 ? '#fcd34d' : '#fca5a5',
          },
          {
            label: 'أكثر مشكلة شيوعاً',
            value: worstField.label,
            sub: `${worstField.pct}% من المشاركين`,
            icon: '🔍',
            color: '#dc2626',
            bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '#fca5a5',
          },
        ].map((k, i) => (
          <div key={i} style={{
            background: k.bg, border: `1px solid ${k.border}`,
            borderRadius: '14px', padding: '18px 16px',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{k.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '16px', marginBottom: '20px' }}>

        {/* Donut: overall completeness */}
        <div className="card">
          <div className="card-header">
            <h3>نسبة الاكتمال الكلية</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
            <DonutChart pct={completenessRate} size={150} label="اكتمال البيانات" />
            <div style={{ marginTop: '20px', width: '100%' }}>
              {[
                { label: 'بيانات مكتملة', count: fullyComplete, color: '#059669' },
                { label: 'بيانات ناقصة', count: total - fullyComplete, color: '#ef4444' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i === 0 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{item.label}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: item.color }}>{item.count}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>مشارك</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', width: '100%', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              من أصل <strong style={{ color: '#0f172a' }}>{total}</strong> مشارك في <strong style={{ color: '#0f172a' }}>{withParts.length}</strong> نشاط تدريبي
            </div>
          </div>
        </div>

        {/* Horizontal bars: field completeness */}
        <div className="card">
          <div className="card-header">
            <h3>الحقول الأكثر نقصاً</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>% من {total} مشارك</span>
          </div>
          <div className="card-body">
            {fieldStats.map(f => (
              <HorizBar key={f.key} label={f.label} count={f.missing} pct={f.pct} total={total} color={f.color} />
            ))}

            {fieldStats.every(f => f.pct === 0) && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                <div style={{ fontWeight: '700' }}>جميع بيانات المشاركين مكتملة</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Per-activity breakdown ── */}
      <div className="card">
        <div className="card-header">
          <h3>تقرير الأنشطة — اكتمال البيانات</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: 'مكتمل ≥80%', color: '#059669', bg: '#f0fdf4' },
              { label: 'متوسط 50-80%', color: '#d97706', bg: '#fffbeb' },
              { label: 'ناقص <50%', color: '#dc2626', bg: '#fef2f2' },
            ].map(item => (
              <span key={item.label} style={{
                padding: '3px 10px', borderRadius: '8px', fontSize: '11.5px',
                fontWeight: '700', background: item.bg, color: item.color,
              }}>{item.label}</span>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>النشاط</th>
                <th>التاريخ</th>
                <th>المشاركون</th>
                <th>اكتمال البيانات</th>
                <th>الحقول المفقودة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map(c => {
                const scoreColor = c.completePct >= 80 ? '#059669' : c.completePct >= 50 ? '#d97706' : '#dc2626';
                const scoreBg    = c.completePct >= 80 ? '#f0fdf4' : c.completePct >= 50 ? '#fffbeb' : '#fef2f2';
                const cfg = statusConfig[c.status] || {};
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{c.code}</div>
                      {c.isIncomplete && (
                        <span style={{ fontSize: '10.5px', color: '#d97706', fontWeight: '700', background: '#fffbeb', padding: '1px 7px', borderRadius: '8px', border: '1px solid #fcd34d', display: 'inline-block', marginTop: '3px' }}>
                          ⚠ معتمد مع تحفظ
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>{fmtDate(c.startDate)}</td>
                    <td>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{c.participants.length}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>مشارك</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MiniDonut pct={c.completePct} />
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: scoreColor }}>{c.completePct}%</div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            {c.participants.filter(p => !p.errors || p.errors.length === 0).length} مكتمل
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.fieldsMissing.length === 0 ? (
                        <span style={{ color: '#059669', fontWeight: '700', fontSize: '12px' }}>✓ لا يوجد نقص</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {c.fieldsMissing.map(f => (
                            <span key={f.label} style={{
                              fontSize: '11px', fontWeight: '700',
                              padding: '2px 7px', borderRadius: '8px',
                              background: '#fef2f2', color: '#dc2626',
                              border: '1px solid #fca5a5',
                            }}>
                              {f.label} ({f.pct}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${cfg.badge}`}>
                        <span className="badge-dot" />{cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Operational insights footer ── */}
      <div style={{
        marginTop: '20px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #0d2626 0%, #1a3f40 100%)',
        borderRadius: '14px',
        color: 'white',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(199,176,140,0.7)', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px' }}>
            تشخيص المشاكل التشغيلية
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
            {fieldStats.filter(f => f.pct > 50).length > 0
              ? `${fieldStats.filter(f => f.pct > 50).map(f => f.label).join('، ')} — يُنصح بإضافتها إلى نموذج الترشيح القياسي للعملاء`
              : 'جودة البيانات مقبولة — لا مشاكل تشغيلية حرجة'
            }
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(199,176,140,0.7)', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px' }}>
            التوصية للإدارة
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
            {completenessRate < 50
              ? 'معدل الاكتمال منخفض — يُوصى بمراجعة نموذج ترشيح المشاركين المُرسَل للعملاء'
              : completenessRate < 80
              ? 'معدل الاكتمال متوسط — يُوصى بتذكير العملاء بإرسال البيانات الكاملة عند الترشيح'
              : 'معدل الاكتمال جيد — استمرار الإجراءات الحالية'
            }
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(199,176,140,0.7)', fontWeight: '700', letterSpacing: '1px', marginBottom: '6px' }}>
            إجمالي الحالات الموثقة
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'white' }}>
            {incompleteCourses.length}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            نشاط وصل ببيانات غير مكتملة
          </div>
        </div>
      </div>

    </div>
  );
}
