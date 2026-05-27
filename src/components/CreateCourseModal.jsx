import { useState } from 'react';
import { useApp } from '../context/AppContext';

const today = new Date().toISOString().slice(0, 10);
const empty = { name: '', startDate: '', endDate: '', location: '', capacity: '20', nominationLetter: '' };

export default function CreateCourseModal({ onClose, onCreated }) {
  const { createCourse } = useApp();
  const [form, setForm]     = useState(empty);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name     = 'اسم النشاط مطلوب';
    if (!form.startDate)        e.startDate = 'تاريخ النشاط مطلوب';
    if (!form.location.trim())  e.location  = 'مقر الانعقاد مطلوب';
    if (!form.capacity || isNaN(form.capacity) || Number(form.capacity) < 1)
      e.capacity = 'يجب إدخال عدد المتدربين';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const id = createCourse(form);
    if (onCreated) onCreated(id);
    else onClose();
  };

  const set = (k) => (ev) => {
    setForm(f => ({ ...f, [k]: ev.target.value }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>إضافة نشاط تدريبي جديد</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Step indicator */}
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '20px',
            padding: '12px 16px',
            background: '#f0f7f7',
            borderRadius: '10px',
            border: '1px solid #c6dede',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2A6364', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>1</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#2A6364' }}>بيانات النشاط</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>ستقوم برفع ملف الأسماء بعد الإنشاء</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* اسم النشاط */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                اسم النشاط التدريبي <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>
              </label>
              <input
                className={`form-input ${errors.name ? 'has-error' : ''}`}
                placeholder="مثال: إدارة الأزمات الأمنية"
                value={form.name}
                onChange={set('name')}
              />
              {errors.name && <div className="form-error">⚠ {errors.name}</div>}
            </div>

            {/* تاريخ النشاط */}
            <div className="form-group">
              <label className="form-label">
                تاريخ النشاط <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>
              </label>
              <input
                className={`form-input ${errors.startDate ? 'has-error' : ''}`}
                type="date" value={form.startDate}
                onChange={set('startDate')} min={today}
              />
              {errors.startDate && <div className="form-error">⚠ {errors.startDate}</div>}
            </div>

            {/* تاريخ الانتهاء */}
            <div className="form-group">
              <label className="form-label">
                تاريخ الانتهاء <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(اختياري)</span>
              </label>
              <input
                className="form-input"
                type="date" value={form.endDate}
                onChange={set('endDate')}
                min={form.startDate || today}
              />
            </div>

            {/* مقر الانعقاد */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                مقر الانعقاد <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>
              </label>
              <input
                className={`form-input ${errors.location ? 'has-error' : ''}`}
                placeholder="مثال: قاعة التدريب الرئيسية — الرياض"
                value={form.location}
                onChange={set('location')}
              />
              {errors.location && <div className="form-error">⚠ {errors.location}</div>}
            </div>

            {/* عدد المتدربين */}
            <div className="form-group">
              <label className="form-label">
                عدد المتدربين <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>
              </label>
              <input
                className={`form-input ${errors.capacity ? 'has-error' : ''}`}
                type="number" min="1" max="500"
                placeholder="20"
                value={form.capacity}
                onChange={set('capacity')}
              />
              {errors.capacity && <div className="form-error">⚠ {errors.capacity}</div>}
            </div>

            {/* خطاب الترشيح */}
            <div className="form-group">
              <label className="form-label">
                رقم خطاب الترشيح <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(اختياري)</span>
              </label>
              <input
                className="form-input"
                placeholder="مثال: خ/1234/2026"
                value={form.nominationLetter}
                onChange={set('nominationLetter')}
              />
            </div>
          </div>

          <div style={{
            marginTop: '8px', padding: '12px 16px',
            background: '#fffbeb', borderRadius: '10px',
            border: '1px solid #fcd34d',
            fontSize: '13px', color: '#b45309',
            display: 'flex', gap: '8px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div>بعد الإنشاء، ستتمكن من رفع ملف الأسماء بأي صيغة (Excel، PDF، Word، صورة، أو لصق من إيميل).</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSubmit}>إنشاء النشاط →</button>
          <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
