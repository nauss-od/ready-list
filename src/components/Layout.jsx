import { useApp, ROLE_LABELS } from '../context/AppContext';

/* ── NAUSS Logo (real image from public/) ─────────────────────────────────── */
export const NaissLogo = ({ size = 52 }) => (
  <img
    src="/nauss-logo.png"
    alt="شعار جامعة نايف العربية للعلوم الأمنية"
    style={{ width: size, height: 'auto', display: 'block' }}
  />
);

/* ── Navigation per role ──────────────────────────────────────────────────── */
const NAV = {
  business_dev: [
    { id: 'dashboard', icon: '◫', label: 'لوحة الرئيسية' },
    { id: 'courses',   icon: '◈', label: 'الأنشطة التدريبية' },
  ],
  training_ops: [
    { id: 'dashboard', icon: '◫', label: 'لوحة الرئيسية' },
    { id: 'approved',  icon: '◈', label: 'القوائم المعتمدة' },
    { id: 'history',   icon: '⏳', label: 'سجل التصدير' },
  ],
  manager: [
    { id: 'dashboard',  icon: '◫', label: 'لوحة المؤشرات' },
    { id: 'courses',    icon: '◈', label: 'جميع الأنشطة' },
    { id: 'quality',    icon: '◎', label: 'جودة البيانات' },
    { id: 'analytics',  icon: '◑', label: 'الرصد التشغيلي' },
    { id: 'users',      icon: '◉', label: 'المستخدمون' },
  ],
};

const ROLE_COLORS = {
  manager:      '#22c55e',
  business_dev: '#f59e0b',
  training_ops: '#3b82f6',
};

/* ── Role Switcher (manager only — lives in top bar) ─────────────────────── */
const ROLE_SWITCH = [
  { key: null,           label: 'مدير عام',        color: '#22c55e' },
  { key: 'business_dev', label: 'تطوير الأعمال',   color: '#f59e0b' },
  { key: 'training_ops', label: 'عمليات التدريب',  color: '#3b82f6' },
];

function RoleSwitcher() {
  const { viewRole, setViewRole } = useApp();
  return (
    <div style={{
      display: 'flex',
      gap: '3px',
      background: '#f0f4f8',
      border: '1.5px solid #dde4ec',
      borderRadius: '10px',
      padding: '3px',
    }}>
      {ROLE_SWITCH.map(r => {
        const active = viewRole === r.key;
        return (
          <button
            key={String(r.key)}
            onClick={() => setViewRole(r.key)}
            style={{
              padding: '5px 13px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'El Messiri, Cairo, Tahoma, sans-serif',
              fontSize: '12px',
              fontWeight: active ? '800' : '600',
              background: active ? 'white' : 'transparent',
              color: active ? '#0d1a1a' : '#7a9898',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.18s',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            {active && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: r.color,
                display: 'inline-block',
                boxShadow: `0 0 6px ${r.color}`,
              }} />
            )}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Layout({ children, activeView, onNavigate, topBarContent }) {
  const { currentUser, logout, viewRole } = useApp();
  const isManager = currentUser?.role === 'manager';
  // Show nav based on effective role
  const effectiveRole = (isManager && viewRole) ? viewRole : (currentUser?.role || 'manager');
  const items = NAV[effectiveRole] || [];
  const dotColor = ROLE_COLORS[effectiveRole];

  return (
    <div className="app-layout">
      {/* Sidebar — FIRST in DOM = RIGHT in RTL */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <NaissLogo size={158} />
        </div>

        <div className="sidebar-platform-badge">
          <span className="platform-name">منصة جاهزية المشاركين</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">القائمة</div>
          {items.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar-lg">
            {currentUser?.avatar || currentUser?.name?.[0] || 'م'}
          </div>
          <div className="user-meta">
            <h4>{currentUser?.name}</h4>
            <span>{ROLE_LABELS[currentUser?.role || 'manager']}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="تسجيل الخروج">⏻</button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        <div className="top-bar">
          <div className="top-bar-module">
            <div className="top-bar-module-dot" style={{ background: dotColor, color: dotColor }} />
            <span className="top-bar-module-name">{ROLE_LABELS[effectiveRole]}</span>
          </div>

          {/* Role switcher — only for manager */}
          {isManager && <RoleSwitcher />}

          {topBarContent}

          <div className="top-bar-date">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
}
