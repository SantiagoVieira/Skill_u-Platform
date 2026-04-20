'use client';
import { useState } from 'react';
import { StarRating } from './StarRating';

interface Props {
  onSubmit: (rating: number, comment?: string) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
}

export function ReviewForm({ onSubmit, submitting, error }: Props) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    const ok = await onSubmit(rating, comment || undefined);
    if (ok) setSuccess(true);
  };

  if (success) {
    return (
      <div style={{
        background: '#f0fdf4', border: '1px solid #86efac',
        borderRadius: 10, padding: '14px 16px',
        color: '#16a34a', fontWeight: 600, fontSize: 14,
      }}>
        ¡Gracias por tu reseña! 🎉
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--gray-200)',
      borderRadius: 10, padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>
        Dejar una reseña
      </span>

      <StarRating value={rating} onChange={setRating} size="lg" />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Cuéntanos tu experiencia con este vendedor (opcional)"
        rows={3}
        style={{
          width: '100%', borderRadius: 8, resize: 'none',
          border: '1px solid var(--gray-200)', padding: '8px 10px',
          fontSize: 13, color: 'var(--gray-700)',
          background: 'var(--gray-50)', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />

      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!rating || submitting}
        style={{
          padding: '9px 0', borderRadius: 8, border: 'none',
          background: !rating || submitting ? 'var(--gray-200)' : 'var(--orange)',
          color: !rating || submitting ? 'var(--gray-400)' : 'white',
          fontWeight: 600, fontSize: 13, cursor: !rating || submitting ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {submitting ? 'Enviando...' : 'Publicar reseña'}
      </button>
    </div>
  );
}