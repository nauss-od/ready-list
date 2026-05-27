import { useState, useRef, useCallback } from 'react';
import { read, utils } from 'xlsx';
import { mapExcelRows } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { errorLabels } from '../data/mockData';

const ACCEPTED = '.xlsx,.xls,.csv';

export default function UploadModal({ course, onClose }) {
  const { uploadParticipants } = useApp();
  const inputRef = useRef();
  const [step, setStep] = useState('drop'); // drop | parsing | preview | done
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [headers, setHeaders] = useState([]);

  const parseFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('صيغة الملف غير مدعومة. استخدم xlsx أو csv فقط.');
      return;
    }
    setFilename(file.name);
    setStep('parsing');
    setError('');
    try {
      const data = await file.arrayBuffer();
      const wb = read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });
      const { participants, mapping, headers: hdrs } = mapExcelRows(rows);

      if (participants.length === 0) {
        setError('لم يتم العثور على بيانات في الملف. تأكد من أن الصف الأول يحتوي على رؤوس الأعمدة.');
        setStep('drop');
        return;
      }

      const unmapped = Object.entries(mapping).filter(([k, v]) => v < 0).map(([k]) => k);
      setHeaders(hdrs);
      setParsed({ participants, mapping, unmapped, raw: rows });
      setStep('preview');
    } catch (e) {
      setError('تعذر قراءة الملف. تأكد أن الملف غير محمي بكلمة مرور.');
      setStep('drop');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleConfirm = () => {
    uploadParticipants(course.id, parsed.participants, filename);
    setStep('done');
    setTimeout(onClose, 1200);
  };

  const errCount = parsed?.participants.filter(p => p.errors.length > 0).length ?? 0;
  const fieldNames = {
    name: 'الاسم', nationalId: 'رقم الهوية', email: 'البريد الإلكتروني',
    phone: 'رقم الجوال', organization: 'الجهة', jobTitle: 'المسمى الوظيفي',
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'preview' ? '800px' : '520px' }}>
        <div className="modal-header">
          <h3>رفع قائمة المشاركين — {course.name}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* DROP STEP */}
          {step === 'drop' && (
            <>
              {error && <div className="alert alert-danger mb-12"><span>⚠️</span>{error}</div>}
              <div
                className={`upload-zone ${drag ? 'active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div style={{ fontSize: '44px', marginBottom: '12px' }}>📂</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                  اسحب الملف هنا أو انقر للاختيار
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '12px' }}>
                  الصيغ المقبولة: <strong>Excel (.xlsx .xls)</strong> و <strong>CSV (.csv)</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--gray)', padding: '6px 14px', borderRadius: '20px', display: 'inline-block' }}>
                  يُتوقع وجود رؤوس أعمدة في الصف الأول (الاسم، الهوية، البريد، الجوال، الجهة...)
                </div>
                <input ref={inputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }}
                  onChange={e => parseFile(e.target.files[0])} />
              </div>
            </>
          )}

          {/* PARSING STEP */}
          {step === 'parsing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40, borderWidth: 4 }} />
              <div style={{ fontSize: '16px', fontWeight: '700' }}>جارٍ قراءة الملف ومعالجة البيانات...</div>
              <div style={{ color: 'var(--text-light)', fontSize: '13px', marginTop: '6px' }}>{filename}</div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && parsed && (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 120px', background: 'var(--primary)', color: 'white', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800' }}>{parsed.participants.length}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>إجمالي المشاركين</div>
                </div>
                <div style={{ flex: '1 1 120px', background: errCount > 0 ? 'var(--danger-light)' : 'var(--success-light)', borderRadius: 10, padding: '12px 16px', border: `1px solid ${errCount > 0 ? '#e8c0cc' : '#b6dfc4'}` }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: errCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{errCount}</div>
                  <div style={{ fontSize: '12px', color: errCount > 0 ? 'var(--danger)' : 'var(--success)' }}>بيانات تحتاج تصحيح</div>
                </div>
                <div style={{ flex: '1 1 120px', background: 'var(--white)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)' }}>{parsed.participants.length - errCount}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>بيانات سليمة</div>
                </div>
              </div>

              {/* Unmapped columns warning */}
              {parsed.unmapped.length > 0 && (
                <div className="alert alert-warning mb-12">
                  <span>⚠️</span>
                  <div>
                    <strong>أعمدة لم يتم التعرف عليها تلقائياً:</strong>{' '}
                    {parsed.unmapped.map(k => fieldNames[k]).join('، ')}
                    <br /><span style={{ fontSize: '12px' }}>ستظهر هذه الحقول فارغة وستُعدّ أخطاء يجب تصحيحها لاحقاً.</span>
                  </div>
                </div>
              )}

              {/* Source file */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                الملف المصدر: <strong>{filename}</strong>
                {' '} — الأعمدة المكتشفة: {headers.join('، ')}
              </div>

              {/* Participant preview table */}
              <div className="table-wrap" style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table className="data-table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>رقم الهوية</th>
                      <th>البريد الإلكتروني</th>
                      <th>الجوال</th>
                      <th>الجهة</th>
                      <th>حالة البيانات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.participants.map((p, i) => (
                      <tr key={p.id} style={p.errors.length > 0 ? { background: '#fdf5f7' } : {}}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.name || <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>مفقود</span>}</td>
                        <td style={{ color: p.errors.includes('invalid_id') ? 'var(--danger)' : undefined }}>{p.nationalId || '—'}</td>
                        <td style={{ color: p.errors.includes('invalid_email') ? 'var(--danger)' : undefined, fontSize: 12 }}>{p.email || '—'}</td>
                        <td style={{ color: p.errors.includes('invalid_phone') ? 'var(--danger)' : undefined }}>{p.phone || '—'}</td>
                        <td style={{ color: p.errors.includes('missing_org') ? 'var(--danger)' : undefined, fontSize: 12 }}>{p.organization || '—'}</td>
                        <td>
                          {p.errors.length === 0
                            ? <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 12 }}>✓ سليم</span>
                            : <div>{p.errors.map(e => (
                                <div key={e} style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>⚠ {errorLabels[e]}</div>
                              ))}</div>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* DONE STEP */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--success)' }}>تم رفع القائمة بنجاح</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'preview' && (
            <>
              <button className="btn btn-primary" onClick={handleConfirm}>
                ✅ تأكيد الرفع ({parsed.participants.length} مشارك)
              </button>
              <button className="btn btn-ghost" onClick={() => { setParsed(null); setStep('drop'); }}>
                ↩ تغيير الملف
              </button>
            </>
          )}
          {step === 'drop' && (
            <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          )}
        </div>
      </div>
    </div>
  );
}
