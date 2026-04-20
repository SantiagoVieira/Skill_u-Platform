'use client';
import { useParams, useRouter } from 'next/navigation';
import { useReputation } from '@/hooks/useReputation';
import { ReputationBadge } from '@/components/reputation/ReputationBadge';
import { ReviewForm } from '@/components/reputation/ReviewForm';
import { ReviewList } from '@/components/reputation/ReviewList';

export default function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { reputation, reviews, loading, submitting, error, submitReview } = useReputation(id);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        Cargando perfil...
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'var(--gray-100)', border: '1px solid var(--gray-200)',
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
              fontSize: 13, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← Volver
          </button>
          <span className="topbar-title">Perfil del vendedor</span>
        </div>
        <div className="topbar-actions">
          <ReputationBadge reputation={reputation} />
        </div>
      </header>

      <div className="dash-content" style={{ maxWidth: 640 }}>
        <ReviewForm onSubmit={submitReview} submitting={submitting} error={error} />
        <div style={{ marginTop: 16 }}>
          <div className="section-header">
            <span className="section-title">Reseñas</span>
            <span className="section-count">
              {reputation?.total_reviews ?? 0} reseña{(reputation?.total_reviews ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <ReviewList reputation={reputation} reviews={reviews} />
          </div>
        </div>
      </div>
    </>
  );
}