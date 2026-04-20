import { useState, useEffect, useCallback } from 'react';
import { SellerReview, SellerReputation } from '@/types/reputation';
import { supabase } from '@/lib/supabase';

export function useReputation(sellerId: string) {
  const [reputation, setReputation] = useState<SellerReputation | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [repRes, revRes] = await Promise.all([
      fetch(`/api/reviews/reputation?seller_id=${sellerId}`),
      fetch(`/api/reviews?seller_id=${sellerId}`),
    ]);
    setReputation(repRes.ok ? await repRes.json() : null);
    setReviews(revRes.ok ? await revRes.json() : []);
    setLoading(false);
  }, [sellerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitReview = async (rating: number, comment?: string) => {
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Debes iniciar sesión para dejar una reseña');
      setSubmitting(false);
      return false;
    }

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_id: sellerId, rating, comment, reviewer_id: user.id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      setSubmitting(false);
      return false;
    }
    await fetchData();
    setSubmitting(false);
    return true;
  };

  return { reputation, reviews, loading, submitting, error, submitReview };
}