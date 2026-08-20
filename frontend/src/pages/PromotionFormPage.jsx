import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPromotion, createPromotion, updatePromotion, deletePromotion } from '../api/promotionApi';
import Header from '../components/Header';

const EMPTY_FORM = { title: '', description: '', applyStartAt: '', applyEndAt: '', eventDate: '', capacity: '' };

const LABEL_STYLE = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-muted)',
  marginBottom: 4,
};

export default function PromotionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: existing } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => getPromotion(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        applyStartAt: existing.applyStartAt,
        applyEndAt: existing.applyEndAt,
        eventDate: existing.eventDate,
        capacity: existing.capacity,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? updatePromotion(id, payload) : createPromotion(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['promotion', id] });
        navigate(`/promotions/${id}`);
      } else {
        navigate('/promotions');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      navigate('/promotions');
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate({ ...form, capacity: Number(form.capacity) });
  }

  function handleDelete() {
    if (window.confirm('신청 기록도 함께 삭제됩니다. 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  }

  return (
    <div>
      <Header />
      <div style={{ maxWidth: 480, margin: '24px auto', padding: '0 16px' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-card)',
            padding: 24,
          }}
        >
          <h2 style={{ fontSize: 20, marginBottom: 20, color: 'var(--color-ink)' }}>
            프로모션 {isEdit ? '수정' : '등록'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>제목</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>내용</label>
              <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="date-row" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>신청 시작일</label>
                <input type="date" required value={form.applyStartAt} onChange={(e) => setForm({ ...form, applyStartAt: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>신청 종료일</label>
                <input type="date" required value={form.applyEndAt} onChange={(e) => setForm({ ...form, applyEndAt: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>진행일</label>
              <input type="date" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_STYLE}>모집인원</label>
              <input type="number" required min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>

            {saveMutation.isError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>{saveMutation.error.message}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 24px',
                  fontWeight: 700,
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                {isEdit ? '저장' : '등록'}
              </button>
              <Link to={isEdit ? `/promotions/${id}` : '/promotions'}>
                <button
                  type="button"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    padding: '10px 24px',
                    fontWeight: 700,
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-ink)',
                  }}
                >
                  취소
                </button>
              </Link>
            </div>
          </form>

          {isEdit && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed var(--color-border)' }}>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  borderRadius: 'var(--radius-pill)',
                  padding: '10px 24px',
                  fontWeight: 700,
                  border: 'none',
                  background: 'var(--color-danger)',
                  color: '#ffffff',
                }}
              >
                삭제
              </button>
              {deleteMutation.isError && (
                <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 8 }}>{deleteMutation.error.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
