import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { login } from '../api/authApi';
import { decodeAccessToken } from '../api/httpClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken, refreshToken }) => {
      const decoded = decodeAccessToken(accessToken);
      useAuthStore.getState().setAuth({
        user: { id: decoded.id, role: decoded.role },
        accessToken,
        refreshToken,
      });
      navigate('/promotions', { replace: true });
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div
      style={{
        maxWidth: 320,
        margin: '80px auto',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 24, color: 'var(--color-ink)' }}>단체급식 프로모션</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            required
            placeholder="이메일"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button
          type="submit"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-pill)',
            padding: '10px 24px',
            fontWeight: 700,
            border: 'none',
            background: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          로그인
        </button>
        {mutation.isError && (
          <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 8 }}>{mutation.error.message}</p>
        )}
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <Link to="/signup" style={{ color: 'var(--color-muted)' }}>
          회원가입 하러 가기
        </Link>
      </p>
    </div>
  );
}
