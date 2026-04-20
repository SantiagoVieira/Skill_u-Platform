import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews/reputation?seller_id=xxx
export async function GET(req: NextRequest) {
  const sellerId = req.nextUrl.searchParams.get('seller_id');

  if (!sellerId) {
    return NextResponse.json({ error: 'seller_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('seller_reputation')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  if (error) return NextResponse.json(null);
  return NextResponse.json(data);
}