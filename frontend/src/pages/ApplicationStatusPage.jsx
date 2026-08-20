import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApplicationStatus } from '../api/applicationApi';
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

const TH_STYLE = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--color-muted)',
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border)',
};

const TD_STYLE = {
  fontSize: 14,
  color: 'var(--color-ink)',
  padding: '10px 0',
  borderBottom: '1px dashed var(--color-border)',
};

export default function ApplicationStatusPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['applicationStatus', id],
    queryFn: () => getApplicationStatus(id),
  });

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
        {isError && <p style={{ color: 'var(--color-danger)' }}>{error.status === 403 ? '권한이 없습니다' : error.message}</p>}

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

            <p style={{ margin: '12px 0 0' }}>
              <span style={LABEL_STYLE}>모집인원</span>
              <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
                {data.appliedCount} / {data.capacity}명
              </span>
            </p>

            <div style={{ borderTop: '1px dashed var(--color-border)', margin: '16px 0' }} />

            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--color-ink)' }}>신청자 목록</h3>

            {data.applicants.length === 0 ? (
              <p style={{ color: 'var(--color-muted)' }}>신청자 없음</p>
            ) : (
              <>
                <table className="applicant-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH_STYLE}>이름</th>
                      <th style={TH_STYLE}>신청일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applicants.map((applicant) => (
                      <tr key={applicant.userId}>
                        <td style={TD_STYLE}>{applicant.name}</td>
                        <td style={TD_STYLE}>{applicant.appliedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="applicant-cards">
                  {data.applicants.map((applicant) => (
                    <div
                      key={applicant.userId}
                      style={{
                        borderRadius: 'var(--radius-card)',
                        border: '1px solid var(--color-border)',
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>{applicant.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{applicant.appliedAt}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
