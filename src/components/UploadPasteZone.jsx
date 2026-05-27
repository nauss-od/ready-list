import { useRef, useState } from 'react';
import { read, utils } from 'xlsx';
import { validateParticipant } from '../data/mockData';

/* ── Column keyword lists ─────────────────────────────────────────────────────── */
const COL_KEYS = {
  name: [
    'الاسم الكامل','الاسم','اسم','اسم المشارك','اسم الموظف','اسم العامل',
    'اسم المتدرب','اسم المرشح','اسم المستفيد','اسم الطالب','اسم المتقدم',
    'المشترك','المتدرب','المرشح','المشارك','الطالب',
    'name','full name','participant name','employee name',
  ],
  nationalId: [
    'رقم الهوية','الهوية','هوية','رقم الهوية الوطنية','الهوية الوطنية',
    'رقم البطاقة','البطاقة الشخصية','رقم الإقامة','رقم الجواز',
    'national id','id number','id','iqama','iqama number','passport',
  ],
  email: [
    'البريد الإلكتروني','البريد الالكتروني','البريد','بريد',
    'الإيميل','ايميل','إيميل','البريد الإليكتروني',
    'email','e-mail','email address','mail',
  ],
  phone: [
    'رقم الجوال','الجوال','جوال','هاتف','رقم الهاتف','رقم الموبايل',
    'موبايل','رقم التواصل','رقم الاتصال',
    'phone','mobile','phone number','mobile number','tel','telephone',
  ],
  organization: [
    'الجهة','جهة العمل','جهة','المنظمة','الشركة','المؤسسة','جهة العامل',
    'الوزارة','الإدارة','القطاع','الجهاز',
    'organization','org','company','ministry','department','employer',
  ],
  jobTitle: [
    'المسمى الوظيفي','المسمى','مسمى','الوظيفة','وظيفة','الرتبة',
    'المنصب','درجة وظيفية',
    'job title','title','position','designation','rank',
  ],
};

const FIELD_LABELS = {
  name: 'الاسم الكامل',
  nationalId: 'رقم الهوية',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  organization: 'الجهة',
  jobTitle: 'المسمى الوظيفي',
};

const IGNORE_COL_PATTERNS = ['م','#','رقم','no','row','seq','رقم م','رقم التسلسل','ت','رقم ت'];

const HEADER_KEYWORDS = [
  'اسم','هوية','جوال','هاتف','بريد','إيميل','ايميل','الإيميل',
  'جهة','مسمى','وظيف','موبايل','مشارك','موظف','مرشح','متدرب','مستفيد',
  'email','phone','name','id','organization','title','mobile',
];

/* ── Detection helpers ─────────────────────────────────────────────────────────── */
const headerRowScore = (row) => {
  if (!row) return 0;
  let score = 0;
  for (const cell of row) {
    const s = String(cell ?? '').trim().toLowerCase();
    if (!s) continue;
    for (const kw of HEADER_KEYWORDS) {
      if (s.includes(kw)) { score += 1; break; }
    }
  }
  return score;
};

const findHeaderRow = (rows, maxScan = 12) => {
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const score = headerRowScore(rows[i]);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestScore >= 1 ? bestIdx : -1;
};

const findColIdx = (headers, keys) => {
  for (const kw of keys) {
    const i = headers.findIndex(h => String(h ?? '').trim().toLowerCase().includes(kw.toLowerCase()));
    if (i >= 0) return i;
  }
  return -1;
};

const isIgnoreCol = (header) => {
  const h = String(header ?? '').trim().toLowerCase();
  return IGNORE_COL_PATTERNS.some(p => h === p.toLowerCase());
};

