import { SellerReputation } from '@/types/reputation';

interface Props {
  reputation: SellerReputation | null;
}

export function ReputationBadge({ reputation }: Props) {
  if (!reputation || reputation.total_reviews === 0) {
    return (
      <span style={{
        fontSize: 11, color: 'var(--gray-400)',
        background: 'var(--gray-100)', border: '1px solid var(--gray-200)',
        borderRadius: 6, padding: '2px 8px',
      }}>
        Sin reseñas
      </span>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: '#fff8e1', border: '1px solid #f59e0b',
      borderRadius: 6, padding: '3px 8px',
    }}>
      <span style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)' }}>
        {reputation.average_rating}
      </span>
      <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>
        ({reputation.total_reviews})
      </span>
    </div>
  );
}