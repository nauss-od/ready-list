import { useRef, useState } from 'react';
import { read, utils } from 'xlsx';
import { validateParticipant } from '../data/mockData';

/* ── Column key lists ────────────────────────────────────────────────────────── */
const COL_KEYS = {
  name:         ['الاسم الكامل', 'الاسم', 'اسم', 'اسم المشارك', 'name', 'full name', 'المشترك'],
  nationalId:   ['رقم الهوية', 'الهوية', 'هوية', 'national id', 'id', 'رقم الهوية الوطنية'],
  email:        ['البريد الإلكتروني', 'البريد', 'بريد', 'إيميل', 'ايميل', 'email', 'e-mail'],
  phone:        ['رقم الجوال', 'الجوال', 'هاتف', 'رقم الهاتف', 'phone', 'mobile', 'موبايل'],
  organization: ['الجهة', 'جهة العمل', 'جهة', 'المنظمة', 'الشركة', 'organization', 'org', 'company'],
  jobTitle:     ['المسمى الوظيفي', 'المسمى', 'مسمى', 'وظيفة', 'الوظيفة', 'job title', 'title', 'position'],
};

const FIELD_LABELS = {
  name: 'الاسم الكامل',
  nationalId: 'رقم الهوية',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  organization: 'الجهة',
  jobTitle: 'المسمى الوظيفي',
};

const findColIdx = (headers, keys) => {
  for (const kw of keys) {
    const i = headers.findIndex(h => String(h ?? '').trim().toLowerCase().includes(kw.toLowerCase()));
    if (i >= 0) return i;
  }
  return -1;
};

