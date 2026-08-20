import { Link } from 'react-router-dom';

export default function PromotionCard({ promotion }) {
  const isClosed = promotion.appliedCount >= promotion.capacity;

  return (
    <Link
      to={`/promotions/${promotion.id}`}
      style={{
        display: 'block',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: 20,
        marginBottom: 16,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>{promotion.title}</h3>

      <p style={{ margin: '12px 0 4px' }}>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-muted)',
          }}
        >
          신청기간
        </span>
        <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
          {promotion.applyStartAt} ~ {promotion.applyEndAt}
        </span>
      </p>

      <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>
          <span
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
            }}
          >
            모집인원
          </span>
          <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
            {promotion.appliedCount} / {promotion.capacity}명
          </span>
        </span>
        {isClosed && (
          <span
            style={{
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(224, 72, 62, 0.1)',
              color: 'var(--color-danger)',
            }}
          >
            정원 마감
          </span>
        )}
      </p>
    </Link>
  );
}
