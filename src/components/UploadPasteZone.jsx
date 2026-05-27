import { useRef, useState, useCallback } from 'react';
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
const IMAGE_EXTS = ['jpg','jpeg','png','gif','bmp','tiff','webp'];

/* ── Detection helpers ─────────────────────────────────────────────────────────── */
const headerRowScore = (row) => {
  if (!row) return 0;
  let score = 0;
  for (const cell of row) {
    const s = String(cell ?? '').trim().toLowerCase();
    if (!s) continue;
    for (const kw of HEADER_KEYWORDS) { if (s.includes(kw)) { score += 1; break; } }
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

/* ── AI-generated prompt for image extraction ─────────────────────────────────── */
const AI_PROMPT = `هذه صورة لقائمة مشاركين تدريبيين.
استخرج جميع البيانات وضعها في جدول CSV (مفصول بفواصل).

الأعمدة المطلوبة:
الاسم الكامل,رقم الهوية,رقم الجوال,البريد الإلكتروني,الجهة,المسمى الوظيفي

التعليمات:
- السطر الأول: أسماء الأعمدة كما هي أعلاه
- إذا كان حقل غير موجود في الصورة، اتركه فارغاً
- لا تضف أي نص أو تعليق خارج الجدول
- احتفظ بالأسماء العربية كما هي بدون أي تعديل
- الناتج النهائي: جدول CSV فقط`;

/* ── Image Import Zone ────────────────────────────────────────────────────────── */
function ImageImportZone({ onTextReady, onCancel }) {
  const imgRef = useRef();
  const [imageFile,   setImageFile]   = useState(null);
  const [imageUrl,    setImageUrl]    = useState('');
  const [drag,        setDrag]        = useState(false);
  const [aiPaste,     setAiPaste]     = useState('');
  const [copied,      setCopied]      = useState(false);
  const [ocrStatus,   setOcrStatus]   = useState('idle'); // idle | loading | done | error
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText,     setOcrText]     = useState('');

  const loadImage = (file) => {
    if (!IMAGE_EXTS.includes(file.name.split('.').pop().toLowerCase())) return;
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImageUrl(url);
    setOcrStatus('idle');
    setOcrText('');
    setAiPaste('');
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const runOCR = useCallback(async () => {
    if (!imageFile) return;
    setOcrStatus('loading');
    setOcrProgress(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['ara', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(imageFile);
      await worker.terminate();
      setOcrText(data.text);
      setOcrStatus('done');
    } catch (err) {
      console.error('OCR error:', err);
      setOcrStatus('error');
    }
  }, [imageFile]);

  const handleOcrResult = () => {
    if (ocrText.trim()) onTextReady(ocrText, 'ocr');
  };

  const handleAiResult = () => {
    if (aiPaste.trim()) onTextReady(aiPaste, 'ai');
  };

  if (!imageFile) {
    return (
      <div>
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #86efac', marginBottom: '16px',
          fontSize: '13px', color: '#166534', display: 'flex', gap: '8px',
        }}>
          <span style={{ flexShrink: 0, fontSize: 18 }}>🤖</span>
          <div>
            <strong>استيراد ذكي من الصور</strong> — يدعم طريقتين:
            التعرف الضوئي التلقائي (Tesseract) أو الاستخراج عبر ChatGPT/Claude بدقة أعلى.
          </div>
        </div>
        <div
          className={`upload-zone ${drag ? 'drag-over' : ''}`}
          style={{ cursor: 'pointer' }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); loadImage(e.dataTransfer.files[0]); }}
          onClick={() => imgRef.current?.click()}
        >
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>🖼️</div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
            اسحب صورة القائمة هنا أو انقر للاختيار
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            PNG · JPG · JPEG · BMP · TIFF
          </div>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => loadImage(e.target.files[0])} />
          <div style={{ display: 'inline-flex', gap: '8px' }}>
            {['PNG','JPG','BMP'].map(f => (
              <span key={f} style={{
                padding: '3px 10px', borderRadius: '20px',
                background: 'rgba(42,99,100,0.08)', color: 'var(--primary)',
                fontSize: '12px', fontWeight: '700', border: '1px solid rgba(42,99,100,0.2)',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Image preview + reset */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <img
            src={imageUrl}
            alt="صورة القائمة"
            style={{
              width: '120px', height: '90px', objectFit: 'cover',
              borderRadius: '10px', border: '2px solid #e2e8f0',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px', fontSize: '14px' }}>
            {imageFile.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            {(imageFile.size / 1024).toFixed(0)} كيلوبايت
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setImageFile(null); setImageUrl(''); setOcrStatus('idle'); }}
          >
            ✕ تغيير الصورة
          </button>
        </div>
      </div>

      {/* ── Method 1: OCR ── */}
      <div style={{
        marginBottom: '16px',
        border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>
                الطريقة الأولى — تعرف ضوئي تلقائي
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                يعمل مباشرة في المتصفح · دقة جيدة للنصوص الواضحة
              </div>
            </div>
          </div>
          {ocrStatus === 'idle' && (
            <button className="btn btn-primary btn-sm" onClick={runOCR}>
              تحليل ضوئي ←
            </button>
          )}
        </div>

        <div style={{ padding: '14px 16px' }}>
          {ocrStatus === 'idle' && (
            <div style={{ fontSize: '12.5px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
              اضغط "تحليل ضوئي" لبدء استخراج النص من الصورة
            </div>
          )}

          {ocrStatus === 'loading' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${ocrProgress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #2A6364, #4a8a8b)',
                    borderRadius: '4px', transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                جارٍ التحليل الضوئي... {ocrProgress}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                قد يستغرق 10-30 ثانية حسب حجم الصورة
              </div>
            </div>
          )}

          {ocrStatus === 'done' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ color: '#059669', fontWeight: '800', fontSize: '13px' }}>✓ تم الاستخراج</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>— راجع النتيجة وعدّلها إذا لزم</span>
              </div>
              <textarea
                className="form-input"
                rows={6}
                value={ocrText}
                onChange={e => setOcrText(e.target.value)}
                style={{ fontFamily: 'El Messiri, Cairo, Tahoma, monospace', fontSize: '12.5px', lineHeight: 1.8, resize: 'vertical', direction: 'rtl' }}
              />
              <button className="btn btn-primary btn-sm" style={{ marginTop: '10px' }} onClick={handleOcrResult}>
                تحليل النتيجة ←
              </button>
            </div>
          )}

          {ocrStatus === 'error' && (
            <div style={{ color: '#dc2626', fontSize: '13px', textAlign: 'center', padding: '8px 0' }}>
              ✕ فشل التعرف الضوئي — جرّب الطريقة الثانية أدناه
            </div>
          )}
        </div>
      </div>

      {/* ── Method 2: AI-assisted ── */}
      <div style={{
        border: '1.5px solid #c7d2fe', borderRadius: '12px', overflow: 'hidden',
        background: 'linear-gradient(135deg, #fafafe, #f0f4ff)',
      }}>
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(90deg, #eef2ff, #e0e7ff)',
          borderBottom: '1px solid #c7d2fe',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#1e1b4b' }}>
              الطريقة الثانية — استخراج بالذكاء الاصطناعي
            </div>
            <div style={{ fontSize: '11.5px', color: '#6366f1', marginTop: '1px' }}>
              الأعلى دقة · يعمل مع ChatGPT أو Claude أو Gemini
            </div>
          </div>
          <span style={{
            padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
            background: '#4f46e5', color: 'white',
          }}>موصى به</span>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Steps */}
          <div style={{ marginBottom: '14px' }}>
            {[
              { n: '١', text: 'انسخ البرومبت أدناه وافتح ChatGPT أو Claude' },
              { n: '٢', text: 'أرفق الصورة مع البرومبت واضغط إرسال' },
              { n: '٣', text: 'انسخ جدول CSV الناتج والصقه في الحقل أدناه' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '7px' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: '#4f46e5', color: 'white',
                  fontSize: '12px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.n}</span>
                <span style={{ fontSize: '13px', color: '#334155', paddingTop: '2px' }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Prompt box */}
          <div style={{
            background: '#1e1b4b', borderRadius: '10px', padding: '12px 14px',
            marginBottom: '12px', position: 'relative',
          }}>
            <pre style={{
              margin: 0, fontSize: '11.5px', color: '#e0e7ff',
              fontFamily: 'El Messiri, Cairo, Tahoma, monospace',
              whiteSpace: 'pre-wrap', lineHeight: 1.7,
            }}>{AI_PROMPT}</pre>
            <button
              onClick={copyPrompt}
              style={{
                position: 'absolute', top: '8px', left: '8px',
                padding: '4px 12px', borderRadius: '8px', border: 'none',
                background: copied ? '#059669' : '#4f46e5',
                color: 'white', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif',
              }}
            >
              {copied ? '✓ تم النسخ' : '📋 نسخ'}
            </button>
          </div>

          {/* Open AI buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <a
              href="https://chat.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={copyPrompt}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                background: '#10a37f', color: 'white',
                fontSize: '13px', fontWeight: '800',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>🟢</span> افتح ChatGPT
            </a>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              onClick={copyPrompt}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                background: '#cc5500', color: 'white',
                fontSize: '13px', fontWeight: '800',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>🟠</span> افتح Claude
            </a>
          </div>

          {/* Paste result */}
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
            الصق نتيجة جدول CSV هنا:
          </div>
          <textarea
            className="form-input"
            rows={7}
            placeholder={"الصق جدول CSV الناتج من ChatGPT هنا...\n\nمثال:\nالاسم الكامل,رقم الهوية,رقم الجوال,البريد الإلكتروني,الجهة\nمحمد عبدالله السعدي,1234567890,0501234567,m@gov.sa,وزارة الداخلية"}
            value={aiPaste}
            onChange={e => setAiPaste(e.target.value)}
            style={{
              fontFamily: 'El Messiri, Cairo, Tahoma, monospace',
              fontSize: '12.5px', lineHeight: 1.8, resize: 'vertical', direction: 'ltr', textAlign: 'left',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAiResult}
            disabled={!aiPaste.trim()}
            style={{ marginTop: '10px' }}
          >
            🤖 تحليل نتيجة الذكاء الاصطناعي →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Import Preview ───────────────────────────────────────────────────────────── */
function ImportPreview({ participants, headers, colMap, existingCount, source, onConfirm, onRemap, onCancel }) {
  const previewRows = participants.slice(0, 5);
  const mappedFields = Object.keys(FIELD_LABELS).filter(f => colMap[f] >= 0);
  const unmappedFields = Object.keys(FIELD_LABELS).filter(f => colMap[f] < 0);
  const reverseMap = {};
  Object.entries(colMap).forEach(([field, idx]) => { if (idx >= 0) reverseMap[idx] = field; });
  const goodCount = participants.filter(p => !p.errors || p.errors.length === 0).length;
  const fileColsInfo = headers.map((h, idx) => {
    if (!h) return null;
    if (isIgnoreCol(h)) return { header: h, status: 'ignore' };
    if (reverseMap[idx]) return { header: h, status: 'mapped', field: reverseMap[idx] };
    return { header: h, status: 'unmapped' };
  }).filter(Boolean);

  return (
    <div>
      {/* Source badge */}
      {source && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '20px', marginBottom: '14px',
          background: source === 'ocr' ? '#ecfdf5' : source === 'ai' ? '#eef2ff' : '#f0f9ff',
          border: `1px solid ${source === 'ocr' ? '#86efac' : source === 'ai' ? '#c7d2fe' : '#bae6fd'}`,
          fontSize: '12px', fontWeight: '700',
          color: source === 'ocr' ? '#065f46' : source === 'ai' ? '#3730a3' : '#0369a1',
        }}>
          {source === 'ocr' ? '⚡ نتيجة التعرف الضوئي' : source === 'ai' ? '🤖 نتيجة الذكاء الاصطناعي' : '📎 ملف Excel/CSV'}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 100px', padding: '14px 16px', textAlign: 'center',
          background: 'linear-gradient(135deg, #2A6364, #1e4b4c)',
          borderRadius: '12px', color: 'white',
        }}>
          <div style={{ fontSize: '30px', fontWeight: '900', lineHeight: 1 }}>{participants.length}</div>
          <div style={{ fontSize: '11.5px', opacity: 0.8, marginTop: '4px', fontWeight: '700' }}>مشارك تم تحليله</div>
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

      {/* File columns */}
      {fileColsInfo.length > 0 && (
        <div style={{ marginBottom: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '800', color: '#334155' }}>
            📋 أعمدة الملف ({fileColsInfo.length})
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {fileColsInfo.map((col, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '700',
                background: col.status === 'mapped' ? 'rgba(5,150,105,0.08)' : col.status === 'ignore' ? 'rgba(100,116,139,0.08)' : 'rgba(245,158,11,0.08)',
                color: col.status === 'mapped' ? '#065f46' : col.status === 'ignore' ? '#64748b' : '#92400e',
                border: `1px solid ${col.status === 'mapped' ? 'rgba(5,150,105,0.2)' : col.status === 'ignore' ? 'rgba(100,116,139,0.2)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                {col.status === 'mapped' ? '✓' : col.status === 'ignore' ? '—' : '?'} {col.header}
                {col.status === 'mapped' && <span style={{ opacity: 0.7, fontSize: '10.5px' }}> ← {FIELD_LABELS[col.field]}</span>}
              </span>
            ))}
          </div>
          {unmappedFields.filter(f => !fileColsInfo.some(c => c.field === f)).length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #e2e8f0', background: '#fffbeb', fontSize: '12px', color: '#92400e' }}>
              ℹ️ غير موجود في هذا الملف: {unmappedFields.map(f => FIELD_LABELS[f]).join('، ')} — يمكن إدخالها يدوياً لاحقاً
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {mappedFields.length > 0 && (
        <div style={{ marginBottom: '14px', overflowX: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
            معاينة أول {previewRows.length} صفوف:
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {mappedFields.map(f => (
                  <th key={f} style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#475569', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
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

      {/* Confirm */}
      {existingCount > 0 ? (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontWeight: '800', color: '#9a3412', marginBottom: '12px', fontSize: '13px', display: 'flex', gap: '6px' }}>
            <span>⚠</span> القائمة تحتوي {existingCount} مشارك حالي:
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => onConfirm(participants, 'replace')}
              style={{ flex: '1 1 160px', background: '#dc2626', border: 'none' }}>
              🔄 استبدل بالكامل
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>يُحذف القديم ويُضاف {participants.length} جديد</span>
            </button>
            <button className="btn btn-primary" onClick={() => onConfirm(participants, 'add')} style={{ flex: '1 1 160px' }}>
              ➕ أضف للقائمة
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>المجموع: {existingCount + participants.length}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button className="btn btn-ghost btn-sm" onClick={onRemap}>✎ تعديل الربط</button>
            {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>إلغاء</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onConfirm(participants, 'replace')}>
            ✓ تأكيد الاستيراد ({participants.length} مشارك)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRemap}>✎ تعديل الربط</button>
          {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>إلغاء</button>}
        </div>
      )}
    </div>
  );
}

/* ── Column Mapper ────────────────────────────────────────────────────────────── */
function ColumnMapper({ headers, colMap: initialColMap, onConfirm, onCancel }) {
  const initMap = {};
  for (const field of Object.keys(FIELD_LABELS)) {
    const autoIdx = initialColMap?.[field];
    initMap[field] = (autoIdx != null && autoIdx >= 0) ? String(autoIdx) : '';
  }
  const [map, setMap] = useState(initMap);

  return (
    <div>
      <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', fontSize: '13px', color: '#b45309', marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <span>⚠</span>
        <div>حدد ربط الأعمدة يدوياً. اترك الحقول غير الموجودة في الملف فارغة.</div>
      </div>
      {headers.length > 0 && (
        <div style={{ padding: '10px 14px', marginBottom: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>أعمدة الملف:</strong>{' '}
          {headers.map((h, i) => h ? `[${i + 1}] ${h}` : null).filter(Boolean).join(' · ')}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <div key={field} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{label}</label>
            <select className="form-input" value={map[field]} onChange={e => setMap(m => ({ ...m, [field]: e.target.value }))}>
              <option value="">— غير موجود —</option>
              {headers.map((h, i) => h ? <option key={i} value={String(i)}>[{i+1}] {h}</option> : null)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={() => {
          const resolved = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v === '' ? -1 : parseInt(v, 10)]));
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
  const [mode,      setMode]      = useState('choose');
  const [pasteText, setPasteText] = useState('');
  const [pending,   setPending]   = useState(null);
  const [drag,      setDrag]      = useState(false);
  const [error,     setError]     = useState('');
  const [pendingSource, setPendingSource] = useState(null);

  const handleParsed = (rawRows, source = null) => {
    const result = parseRawRows(rawRows);
    if (result.participants.length === 0) {
      setError('لم يُعثر على بيانات. تأكد من وجود أسماء أو بيانات قابلة للقراءة.');
      setMode('choose');
      return;
    }
    setPendingSource(source);
    setPending({ rawRows, headers: result.headers, colMap: result.colMap, result });
    setMode('preview');
  };

  const handleImageText = (text, source) => {
    setError('');
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    const firstLine = lines[0] || '';
    let sep = ',';
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';')) sep = ';';
    const rawRows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
    if (rawRows[0]?.length === 1) {
      const participants = lines.filter(l => l.trim()).map((l, i) => {
        const p = { id: `I_${Date.now()}_${i}`, name: cleanName(l.trim()), nationalId: '', email: '', phone: '', organization: '', jobTitle: '' };
        p.errors = validateParticipant(p); p.corrected = false; p.isDuplicate = false;
        return p;
      }).filter(p => p.name);
      if (!participants.length) { setError('لم يُعثر على أسماء في النتيجة.'); return; }
      const mockColMap = { name: 0, nationalId: -1, email: -1, phone: -1, organization: -1, jobTitle: -1 };
      setPendingSource(source);
      setPending({ rawRows, headers: ['الاسم'], colMap: mockColMap, result: { participants, headers: ['الاسم'], colMap: mockColMap } });
      setMode('preview');
    } else {
      handleParsed(rawRows, source);
    }
  };

  const handlePreviewConfirm = (participants, mode) => onData(participants, mode);
  const handleMapConfirm = (colMap) => {
    if (!pending) return;
    const result = parseRawRows(pending.rawRows, colMap);
    setPending(p => ({ ...p, colMap, result }));
    setMode('preview');
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    // Images → go to image mode
    if (IMAGE_EXTS.includes(ext)) { setMode('image'); setError(''); return; }
    if (ext === 'pdf') {
      setError('ملفات PDF — افتح الملف، حدد الجدول، انسخه (Ctrl+C) ولصقه في تبويب "لصق".');
      return;
    }
    if (['docx', 'doc'].includes(ext)) {
      setError('ملفات Word — افتح الملف، حدد الجدول، انسخه (Ctrl+C) ولصقه في تبويب "لصق".');
      return;
    }
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { setError('صيغة غير مدعومة.'); return; }
    setError(''); setMode('loading');
    try {
      const buf = await file.arrayBuffer();
      const wb = read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = utils.sheet_to_json(ws, { header: 1, defval: '' });
      handleParsed(rawRows, 'excel');
    } catch {
      setError('تعذر قراءة الملف. تأكد أنه غير محمي بكلمة مرور.');
      setMode('choose');
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    setError('');
    const lines = pasteText.trim().split(/\r?\n/).filter(l => l.trim());
    const firstLine = lines[0] || '';
    let sep = '\t';
    if (!firstLine.includes('\t')) { if (firstLine.includes(',')) sep = ','; else if (firstLine.includes(';')) sep = ';'; }
    const rawRows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
    if (rawRows[0].length === 1) {
      const participants = lines.filter(l => l.trim()).map((l, i) => {
        const p = { id: `I_${Date.now()}_${i}`, name: cleanName(l.trim()), nationalId: '', email: '', phone: '', organization: '', jobTitle: '' };
        p.errors = validateParticipant(p); p.corrected = false; p.isDuplicate = false;
        return p;
      }).filter(p => p.name);
      if (!participants.length) { setError('لم يُعثر على أسماء.'); return; }
      const mockColMap = { name: 0, nationalId: -1, email: -1, phone: -1, organization: -1, jobTitle: -1 };
      setPendingSource('paste');
      setPending({ rawRows, headers: ['الاسم'], colMap: mockColMap, result: { participants, headers: ['الاسم'], colMap: mockColMap } });
      setMode('preview');
    } else { handleParsed(rawRows, 'paste'); }
  };

  const TABS = [
    { id: 'choose', label: 'ملف Excel / CSV', icon: '📎' },
    { id: 'image',  label: 'استيراد من صورة',  icon: '🖼️' },
    { id: 'paste',  label: 'لصق من إيميل',     icon: '📋' },
  ];

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
          source={pendingSource}
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

      {['choose', 'image', 'paste'].includes(mode) && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '20px', border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            {TABS.map((tab, idx) => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); }} style={{
                flex: 1, padding: '10px 6px',
                background: mode === tab.id ? 'var(--primary)' : 'white',
                color: mode === tab.id ? 'white' : 'var(--text-light)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif', fontSize: '12.5px', fontWeight: '700',
                transition: 'all 0.18s',
                borderLeft: idx > 0 ? '1.5px solid var(--border)' : 'none',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Excel tab */}
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
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>اسحب ملف Excel هنا أو انقر للاختيار</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>يتعرف على الأعمدة تلقائياً</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div style={{ display: 'inline-flex', gap: '8px' }}>
                  {['Excel (.xlsx)', 'CSV'].map(f => (
                    <span key={f} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(42,99,100,0.08)', color: 'var(--primary)', fontSize: '12px', fontWeight: '700', border: '1px solid rgba(42,99,100,0.2)' }}>{f}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12.5px', color: 'var(--text-light)' }}>
                <strong style={{ color: 'var(--text)' }}>لديك صورة أو PDF؟</strong>{' '}
                استخدم تبويب "استيراد من صورة" أو "لصق".
              </div>
            </>
          )}

          {/* Image tab */}
          {mode === 'image' && (
            <ImageImportZone
              onTextReady={handleImageText}
              onCancel={onCancel}
            />
          )}

          {/* Paste tab */}
          {mode === 'paste' && (
            <div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8', marginBottom: '14px', display: 'flex', gap: '8px' }}>
                <span style={{ flexShrink: 0, fontSize: 16 }}>💡</span>
                <div>افتح ملف وورد أو PDF أو إيميل، حدد الجدول، انسخه (Ctrl+C)، ثم الصق هنا (Ctrl+V).</div>
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
                <button className="btn btn-primary" onClick={handlePaste} disabled={!pasteText.trim()}>تحليل البيانات →</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setPasteText(''); setError(''); }}>مسح</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