const buildParticipants = (dataRows, colMap) => {
  const participants = dataRows
    .filter(row => row && row.some(c => String(c ?? '').trim()))
    .map((row, i) => {
      const get = (field) => colMap[field] >= 0 ? String(row[colMap[field]] ?? '').trim() : '';
      const p = {
        id: `I_${Date.now()}_${i}`,
        name: get('name'),
        nationalId: get('nationalId').replace(/\s/g, ''),
        email: get('email'),
        phone: get('phone').replace(/[\s\-]/g, ''),
        organization: get('organization'),
        jobTitle: get('jobTitle'),
      };
      p.errors = validateParticipant(p);
      p.corrected = false;
      p.isDuplicate = false;
      return p;
    });

  // Mark duplicates
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

const parseRawRows = (rows, forcedMap = null) => {
  if (!rows || rows.length < 1) return { participants: [], unmapped: [], headers: [], dataRows: [] };

  const firstRow = rows[0].map(h => String(h ?? '').trim());
  const hasHeaders = firstRow.some(h => /[؀-ۿ]/.test(h) || /[a-zA-Z]/.test(h));
  const headers = hasHeaders ? firstRow : [];
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  let colMap;
  if (forcedMap) {
    colMap = forcedMap;
  } else if (hasHeaders) {
    colMap = {};
    for (const [field, keys] of Object.entries(COL_KEYS)) colMap[field] = findColIdx(headers, keys);
  } else {
    colMap = { name: 0, nationalId: 1, email: 2, phone: 3, organization: 4, jobTitle: 5 };
  }

  const unmapped = Object.entries(colMap).filter(([, v]) => v < 0).map(([k]) => k);
  const participants = buildParticipants(dataRows, colMap);

  return { participants, unmapped, headers, dataRows, colMap };
};

/* ── Column mapper UI ────────────────────────────────────────────────────────── */
function ColumnMapper({ headers, onConfirm, onCancel }) {
  const initMap = {};
  for (const field of Object.keys(FIELD_LABELS)) {
    const idx = findColIdx(headers, COL_KEYS[field]);
    initMap[field] = idx >= 0 ? String(idx) : '';
  }
  const [map, setMap] = useState(initMap);

  const handleConfirm = () => {
    const colMap = Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, v === '' ? -1 : parseInt(v, 10)])
    );
    onConfirm(colMap);
  };

  return (
    <div>
      <div style={{
        padding: '14px 16px',
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '10px',
        fontSize: '13px',
        color: '#b45309',
        marginBottom: '16px',
        display: 'flex', gap: '8px',
      }}>
        <span>⚠</span>
        <div>لم يُتعرَّف على بعض الأعمدة. حدد الربط يدوياً ثم اضغط تأكيد.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <div key={field} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{label}</label>
            <select
              className="form-input"
              value={map[field]}
              onChange={e => setMap(m => ({ ...m, [field]: e.target.value }))}
            >
              <option value="">— غير محدد —</option>
              {headers.map((h, i) => (
                <option key={i} value={String(i)}>{h || `عمود ${i + 1}`}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={handleConfirm}>✓ تأكيد الربط واستيراد البيانات</button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>رجوع</button>}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export default function UploadPasteZone({ onData, onCancel }) {
  const fileRef = useRef();
  const [mode,      setMode]      = useState('choose'); // choose | paste | mapping | loading
  const [pasteText, setPasteText] = useState('');
  const [pending,   setPending]   = useState(null);     // { rawRows, headers } for re-mapping
  const [drag,      setDrag]      = useState(false);
  const [error,     setError]     = useState('');

  const handleParsed = (rawRows) => {
    const result = parseRawRows(rawRows);
    if (result.participants.length === 0) {
      setError('لم يتم التعرف على بيانات صحيحة في الملف.');
      setMode('choose');
      return;
    }
    if (result.unmapped.length > 2 && result.headers.length > 0) {
      // Need column mapping
      setPending({ rawRows, headers: result.headers });
      setMode('mapping');
    } else {
      onData(result.participants);
    }
  };

  const handleMapConfirm = (colMap) => {
    if (!pending) return;
    const result = parseRawRows(pending.rawRows, colMap);
    onData(result.participants);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext)) {
      setError('الصور لا تدعم الاستيراد التلقائي — يرجى نسخ البيانات يدوياً من الصورة ثم لصقها في تبويب "لصق من إيميل / وورد".');
      return;
    }
    if (['pdf'].includes(ext)) {
      setError('ملفات PDF لا تدعم الاستيراد التلقائي — يرجى فتح الملف، تحديد الجدول، نسخه (Ctrl+C) ولصقه في تبويب "لصق من إيميل / وورد".');
      return;
    }
    if (['docx', 'doc'].includes(ext)) {
      setError('ملفات Word — يرجى فتح الملف، تحديد الجدول كاملاً، نسخه (Ctrl+C) ولصقه في تبويب "لصق من إيميل / وورد".');
      return;
    }
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('الصيغة غير مدعومة. استخدم Excel (.xlsx، .xls) أو CSV.');
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
      if (mode !== 'mapping') setMode('choose');
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

    const rawRows = lines.map(l =>
      l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
    );

    if (rawRows[0].length === 1) {
      // Single column — names only
      const participants = lines
        .filter(l => l.trim())
        .map((l, i) => {
          const p = {
            id: `I_${Date.now()}_${i}`,
            name: l.trim(), nationalId: '', email: '', phone: '', organization: '', jobTitle: '',
          };
          p.errors = validateParticipant(p);
          p.corrected = false; p.isDuplicate = false;
          return p;
        });
      onData(participants);
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
          <div style={{ fontWeight: '700', color: 'var(--text)' }}>جارٍ معالجة الملف...</div>
        </div>
      )}

      {mode === 'mapping' && pending && (
        <ColumnMapper
          headers={pending.headers}
          onConfirm={handleMapConfirm}
          onCancel={() => { setPending(null); setMode('choose'); }}
        />
      )}

      {(mode === 'choose' || mode === 'paste') && (
        <>
          {/* Mode tabs */}
          <div style={{
            display: 'flex', marginBottom: '20px',
            border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden',
          }}>
            {[
              { id: 'choose', label: 'رفع ملف Excel / CSV', icon: '📎' },
              { id: 'paste',  label: 'لصق من إيميل / وورد / PDF', icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError(''); }}
                style={{
                  flex: 1, padding: '11px 8px',
                  background: mode === tab.id ? 'var(--primary)' : 'white',
                  color: mode === tab.id ? 'white' : 'var(--text-light)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Cairo, Tahoma', fontSize: '13.5px', fontWeight: '700',
                  transition: 'all 0.18s',
                  borderLeft: tab.id === 'paste' ? '1.5px solid var(--border)' : 'none',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* File drop zone */}
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
                  الصيغ المدعومة: Excel (.xlsx، .xls) · CSV (.csv)
                </div>
                <input
                  ref={fileRef} type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                <div style={{
                  display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
                }}>
                  {['Excel', 'CSV'].map(f => (
                    <span key={f} style={{
                      padding: '4px 12px', borderRadius: '20px',
                      background: 'rgba(42,99,100,0.08)',
                      color: 'var(--primary)', fontSize: '12px', fontWeight: '700',
                      border: '1px solid rgba(42,99,100,0.2)',
                    }}>{f}</span>
                  ))}
                </div>
              </div>

              <div style={{
                marginTop: '14px', padding: '12px 16px',
                background: '#f8fafc', borderRadius: '10px',
                border: '1px solid var(--border)',
                fontSize: '12.5px', color: 'var(--text-light)',
              }}>
                <strong style={{ color: 'var(--text)' }}>ملف Word أو PDF أو صورة؟</strong>
                {' '}استخدم تبويب "لصق من إيميل / وورد / PDF" — افتح الملف، حدد الجدول، انسخه (Ctrl+C) ثم الصقه هناك.
              </div>
            </>
          )}

          {/* Paste zone */}
          {mode === 'paste' && (
            <div>
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                fontSize: '13px', color: '#1d4ed8',
                marginBottom: '14px', display: 'flex', gap: '8px',
              }}>
                <span style={{ flexShrink: 0, fontSize: 16 }}>💡</span>
                <div>
                  <strong>كيفية الاستخدام:</strong> افتح ملف وورد أو PDF أو الإيميل، حدد الجدول أو الأسماء بالكامل،
                  انسخها (Ctrl+C)، ثم انقر داخل المربع أدناه والصق (Ctrl+V).
                </div>
              </div>
              <textarea
                className="form-input"
                rows={10}
                placeholder={'الصق البيانات هنا...\n\nمثال:\nمحمد عبدالله\tوزارة الداخلية\t0501234567\tm@moi.gov.sa\nنورة المطيري\tرئاسة الدولة\t0552345678\tn@pss.gov.sa'}
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setError(''); }}
                style={{ fontFamily: 'Cairo, Tahoma, monospace', fontSize: '13px', lineHeight: 1.8, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={handlePaste} disabled={!pasteText.trim()}>
                  استيراد البيانات →
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
