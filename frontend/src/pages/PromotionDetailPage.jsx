import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getPromotion, deletePromotion } from '../api/promotionApi';
import { applyToPromotion, cancelApplication, getMyApplication } from '../api/applicationApi';
import Header from '../components/Header';

const LABEL_STYLE = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-muted)',
  marginBottom: 4,
};

const PRIMARY_BUTTON = {
  borderRadius: 'var(--radius-pill)',
  padding: '10px 24px',
  fontWeight: 700,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#ffffff',
};

const SECONDARY_BUTTON = {
  borderRadius: 'var(--radius-pill)',
  padding: '10px 24px',
  fontWeight: 700,
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-ink)',
};

const DANGER_BUTTON = {
  borderRadius: 'var(--radius-pill)',
  padding: '10px 24px',
  fontWeight: 700,
  border: 'none',
  background: 'var(--color-danger)',
  color: '#ffffff',
};

export default function PromotionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isParticipant = user?.role === 'PARTICIPANT';
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => getPromotion(id),
  });

  const { data: myApplication } = useQuery({
    queryKey: ['myApplication', id],
    queryFn: () => getMyApplication(id),
    enabled: isParticipant,
  });

  const hasApplied = Boolean(myApplication?.applied);

  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      navigate('/promotions');
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyToPromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion', id] });
      queryClient.invalidateQueries({ queryKey: ['myApplication', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion', id] });
      queryClient.invalidateQueries({ queryKey: ['myApplication', id] });
    },
  });

  function handleDelete() {
    if (window.confirm('신청 기록도 함께 삭제됩니다. 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  }

  const isOwner = user?.role === 'MANAGER' && data?.managerId === user?.id;

  const today = new Date().toISOString().slice(0, 10);
  const isPastDeadline = Boolean(data) && today > data.applyEndAt;
  const isFull = Boolean(data) && data.appliedCount >= data.capacity;
  const canApply = !hasApplied && !isPastDeadline && !isFull;

  return (
    <div>
      <Header />
      <div style={{ maxWidth: 640, margin: '24px auto', padding: '0 16px' }}>
        <p style={{ marginBottom: 16 }}>
          <Link to="/promotions" style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            ← 목록으로
          </Link>
        </p>

        {isLoading && <p style={{ color: 'var(--color-muted)' }}>로딩 중...</p>}
        {isError && <p style={{ color: 'var(--color-danger)' }}>{error.message}</p>}

        {!isLoading && !isError && data && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              padding: 24,
            }}
          >
            <h2 style={{ fontSize: 20, color: 'var(--color-ink)' }}>{data.title}</h2>
            <p style={{ fontSize: 14, margin: '12px 0', color: 'var(--color-ink)' }}>{data.description}</p>

            <div style={{ borderTop: '1px dashed var(--color-border)', margin: '16px 0' }} />

            <p style={{ margin: '0 0 12px' }}>
              <span style={LABEL_STYLE}>신청기간</span>
              <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
                {data.applyStartAt} ~ {data.applyEndAt}
              </span>
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <span style={LABEL_STYLE}>진행일</span>
              <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>{data.eventDate}</span>
            </p>
            <p style={{ margin: 0 }}>
              <span style={LABEL_STYLE}>모집인원</span>
              <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
                {data.appliedCount} / {data.capacity}명
              </span>
            </p>

            {isParticipant && (
              <div style={{ marginTop: 20 }}>
                {hasApplied ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        borderRadius: 'var(--radius-pill)',
                        padding: '6px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        background: 'rgba(46, 158, 91, 0.12)',
                        color: 'var(--color-success)',
                      }}
                    >
                      신청 완료
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      style={SECONDARY_BUTTON}
                    >
                      신청 취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => applyMutation.mutate()}
                    disabled={!canApply || applyMutation.isPending}
                    style={{
                      ...PRIMARY_BUTTON,
                      ...(!canApply ? { background: 'var(--color-border)', color: 'var(--color-muted)' } : {}),
                    }}
                  >
                    {isFull ? '정원 마감' : isPastDeadline ? '신청 마감' : '신청하기'}
                  </button>
                )}
                {applyMutation.isError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 8 }}>{applyMutation.error.message}</p>
                )}
                {cancelMutation.isError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 8 }}>{cancelMutation.error.message}</p>
                )}
              </div>
            )}

            {isOwner && (
              <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                <Link to={`/promotions/${id}/edit`}>
                  <button type="button" style={SECONDARY_BUTTON}>
                    수정
                  </button>
                </Link>
                <button type="button" onClick={handleDelete} style={DANGER_BUTTON}>
                  삭제
                </button>
                <Link to={`/promotions/${id}/applications`}>
                  <button type="button" style={SECONDARY_BUTTON}>
                    신청 현황
                  </button>
                </Link>
              </div>
            )}
            {deleteMutation.isError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 8 }}>{deleteMutation.error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
