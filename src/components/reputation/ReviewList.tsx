import { SellerReview, SellerReputation } from '@/types/reputation';
import { StarRating } from './StarRating';

interface Props {
  reputation: SellerReputation | null;
  reviews: SellerReview[];
}

export function ReviewList({ reputation, reviews }: Props) {
  if (!reputation || reputation.total_reviews === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--gray-400)', margin: 0 }}>
        Este vendedor aún no tiene reseñas.
      </p>
    );
  }

  const bars = [5, 4, 3, 2, 1] as const;
  const starKeys = ['one', 'two', 'three', 'four', 'five'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Resumen */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--gray-200)',
        borderRadius: 10, padding: '16px',
        display: 'flex', gap: 24, alignItems: 'center',
      }}>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1 }}>
            {reputation.average_rating}
          </div>
          <div style={{ marginTop: 4 }}>
            <StarRating value={Math.round(reputation.average_rating)} readonly size="sm" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
            {reputation.total_reviews} reseña{reputation.total_reviews !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {bars.map((star) => {
            const count = reputation[`${starKeys[star - 1]}_star` as keyof SellerReputation] as number;
            const pct = reputation.total_reviews
              ? Math.round((count / reputation.total_reviews) * 100)
              : 0;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-500)', width: 8 }}>{star}</span>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>★</span>
                <div style={{
                  flex: 1, height: 6, borderRadius: 99,
                  background: 'var(--gray-100)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: '#f59e0b',
                    width: `${pct}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--gray-400)', width: 28, textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reseñas individuales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.map((review) => (
          <div key={review.id} style={{
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>
                {review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : 'Usuario anónimo'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                {new Date(review.created_at).toLocaleDateString('es-CO')}
              </span>
            </div>
            <StarRating value={review.rating} readonly size="sm" />
            {review.comment && (
              <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '6px 0 0' }}>
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}