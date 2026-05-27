import { useRef, useState } from 'react';

export const COLS = [
  { key: 'name',         label: 'الاسم الكامل',        required: true,  width: 200,
    validate: v => v?.trim() ? null : 'الاسم مطلوب' },
  { key: 'nationalId',   label: 'رقم الهوية',          required: true,  width: 130,
    validate: v => /^\d{10}$/.test(v?.trim() || '') ? null : '10 أرقام' },
  { key: 'email',        label: 'البريد الإلكتروني',   required: true,  width: 210,
    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v?.trim() || '') ? null : 'تنسيق خاطئ' },
  { key: 'phone',        label: 'رقم الجوال',          required: true,  width: 130,
    validate: v => /^05\d{8}$/.test(v?.trim() || '') ? null : 'يبدأ بـ 05' },
  { key: 'organization', label: 'الجهة',               required: true,  width: 190,
    validate: v => v?.trim() ? null : 'الجهة مطلوبة' },
  { key: 'jobTitle',     label: 'المسمى الوظيفي',      required: false, width: 170,
    validate: () => null },
];

const getErr = (p, colKey) => {
  const col = COLS.find(c => c.key === colKey);
  return col ? col.validate(p[colKey]) : null;
};

const findDupIds = (rows) => {
  const seen = {};
  rows.forEach(p => { if (p.nationalId?.trim()) seen[p.nationalId.trim()] = (seen[p.nationalId.trim()] || 0) + 1; });
  return Object.keys(seen).filter(k => seen[k] > 1);
};

export const countErrors = (rows) => {
  const dups = findDupIds(rows);
  return rows.reduce((sum, p) => {
    const fieldErrs = COLS.filter(c => c.required && getErr(p, c.key)).length;
    const dupErr = dups.includes(p.nationalId?.trim()) ? 1 : 0;
    return sum + (fieldErrs > 0 || dupErr > 0 ? 1 : 0);
  }, 0);
};

export default function EditableTable({ rows, onChange, readOnly = false }) {
  const inputRefs = useRef({});
  const [activeCell, setActiveCell] = useState(null);
  const dups = findDupIds(rows);

  const update = (idx, key, value) => {
    const next = rows.map((r, i) => i === idx ? { ...r, [key]: value } : r);
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, { id: `R_${Date.now()}`, name: '', nationalId: '', email: '', phone: '', organization: '', jobTitle: '' }]);
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== idx));
  };

  const handleKey = (e, ri, ci) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const next = ci + (e.shiftKey ? -1 : 1);
      if (next >= 0 && next < COLS.length) {
        inputRefs.current[`${ri}-${next}`]?.focus();
      } else if (next >= COLS.length) {
        if (ri + 1 < rows.length) inputRefs.current[`${ri + 1}-0`]?.focus();
        else { addRow(); setTimeout(() => inputRefs.current[`${ri + 1}-0`]?.focus(), 40); }
      } else if (next < 0 && ri > 0) {
        inputRefs.current[`${ri - 1}-${COLS.length - 1}`]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (ri + 1 < rows.length) inputRefs.current[`${ri + 1}-${ci}`]?.focus();
      else { addRow(); setTimeout(() => inputRefs.current[`${ri + 1}-${ci}`]?.focus(), 40); }
    } else if (e.key === 'Escape') {
      inputRefs.current[`${ri}-${ci}`]?.blur();
    }
  };

  const totalErrs = countErrors(rows);

  return (
    <div>
      {/* Status bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', padding: '8px 12px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <span style={{ fontWeight: '700', color: 'var(--text)' }}>👥 {rows.length} مشارك</span>
        {totalErrs > 0
          ? <span className="badge badge-errors">⚠ {totalErrs} سطر يحتاج مراجعة</span>
          : rows.length > 0 && <span className="badge badge-approved">✓ جميع البيانات سليمة</span>
        }
        {dups.length > 0 && <span className="badge badge-errors">⚡ {dups.length} هوية مكررة</span>}
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px', maxHeight: '55vh', overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', minWidth: 900 }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
            {!readOnly && <col style={{ width: 36 }} />}
          </colgroup>
          <thead>
            <tr style={{ background: '#f3f7f6', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={TH}>#</th>
              {COLS.map(c => (
                <th key={c.key} style={TH}>
                  {c.label}
                  {c.required && !readOnly && <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>}
                </th>
              ))}
              {!readOnly && <th style={TH}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, ri) => {
              const isDup = dups.includes(p.nationalId?.trim());
              return (
                <tr key={p.id || ri} style={{ background: isDup ? '#fdf5f7' : ri % 2 === 0 ? 'white' : '#fafcfb' }}>
                  <td style={{ ...TD, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{ri + 1}</td>
                  {COLS.map((col, ci) => {
                    const err = col.required ? getErr(p, col.key) : null;
                    const active = activeCell?.ri === ri && activeCell?.ci === ci;
                    return (
                      <td key={col.key} style={{ ...TD, padding: '3px 4px' }}>
                        {readOnly ? (
                          <div style={{ padding: '6px 8px', fontSize: '13.5px', color: err ? 'var(--danger)' : undefined }}>
                            {p[col.key] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                          </div>
                        ) : (
                          <div>
                            <input
                              ref={el => { if (el) inputRefs.current[`${ri}-${ci}`] = el; }}
                              value={p[col.key] || ''}
                              onChange={e => update(ri, col.key, e.target.value)}
                              onKeyDown={e => handleKey(e, ri, ci)}
                              onFocus={() => setActiveCell({ ri, ci })}
                              onBlur={() => setActiveCell(null)}
                              placeholder={col.label}
                              style={{
                                width: '100%', fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif',
                                direction: 'rtl', fontSize: '13.5px',
                                padding: '6px 8px',
                                border: err ? '1.5px solid var(--danger)' : active ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                                borderRadius: '6px',
                                background: err ? '#fff5f7' : active ? 'white' : 'transparent',
                                outline: 'none', transition: 'all 0.12s',
                              }}
                            />
                            {err && <div style={{ fontSize: '10.5px', color: 'var(--danger)', padding: '1px 8px 2px' }}>⚠ {err}</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td style={TD}>
                      <button
                        onClick={() => removeRow(ri)}
                        title="حذف الصف"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '15px', padding: '4px 6px', borderRadius: '4px', lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                      >✕</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '8px' }}
          onClick={addRow}
        >
          + إضافة صف
        </button>
      )}
    </div>
  );
}

const TH = {
  padding: '10px 10px', fontWeight: 700, fontSize: '12.5px',
  color: 'var(--text-light)', textAlign: 'right',
  borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
};
const TD = { borderBottom: '1px solid var(--border)', verticalAlign: 'top' };