const detectColsFromContent = (dataRows) => {
  if (!dataRows || dataRows.length === 0) return { name: 0, nationalId: -1, email: -1, phone: -1, organization: -1, jobTitle: -1 };
  const maxCols = Math.max(...dataRows.map(r => r ? r.length : 0));
  const colMap = { name: -1, nationalId: -1, email: -1, phone: -1, organization: -1, jobTitle: -1 };
  const sample = (ci) => dataRows.slice(0, 15).map(r => String((r && r[ci]) ?? '').trim()).filter(Boolean);

  for (let ci = 0; ci < maxCols; ci++) {
    const cells = sample(ci);
    if (cells.length === 0) continue;
    const emailCount  = cells.filter(c => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)).length;
    const phoneCount  = cells.filter(c => /^[+\d][\d\s\-]{6,14}$/.test(c.replace(/[‏‎]/g,''))).length;
    const idCount     = cells.filter(c => /^\d{9,11}$/.test(c.replace(/\s/g,''))).length;
    const arabicCount = cells.filter(c => /[؀-ۿ]/.test(c)).length;
    const seqCount    = cells.filter((c, idx) => c === String(idx + 1)).length;
    if (seqCount >= cells.length * 0.7) continue;
    if (emailCount >= cells.length * 0.5 && colMap.email < 0) { colMap.email = ci; continue; }
    if (phoneCount >= cells.length * 0.5 && colMap.phone < 0) { colMap.phone = ci; continue; }
    if (idCount    >= cells.length * 0.5 && colMap.nationalId < 0) { colMap.nationalId = ci; continue; }
    if (arabicCount >= cells.length * 0.6) {
      const avgLen = cells.reduce((s, c) => s + c.length, 0) / cells.length;
      if (colMap.name < 0 && avgLen >= 4) { colMap.name = ci; continue; }
      if (colMap.organization < 0 && avgLen >= 4) { colMap.organization = ci; continue; }
      if (colMap.jobTitle < 0) colMap.jobTitle = ci;
    }
  }
  if (colMap.name < 0) {
    for (let ci = 0; ci < maxCols; ci++) {
      const cells = sample(ci);
      if (cells.filter(c => /[؀-ۿ]/.test(c)).length > 0) { colMap.name = ci; break; }
    }
  }
  return colMap;
};

const cleanName = (raw) =>
  String(raw ?? '').trim().replace(/^[\d٠-٩]+[\.\-\)]\s*/, '').replace(/\s+/g, ' ').trim();

/* ── Participant builder ──────────────────────────────────────────────────────── */
const buildParticipants = (dataRows, colMap) => {
  const participants = dataRows
    .filter(row => row && row.some(c => String(c ?? '').trim()))
    .map((row, i) => {
      const get = (field) => colMap[field] >= 0 ? String(row[colMap[field]] ?? '').trim() : '';
      const p = {
        id: `I_${Date.now()}_${i}`,
        name: cleanName(get('name')),
        nationalId: get('nationalId').replace(/\s/g, ''),
        email: get('email').toLowerCase().trim(),
        phone: get('phone').replace(/[\s\-‏‎]/g, ''),
        organization: get('organization'),
        jobTitle: get('jobTitle'),
      };
      p.errors = validateParticipant(p);
      p.corrected = false;
      p.isDuplicate = false;
      return p;
    })
    .filter(p => p.name || p.email || p.nationalId);

  const seen = {};
  participants.forEach(p => { if (p.nationalId) seen[p.nationalId] = (seen[p.nationalId] || 0) + 1; });
  participants.forEach(p => {
    if (p.nationalId && seen[p.nationalId] > 1) {
      if (!p.errors.includes('duplicate')) p.errors.push('duplicate');
      p.isDuplicate = true;
    }
  });
  return participants;
};

/* ── Core parse function ──────────────────────────────────────────────────────── */
const parseRawRows = (rows, forcedMap = null) => {
  if (!rows || rows.length < 1) return { participants: [], headers: [], dataRows: [], colMap: {} };

  let headers = [], dataRows = [], colMap = {};

  if (forcedMap) {
    const headerIdx = findHeaderRow(rows);
    headers = headerIdx >= 0 ? rows[headerIdx].map(h => String(h ?? '').trim()) : [];
    dataRows = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0).filter(r => r && r.some(c => String(c ?? '').trim()));
    colMap = forcedMap;
  } else {
    const headerIdx = findHeaderRow(rows);
    if (headerIdx >= 0) {
      headers = rows[headerIdx].map(h => String(h ?? '').trim());
      dataRows = rows.slice(headerIdx + 1).filter(r => r && r.some(c => String(c ?? '').trim()));
      for (const [field, keys] of Object.entries(COL_KEYS)) {
        const rawIdx = findColIdx(headers, keys);
        colMap[field] = (rawIdx >= 0 && isIgnoreCol(headers[rawIdx])) ? -1 : rawIdx;
      }
    } else {
      dataRows = rows.filter(r => r && r.some(c => String(c ?? '').trim()));
      colMap = detectColsFromContent(dataRows);
    }
  }

  const participants = buildParticipants(dataRows, colMap);
  return { participants, headers, dataRows, colMap };
};

