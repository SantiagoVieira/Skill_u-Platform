import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/// GET /api/reviews?seller_id=xxx
export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get('seller_id');

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('seller_reviews')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/reviews
// POST /api/reviews
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { seller_id, rating, comment, reviewer_id } = body;

  if (!reviewer_id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  if (!seller_id || !rating) {
    return NextResponse.json({ error: 'seller_id y rating son requeridos' }, { status: 400 });
  }

  if (seller_id === reviewer_id) {
    return NextResponse.json({ error: 'No puedes reseñarte a ti mismo' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('seller_reviews')
    .insert({ seller_id, reviewer_id, rating, comment })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya dejaste una reseña a este vendedor' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
