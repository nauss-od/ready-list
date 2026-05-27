import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NaissLogo } from '../components/Layout';

export default function RegisterPage({ onBack }) {
  const { register } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 3)  e.name    = 'الاسم مطلوب (3 أحرف على الأقل)';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صالح';
    if (!form.password || form.password.length < 6)        e.password = 'كلمة المرور 6 أحرف على الأقل';
    if (form.password !== form.confirm)                    e.confirm  = 'كلمتا المرور غير متطابقتين';
    if (!form.role)                                        e.role     = 'يرجى اختيار الإدارة';
    return e;
  };

  const set = (k) => (ev) => {
    setForm(f => ({ ...f, [k]: ev.target.value }));
    setErrors(e => ({ ...e, [k]: undefined }));
    setServerError('');
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    setTimeout(() => {
      const result = register(form);
      if (!result.ok) {
        setServerError(result.error);
        setLoading(false);
      }
    }, 600);
  };

  const inputStyle = (hasErr) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px',
    border: `2px solid ${hasErr ? '#fecaca' : '#e2e8f0'}`,
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Cairo, Tahoma, sans-serif',
    outline: 'none',
    color: '#0f172a',
    transition: 'border-color 0.18s',
    background: 'white',
  });

  const roles = [
    { value: 'business_dev', label: 'تطوير الأعمال', desc: 'رفع قوائم المشاركين واعتمادها' },
    { value: 'training_ops', label: 'عمليات التدريب', desc: 'استلام القوائم وتصديرها لـ LMS' },
  ];

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #0d2626 0%, #1a3f40 50%, #2A6364 100%)',
      display: 'flex',
      fontFamily: 'Cairo, Tahoma, sans-serif',
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      {/* Left branding panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #030c0d 0%, #091b1c 40%, #122e2f 75%, #1d4243 100%)',
      }}>
        {/* Geometric tile pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect x='17' y='17' width='22' height='22' fill='none' stroke='%23C7B08C' stroke-width='0.5' transform='rotate(0 28 28)'/%3E%3Crect x='17' y='17' width='22' height='22' fill='none' stroke='%23C7B08C' stroke-width='0.5' transform='rotate(45 28 28)'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 56px', opacity: 0.04, pointerEvents: 'none',
        }} />
        {/* Gold lines top/bottom */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(199,176,140,0.5), transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(199,176,140,0.4), transparent)' }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          {/* NAUSS logo — white version via CSS filter */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: '32px',
          }}>
            <img
              src="/nauss-logo.png"
              alt="شعار جامعة نايف العربية للعلوم الأمنية"
              style={{
                width: 210,
                height: 'auto',
                filter: 'brightness(0) invert(1)',
                opacity: 0.88,
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(199,176,140,0.2)' }} />
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(199,176,140,0.5)' }} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(199,176,140,0.2)' }} />
          </div>

          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15px', fontWeight: '700', letterSpacing: '0.4px' }}>
            منصة جاهزية المشاركين
          </div>
          <div style={{ color: 'rgba(199,176,140,0.4)', fontSize: '10px', letterSpacing: '2.5px', marginTop: '7px', fontWeight: '600' }}>
            PARTICIPANT READINESS PLATFORM
          </div>
        </div>
      </div>

      {/* Right register panel */}
      <div style={{
        flex: 1,
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 52px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.35)',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{
            display: 'flex', justifyContent: 'center',
            marginBottom: '24px', paddingBottom: '20px',
            borderBottom: '1px solid #edf1f7',
          }}>
            <NaissLogo size={180} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0d1a1a', lineHeight: 1.2, letterSpacing: '-0.4px' }}>
              إنشاء حساب جديد
            </h1>
            <p style={{ fontSize: '13px', color: '#7a9898', marginTop: '5px' }}>أنشئ حسابك للوصول إلى المنصة</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '7px' }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="مثال: حسن محمد"
                disabled={loading}
                style={inputStyle(errors.name)}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = errors.name ? '#fecaca' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.name}</div>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '7px' }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="example@nauss.edu.sa"
                disabled={loading}
                style={{ ...inputStyle(errors.email), direction: 'ltr', textAlign: 'left' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = errors.email ? '#fecaca' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.email && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.email}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '7px' }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                disabled={loading}
                style={{ ...inputStyle(errors.password), direction: 'ltr', textAlign: 'left' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = errors.password ? '#fecaca' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.password && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.password}</div>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '7px' }}>
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="••••••••"
                disabled={loading}
                style={{ ...inputStyle(errors.confirm), direction: 'ltr', textAlign: 'left' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = errors.confirm ? '#fecaca' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.confirm && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.confirm}</div>}
            </div>

            {/* Role selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>
                الإدارة
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, role: r.value })); setErrors(e => ({ ...e, role: undefined })); }}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '10px',
                      border: `2px solid ${form.role === r.value ? '#2A6364' : errors.role ? '#fecaca' : '#e2e8f0'}`,
                      background: form.role === r.value ? 'rgba(42,99,100,0.06)' : 'white',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all 0.18s',
                      fontFamily: 'Cairo, Tahoma, sans-serif',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '700', color: form.role === r.value ? '#2A6364' : '#1e293b' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
              {errors.role && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.role}</div>}
            </div>

            {serverError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '11px 14px',
                fontSize: '13px', color: '#b91c1c',
                marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: 16 }}>⚠</span> {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#4a8a8b' : '#2A6364',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '800',
                fontFamily: 'Cairo, Tahoma, sans-serif',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18,
                    border: '2.5px solid rgba(255,255,255,0.35)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  جارٍ إنشاء الحساب...
                </>
              ) : 'إنشاء الحساب →'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{
                background: 'none', border: 'none',
                color: '#2A6364', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif',
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              ← العودة إلى تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
