import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount, orderId } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100), // Stripe usa centavos
      currency: "cop",
      metadata: { orderId },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}