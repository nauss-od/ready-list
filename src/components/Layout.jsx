import { useApp, ROLE_LABELS } from '../context/AppContext';

/* ── NAUSS Logo (real image from public/) ────────────────────────────────────── */
export const NaissLogo = ({ size = 52 }) => (
  <img
    src="/nauss-logo.png"
    alt="شعار جامعة نايف العربية للعلوم الأمنية"
    style={{ width: size, height: 'auto', display: 'block' }}
  />
);

/* ── Navigation per role ─────────────────────────────────────────────────────── */
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
    { id: 'dashboard', icon: '◫', label: 'لوحة المؤشرات' },
    { id: 'courses',   icon: '◈', label: 'جميع الأنشطة' },
    { id: 'quality',   icon: '◎', label: 'جودة البيانات' },
    { id: 'users',     icon: '◉', label: 'المستخدمون' },
  ],
};

const ROLE_COLORS = {
  manager:      '#22c55e',
  business_dev: '#f59e0b',
  training_ops: '#3b82f6',
};

export default function Layout({ children, activeView, onNavigate, topBarContent }) {
  const { currentUser, logout } = useApp();
  const role  = currentUser?.role || 'manager';
  const items = NAV[role] || [];

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
            <span>{ROLE_LABELS[role]}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="تسجيل الخروج">⏻</button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        <div className="top-bar">
          <div className="top-bar-module">
            <div className="top-bar-module-dot" style={{ background: ROLE_COLORS[role] }} />
            <span className="top-bar-module-name">{ROLE_LABELS[role]}</span>
          </div>
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
