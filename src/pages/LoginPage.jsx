import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NaissLogo } from '../components/Layout';

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
    border: `1.5px solid ${hasErr ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'Cairo, Tahoma, sans-serif',
    outline: 'none',
    color: '#0f172a',
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
      {/* ── RIGHT: Branding panel (50%) ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(160deg, #0b1e1f 0%, #112b2c 45%, #1d4243 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative concentric rings */}
        {[320, 520, 720].map((sz, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: sz, height: sz,
            border: `1px solid rgba(199,176,140,${0.055 - i * 0.012})`,
            borderRadius: '50%',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Gold horizontal rule top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #C7B08C, transparent)',
          opacity: 0.5,
        }} />

        <div style={{ position: 'relative', textAlign: 'center', padding: '0 40px' }}>
          {/* Logo in white container */}
          <div style={{
            background: 'white',
            borderRadius: '14px',
            padding: '16px 28px',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}>
            <NaissLogo size={220} />
          </div>

          {/* Divider */}
          <div style={{
            width: '48px', height: '1px',
            background: 'rgba(199,176,140,0.35)',
            margin: '32px auto',
          }} />

          <div style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.5px',
          }}>
            منصة جاهزية المشاركين
          </div>
        </div>

        {/* Gold horizontal rule bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #C7B08C, transparent)',
          opacity: 0.5,
        }} />
      </div>

      {/* ── LEFT: Login form panel (50%) ── */}
      <div style={{
        flex: 1,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 52px',
        boxShadow: '-24px 0 64px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, #2A6364, #C7B08C, #2A6364)',
        }} />

        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Heading */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '28px', fontWeight: '900', color: '#0f172a',
              lineHeight: 1.2, margin: 0,
            }}>
              تسجيل الدخول
            </h1>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="example@nauss.edu.sa"
                disabled={loading}
                style={{ ...inputBase(!!error), direction: 'ltr', textAlign: 'left' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                disabled={loading}
                style={{ ...inputBase(!!error), direction: 'ltr', textAlign: 'left', fontSize: '16px' }}
                onFocus={e => { e.target.style.borderColor = '#2A6364'; e.target.style.boxShadow = '0 0 0 3px rgba(42,99,100,0.1)'; }}
                onBlur={e  => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
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
                background: loading ? '#4a8a8b' : 'linear-gradient(135deg, #2A6364 0%, #1e4b4c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '800',
                fontFamily: 'Cairo, Tahoma, sans-serif',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(42,99,100,0.3)',
              }}
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
              ) : 'دخول →'}
            </button>
          </form>

          {/* Register link */}
          <div style={{
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>ليس لديك حساب؟ </span>
            <button
              onClick={onRegister}
              style={{
                background: 'none', border: 'none',
                color: '#2A6364', fontSize: '13px', fontWeight: '800',
                cursor: 'pointer', fontFamily: 'Cairo, Tahoma, sans-serif',
                textDecoration: 'underline', textUnderlineOffset: '3px',
                padding: 0,
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
