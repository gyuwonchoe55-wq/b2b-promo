import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Header() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  function handleLogout() {
    useAuthStore.getState().clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <strong style={{ color: 'var(--color-ink)', fontWeight: 700 }}>단체급식 프로모션</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>
          {role === 'MANAGER' ? '영양사' : '취식자'}
        </span>
        <button
          onClick={handleLogout}
          style={{
            borderRadius: 'var(--radius-pill)',
            padding: '10px 24px',
            fontWeight: 700,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-ink)',
          }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
