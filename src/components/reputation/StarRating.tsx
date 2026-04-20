'use client';
import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 18, md: 24, lg: 32 };

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const px = sizes[size];

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          aria-label={`${star} estrellas`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: px,
            lineHeight: 1,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= active ? '#f59e0b' : 'var(--gray-200)',
            transform: !readonly && star <= active ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.1s, color 0.1s',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}