/* ── Import Preview ───────────────────────────────────────────────────────────── */
function ImportPreview({ participants, headers, colMap, existingCount, onConfirm, onRemap, onCancel }) {
  const previewRows = participants.slice(0, 5);
  const mappedFields = Object.keys(FIELD_LABELS).filter(f => colMap[f] >= 0);
  const unmappedFields = Object.keys(FIELD_LABELS).filter(f => colMap[f] < 0);

  // Build reverse mapping: colIndex → fieldName
  const reverseMap = {};
  Object.entries(colMap).forEach(([field, idx]) => { if (idx >= 0) reverseMap[idx] = field; });

  const goodCount = participants.filter(p => !p.errors || p.errors.length === 0).length;

  // What the file actually contains vs what's mapped
  const fileColsInfo = headers.map((h, idx) => {
    if (!h) return null;
    if (isIgnoreCol(h)) return { header: h, status: 'ignore', field: null };
    if (reverseMap[idx]) return { header: h, status: 'mapped', field: reverseMap[idx] };
    return { header: h, status: 'unmapped', field: null };
  }).filter(Boolean);

  return (
    <div>
      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 100px', padding: '14px 16px', textAlign: 'center',
          background: 'linear-gradient(135deg, #2A6364, #1e4b4c)',
          borderRadius: '12px', color: 'white',
        }}>
          <div style={{ fontSize: '30px', fontWeight: '900', lineHeight: 1 }}>{participants.length}</div>
          <div style={{ fontSize: '11.5px', opacity: 0.8, marginTop: '4px', fontWeight: '700' }}>مشارك في الملف</div>
        </div>
        <div style={{
          flex: '1 1 100px', padding: '14px 16px', textAlign: 'center',
          background: goodCount === participants.length ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          borderRadius: '12px',
          border: `1px solid ${goodCount === participants.length ? '#a7f3d0' : '#fcd34d'}`,
        }}>
          <div style={{ fontSize: '30px', fontWeight: '900', color: goodCount === participants.length ? '#059669' : '#d97706', lineHeight: 1 }}>{goodCount}</div>
          <div style={{ fontSize: '11.5px', color: goodCount === participants.length ? '#065f46' : '#92400e', marginTop: '4px', fontWeight: '700' }}>بيانات مكتملة</div>
        </div>
        {existingCount > 0 && (
          <div style={{
            flex: '1 1 100px', padding: '14px 16px', textAlign: 'center',
            background: 'linear-gradient(135deg, #fef3f2, #fee2e2)',
            borderRadius: '12px', border: '1px solid #fca5a5',
          }}>
            <div style={{ fontSize: '30px', fontWeight: '900', color: '#dc2626', lineHeight: 1 }}>{existingCount}</div>
            <div style={{ fontSize: '11.5px', color: '#991b1b', marginTop: '4px', fontWeight: '700' }}>في القائمة حالياً</div>
          </div>
        )}
      </div>

      {/* ── File columns analysis ── */}
      <div style={{
        marginBottom: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '12px', fontWeight: '800', color: '#334155',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span>📋</span> تحليل أعمدة الملف ({headers.filter(h => h).length} عمود)
        </div>
        <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {fileColsInfo.map((col, i) => (
            <div key={i} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              background: col.status === 'mapped' ? 'rgba(5,150,105,0.08)' : col.status === 'ignore' ? 'rgba(100,116,139,0.08)' : 'rgba(245,158,11,0.08)',
              color: col.status === 'mapped' ? '#065f46' : col.status === 'ignore' ? '#64748b' : '#92400e',
              border: `1px solid ${col.status === 'mapped' ? 'rgba(5,150,105,0.2)' : col.status === 'ignore' ? 'rgba(100,116,139,0.2)' : 'rgba(245,158,11,0.25)'}`,
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <span>{col.status === 'mapped' ? '✓' : col.status === 'ignore' ? '—' : '?'}</span>
              <span>{col.header}</span>
              {col.status === 'mapped' && (
                <span style={{ opacity: 0.7, fontSize: '11px' }}>← {FIELD_LABELS[col.field]}</span>
              )}
              {col.status === 'ignore' && (
                <span style={{ opacity: 0.6, fontSize: '11px' }}>تسلسل</span>
              )}
              {col.status === 'unmapped' && (
                <span style={{ opacity: 0.7, fontSize: '11px' }}>لا يطابق</span>
              )}
            </div>
          ))}
        </div>

        {/* Missing fields from file */}
        {unmappedFields.length > 0 && (
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid #e2e8f0',
            background: '#fffbeb',
            fontSize: '12.5px', color: '#92400e',
            display: 'flex', gap: '8px', alignItems: 'flex-start',
          }}>
            <span style={{ flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
            <div>
              <strong>حقول غير موجودة في هذا الملف: </strong>
              {unmappedFields.map(f => FIELD_LABELS[f]).join('، ')}
              {' — '}
              <span style={{ opacity: 0.8 }}>يمكن إدخالها يدوياً في الجدول بعد الاستيراد</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Preview table ── */}
      {mappedFields.length > 0 && (
        <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
            معاينة أول {previewRows.length} صفوف:
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {mappedFields.map(f => (
                  <th key={f} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#475569', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {FIELD_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((p, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  {mappedFields.map(f => (
                    <td key={f} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', color: '#1e293b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p[f] || <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {participants.length > 5 && (
            <div style={{ textAlign: 'center', padding: '6px', color: '#94a3b8', fontSize: '12px' }}>
              و {participants.length - 5} مشارك آخر...
            </div>
          )}
        </div>
      )}

      {/* ── Confirm actions ── */}
      {existingCount > 0 ? (
        /* Has existing participants: offer replace or add */
        <div style={{
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#9a3412', marginBottom: '12px', display: 'flex', gap: '7px', alignItems: 'center' }}>
            <span>⚠</span> القائمة تحتوي على {existingCount} مشارك حالي — كيف تريد المتابعة؟
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => onConfirm(participants, 'replace')}
              style={{ flex: '1 1 160px', background: '#dc2626', border: 'none' }}
            >
              🔄 استبدل القائمة بالكامل
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                يُحذف القديم ويُضاف {participants.length} مشارك جديد
              </span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onConfirm(participants, 'add')}
              style={{ flex: '1 1 160px' }}
            >
              ➕ أضف إلى القائمة الحالية
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                المجموع: {existingCount + participants.length} مشارك
              </span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button className="btn btn-ghost btn-sm" onClick={onRemap}>✎ تعديل ربط الأعمدة</button>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>إلغاء</button>}
          </div>
        </div>
      ) : (
        /* No existing: just confirm */
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onConfirm(participants, 'replace')}>
            ✓ تأكيد الاستيراد ({participants.length} مشارك)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRemap}>✎ تعديل ربط الأعمدة</button>
          {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>إلغاء</button>}
        </div>
      )}
    </div>
  );
}

