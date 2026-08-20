import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getPromotions } from '../api/promotionApi';
import Header from '../components/Header';
import PromotionCard from '../components/PromotionCard';

export default function PromotionListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['promotions'],
    queryFn: getPromotions,
  });

  return (
    <div>
      <Header />
      <div style={{ maxWidth: 640, margin: '24px auto', padding: '0 16px' }}>
        {role === 'MANAGER' && (
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Link to="/promotions/new">
              <button
                type="button"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 24px',
                  fontWeight: 700,
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                프로모션 등록
              </button>
            </Link>
          </div>
        )}

        {isLoading && <p style={{ color: 'var(--color-muted)' }}>로딩 중...</p>}
        {isError && <p style={{ color: 'var(--color-danger)' }}>{error.message}</p>}
        {!isLoading && !isError && data.length === 0 && (
          <p style={{ color: 'var(--color-muted)' }}>등록된 프로모션 없음</p>
        )}
        {!isLoading && !isError && data.length > 0 &&
          data.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}
      </div>
    </div>
  );
}
