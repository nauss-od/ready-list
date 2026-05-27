import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NaissLogo } from '../components/Layout';

/* ── Geometric 8-pointed star SVG (NAUSS-inspired, decorative) ─── */
const GeometricStar = ({ size = 260, opacity = 1 }) => (
  <svg
    viewBox="0 0 200 200"
    width={size} height={size}
    style={{ display: 'block', opacity }}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer faint ring */}
    <circle cx="100" cy="100" r="96" stroke="rgba(199,176,140,0.08)" strokeWidth="1"/>
    <circle cx="100" cy="100" r="82" stroke="rgba(199,176,140,0.1)" strokeWidth="0.8"/>

    {/* 8-pointed star polygon */}
    <polygon
      points="100,10 114,65 164,36 135,86 190,100 135,114 164,164 114,135 100,190 86,135 36,164 65,114 10,100 65,86 36,36 86,65"
      fill="rgba(199,176,140,0.055)"
      stroke="rgba(199,176,140,0.28)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />

    {/* Two overlapping squares — inner star frame */}
    <rect x="58" y="58" width="84" height="84"
      stroke="rgba(199,176,140,0.18)" strokeWidth="1"
      transform="rotate(0 100 100)"
    />
    <rect x="58" y="58" width="84" height="84"
      stroke="rgba(199,176,140,0.18)" strokeWidth="1"
      transform="rotate(45 100 100)"
    />

    {/* Inner ring */}
    <circle cx="100" cy="100" r="28" stroke="rgba(199,176,140,0.14)" strokeWidth="1"/>

    {/* Center glow dots */}
    <circle cx="100" cy="100" r="5" fill="rgba(199,176,140,0.35)"/>
    <circle cx="100" cy="100" r="2.5" fill="rgba(199,176,140,0.7)"/>
  </svg>
);

export default function LoginPage({ onRegister }) {
  const { login } = useApp();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = login(email.trim(), password);
      if (!ok) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        setLoading(false);
      }
    }, 650);
  };

  const inputBase = (hasErr) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '12px 16px',
    border: `1.5px solid ${hasErr ? '#fca5a5' : '#dde4ec'}`,
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Cairo, Tahoma, sans-serif',
    outline: 'none',
    color: '#0d1a1a',
    background: 'white',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  });

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      fontFamily: 'Cairo, Tahoma, sans-serif',
      direction: 'rtl',
      overflow: 'hidden',
    }}>

      {/* ══ RIGHT — Dark Branding Panel (50%) ══ */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(160deg, #030c0d 0%, #091b1c 40%, #122e2f 75%, #1d4243 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Islamic geometric tile background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect x='17' y='17' width='22' height='22' fill='none' stroke='%23C7B08C' stroke-width='0.5' transform='rotate(0 28 28)'/%3E%3Crect x='17' y='17' width='22' height='22' fill='none' stroke='%23C7B08C' stroke-width='0.5' transform='rotate(45 28 28)'/%3E%3Ccircle cx='28' cy='28' r='1.2' fill='%23C7B08C' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 56px',
          opacity: 0.04,
          pointerEvents: 'none',
        }} />

        {/* Gold line at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(199,176,140,0.5), transparent)',
        }} />

        {/* Gold line at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(199,176,140,0.4), transparent)',
        }} />

        {/* Main decorative content */}
        <div style={{ position: 'relative', textAlign: 'center', padding: '0 48px' }}>

          {/* Large geometric star — hero element */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '32px',
            filter: 'drop-shadow(0 0 40px rgba(199,176,140,0.12))',
          }}>
            <GeometricStar size={240} />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(199,176,140,0.2)' }} />
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(199,176,140,0.5)' }} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(199,176,140,0.2)' }} />
          </div>

          {/* Platform name */}
          <div style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '15px',
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}>
            منصة جاهزية المشاركين
          </div>

          <div style={{
            color: 'rgba(199,176,140,0.45)',
            fontSize: '10px',
            letterSpacing: '2.5px',
            marginTop: '8px',
            fontWeight: '600',
          }}>
            PARTICIPANT READINESS PLATFORM
          </div>
        </div>
      </div>

      {/* ══ LEFT — Login Form Panel (50%) ══ */}
      <div style={{
        flex: 1,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 52px',
        boxShadow: '-28px 0 80px rgba(0,0,0,0.25)',
        position: 'relative',
        overflowY: 'auto',
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, #2A6364, #C7B08C, #2A6364)',
        }} />

        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Logo — natural white background */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px',
            paddingBottom: '28px',
            borderBottom: '1px solid #edf1f7',
          }}>
            <NaissLogo size={200} />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '28px', fontWeight: '900', color: '#0d1a1a',
              lineHeight: 1.2, margin: 0, letterSpacing: '-0.5px',
            }}>
              تسجيل الدخول
            </h1>
            <p style={{ fontSize: '13px', color: '#7a9898', marginTop: '6px' }}>
              أدخل بيانات حسابك للمتابعة
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block', fontSize: '11.5px', fontWeight: '700',
                color: '#3d5a5a', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="example@nauss.edu.sa"
                disabled={loading}
                style={{ ...inputBase(!!error), direction: 'ltr', textAlign: 'left' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1), 0 2px 8px rgba(42,99,100,0.07)'; }}
                onBlur={e  => { e.target.style.borderColor = error ? '#fca5a5' : '#dde4ec'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block', fontSize: '11.5px', fontWeight: '700',
                color: '#3d5a5a', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={loading}
                style={{ ...inputBase(!!error), direction: 'ltr', textAlign: 'left', fontSize: '16px' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1), 0 2px 8px rgba(42,99,100,0.07)'; }}
                onBlur={e  => { e.target.style.borderColor = error ? '#fca5a5' : '#dde4ec'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', padding: '11px 14px',
                fontSize: '13px', color: '#b91c1c',
                marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: 16 }}>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading
                  ? '#4a8a8b'
                  : 'linear-gradient(135deg, #2A6364 0%, #1e4b4c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '800',
                fontFamily: 'Cairo, Tahoma, sans-serif',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.22s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: loading ? 'none' : '0 6px 22px rgba(42,99,100,0.32)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 10px 32px rgba(42,99,100,0.42)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 22px rgba(42,99,100,0.32)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18,
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  جارٍ التحقق...
                </>
              ) : 'دخول ←'}
            </button>
          </form>

          {/* Register link */}
          <div style={{
            marginTop: '28px', paddingTop: '24px',
            borderTop: '1px solid #edf1f7', textAlign: 'center',
          }}>
            <span style={{ fontSize: '13px', color: '#7a9898' }}>ليس لديك حساب؟ </span>
            <button
              onClick={onRegister}
              style={{
                background: 'none', border: 'none',
                color: '#2A6364', fontSize: '13px', fontWeight: '800',
                cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif',
                textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0,
              }}
            >
              إنشاء حساب جديد
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