/* ── Column Mapper UI ─────────────────────────────────────────────────────────── */
function ColumnMapper({ headers, colMap: initialColMap, onConfirm, onCancel }) {
  const initMap = {};
  for (const field of Object.keys(FIELD_LABELS)) {
    const autoIdx = initialColMap?.[field];
    initMap[field] = (autoIdx != null && autoIdx >= 0) ? String(autoIdx) : '';
  }
  const [map, setMap] = useState(initMap);

  return (
    <div>
      <div style={{
        padding: '14px 16px', background: '#fffbeb', border: '1px solid #fcd34d',
        borderRadius: '10px', fontSize: '13px', color: '#b45309',
        marginBottom: '16px', display: 'flex', gap: '8px',
      }}>
        <span>⚠</span>
        <div>حدد ربط الأعمدة يدوياً. يمكن ترك الحقول غير الموجودة في الملف فارغة.</div>
      </div>

      {headers.length > 0 && (
        <div style={{
          padding: '10px 14px', marginBottom: '14px',
          background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0',
          fontSize: '12px', color: '#64748b',
        }}>
          <strong style={{ color: '#334155' }}>أعمدة الملف:</strong>{' '}
          {headers.map((h, i) => h ? `[${i + 1}] ${h}` : null).filter(Boolean).join(' · ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <div key={field} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{label}</label>
            <select
              className="form-input"
              value={map[field]}
              onChange={e => setMap(m => ({ ...m, [field]: e.target.value }))}
            >
              <option value="">— غير موجود في الملف —</option>
              {headers.map((h, i) => h ? (
                <option key={i} value={String(i)}>[{i + 1}] {h}</option>
              ) : null)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={() => {
          const resolved = Object.fromEntries(
            Object.entries(map).map(([k, v]) => [k, v === '' ? -1 : parseInt(v, 10)])
          );
          onConfirm(resolved);
        }}>✓ تطبيق الربط</button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>رجوع</button>}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export default function UploadPasteZone({ onData, onCancel, existingCount = 0 }) {
  const fileRef = useRef();
  const [mode,      setMode]      = useState('choose'); // choose | paste | preview | mapping | loading
  const [pasteText, setPasteText] = useState('');
  const [pending,   setPending]   = useState(null);
  const [drag,      setDrag]      = useState(false);
  const [error,     setError]     = useState('');

  const handleParsed = (rawRows) => {
    const result = parseRawRows(rawRows);
    if (result.participants.length === 0) {
      setError('لم يُعثر على بيانات في الملف. تأكد من وجود أسماء ومحتوى.');
      setMode('choose');
      return;
    }
    setPending({ rawRows, headers: result.headers, colMap: result.colMap, result });
    setMode('preview');
  };

  const handlePreviewConfirm = (participants, mode) => {
    onData(participants, mode);
  };

  const handleMapConfirm = (colMap) => {
    if (!pending) return;
    const result = parseRawRows(pending.rawRows, colMap);
    setPending(p => ({ ...p, colMap, result }));
    setMode('preview');
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','bmp','tiff','webp'].includes(ext)) {
      setError('الصور لا تدعم الاستيراد التلقائي — يرجى نسخ الأسماء من الصورة يدوياً ثم لصقها في تبويب "لصق".');
      return;
    }
    if (ext === 'pdf') {
      setError('ملفات PDF — يرجى فتح الملف، تحديد الجدول، نسخه (Ctrl+C) ولصقه في تبويب "لصق".');
      return;
    }
    if (['docx','doc'].includes(ext)) {
      setError('ملفات Word — يرجى فتح الملف، تحديد الجدول كاملاً، نسخه (Ctrl+C) ولصقه في تبويب "لصق".');
      return;
    }
    if (!['xlsx','xls','csv'].includes(ext)) {
      setError('صيغة غير مدعومة. استخدم Excel (.xlsx، .xls) أو CSV.');
      return;
    }
    setError('');
    setMode('loading');
    try {
      const buf = await file.arrayBuffer();
      const wb = read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = utils.sheet_to_json(ws, { header: 1, defval: '' });
      handleParsed(rawRows);
    } catch {
      setError('تعذر قراءة الملف. تأكد أنه غير محمي بكلمة مرور وغير تالف.');
      setMode('choose');
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    setError('');
    const lines = pasteText.trim().split(/\r?\n/).filter(l => l.trim());
    const firstLine = lines[0] || '';
    let sep = '\t';
    if (!firstLine.includes('\t')) {
      if (firstLine.includes(',')) sep = ',';
      else if (firstLine.includes(';')) sep = ';';
    }
    const rawRows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
    if (rawRows[0].length === 1) {
      const participants = lines.filter(l => l.trim()).map((l, i) => {
        const p = { id: `I_${Date.now()}_${i}`, name: cleanName(l.trim()), nationalId: '', email: '', phone: '', organization: '', jobTitle: '' };
        p.errors = validateParticipant(p);
        p.corrected = false; p.isDuplicate = false;
        return p;
      }).filter(p => p.name);
      if (participants.length === 0) { setError('لم يُعثر على أسماء.'); return; }
      const mockColMap = { name: 0, nationalId: -1, email: -1, phone: -1, organization: -1, jobTitle: -1 };
      setPending({ rawRows, headers: ['الاسم'], colMap: mockColMap, result: { participants, headers: ['الاسم'], colMap: mockColMap } });
      setMode('preview');
    } else {
      handleParsed(rawRows);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid var(--border)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)' }}>استيراد قائمة الأسماء</h3>
        {onCancel && <button className="close-btn" onClick={onCancel}>✕</button>}
      </div>

      {error && (
        <div className="alert alert-warning mb-12">
          <span style={{ flexShrink: 0, fontSize: 16 }}>⚠</span>
          <div>{error}</div>
        </div>
      )}

      {mode === 'loading' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 14px', width: 40, height: 40, borderWidth: 4 }} />
          <div style={{ fontWeight: '700', color: 'var(--text)' }}>جارٍ تحليل الملف...</div>
        </div>
      )}

      {mode === 'preview' && pending?.result && (
        <ImportPreview
          participants={pending.result.participants}
          headers={pending.headers}
          colMap={pending.colMap}
          existingCount={existingCount}
          onConfirm={handlePreviewConfirm}
          onRemap={() => setMode('mapping')}
          onCancel={() => { setPending(null); setMode('choose'); setError(''); }}
        />
      )}

      {mode === 'mapping' && pending && (
        <ColumnMapper
          headers={pending.headers}
          colMap={pending.colMap}
          onConfirm={handleMapConfirm}
          onCancel={() => setMode('preview')}
        />
      )}

      {(mode === 'choose' || mode === 'paste') && (
        <>
          <div style={{
            display: 'flex', marginBottom: '20px',
            border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden',
          }}>
            {[
              { id: 'choose', label: 'رفع ملف Excel / CSV', icon: '📎' },
              { id: 'paste',  label: 'لصق من إيميل / وورد', icon: '📋' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }} style={{
                flex: 1, padding: '11px 8px',
                background: mode === tab.id ? 'var(--primary)' : 'white',
                color: mode === tab.id ? 'white' : 'var(--text-light)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif', fontSize: '13.5px', fontWeight: '700',
                transition: 'all 0.18s',
                borderLeft: tab.id === 'paste' ? '1.5px solid var(--border)' : 'none',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {mode === 'choose' && (
            <>
              <div
                className={`upload-zone ${drag ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
                  اسحب ملف Excel هنا أو انقر للاختيار
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  يتعرف على الأعمدة تلقائياً — الاسم، الهوية، الجوال، البريد، الجهة...
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
                <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Excel (.xlsx)', 'CSV'].map(f => (
                    <span key={f} style={{
                      padding: '4px 12px', borderRadius: '20px',
                      background: 'rgba(42,99,100,0.08)', color: 'var(--primary)',
                      fontSize: '12px', fontWeight: '700', border: '1px solid rgba(42,99,100,0.2)',
                    }}>{f}</span>
                  ))}
                </div>
              </div>
              <div style={{
                marginTop: '14px', padding: '12px 16px', background: '#f8fafc',
                borderRadius: '10px', border: '1px solid var(--border)',
                fontSize: '12.5px', color: 'var(--text-light)',
              }}>
                <strong style={{ color: 'var(--text)' }}>ملف Word أو PDF أو صورة؟</strong>
                {' '}استخدم تبويب "لصق" — افتح الملف، حدد الجدول، انسخه (Ctrl+C) ثم الصقه هناك.
              </div>
            </>
          )}

          {mode === 'paste' && (
            <div>
              <div style={{
                padding: '12px 16px', borderRadius: '10px', background: '#eff6ff',
                border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8',
                marginBottom: '14px', display: 'flex', gap: '8px',
              }}>
                <span style={{ flexShrink: 0, fontSize: 16 }}>💡</span>
                <div>افتح ملف وورد أو PDF أو الإيميل، حدد الجدول أو الأسماء، انسخها (Ctrl+C)، ثم الصق هنا (Ctrl+V).</div>
              </div>
              <textarea
                className="form-input"
                rows={10}
                placeholder={'الصق البيانات هنا...\n\nمثال:\nمحمد عبدالله\t0501234567\tm@moi.gov.sa\nنورة المطيري\t0552345678\tn@pss.gov.sa'}
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setError(''); }}
                style={{ fontFamily: 'El Messiri, Cairo, Tahoma, monospace', fontSize: '13px', lineHeight: 1.8, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={handlePaste} disabled={!pasteText.trim()}>
                  تحليل البيانات →
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setPasteText(''); setError(''); }}>مسح</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
