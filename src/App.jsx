import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BusinessDevPage from './pages/BusinessDevPage';
import TrainingOpsPage from './pages/TrainingOpsPage';
import ManagerPage from './pages/ManagerPage';

function Toasts() {
  const { toasts } = useApp();
  if (!toasts?.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function AppRouter() {
  const { currentUser } = useApp();
  const [showRegister, setShowRegister] = useState(false);

  if (!currentUser) {
    if (showRegister) return <RegisterPage onBack={() => setShowRegister(false)} />;
    return <LoginPage onRegister={() => setShowRegister(true)} />;
  }

  if (currentUser.role === 'business_dev') return <BusinessDevPage />;
  if (currentUser.role === 'training_ops') return <TrainingOpsPage />;
  return <ManagerPage />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
      <Toasts />
    </AppProvider>
  );
}
