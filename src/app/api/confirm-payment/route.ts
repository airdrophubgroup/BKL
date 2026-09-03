import { NextRequest, NextResponse } from 'next/server';

/**
 * Confirm a MiniKit.pay() transaction on the backend.
 * 
 * This is a CRITICAL security step — never trust client-side payment results.
 * Always verify with Worldcoin's API before granting access.
 * 
 * Flow:
 *   1. User pays via MiniKit.pay() in World App
 *   2. MiniKit returns { transactionId, reference, from, chain }
 *   3. This endpoint calls Worldcoin API to verify the transaction is real
 *   4. If valid, update the user's subscription in your database
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, reference, from, chain } = body;

    // Validate required fields
    if (!transactionId || !reference) {
      return NextResponse.json(
        { error: 'Missing transactionId or reference' },
        { status: 400 }
      );
    }

    const APP_ID = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
    const API_KEY = process.env.DEV_PORTAL_API_KEY;

    if (!APP_ID || !API_KEY) {
      console.error('[confirm-payment] Missing WORLDCOIN_APP_ID or DEV_PORTAL_API_KEY');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Verify transaction with Worldcoin Developer API
    const response = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}&type=payment`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[confirm-payment] Worldcoin API error:', response.status, errText);
      return NextResponse.json(
        { error: 'Transaction verification failed', details: errText },
        { status: 400 }
      );
    }

    const transaction = await response.json();

    // Check transaction status
    if (transaction.status !== 'confirmed' && transaction.status !== 'settled') {
      return NextResponse.json(
        { error: 'Transaction not yet confirmed', status: transaction.status },
        { status: 400 }
      );
    }

    // Verify the recipient address matches your treasury
    const expectedRecipient = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.toLowerCase();
    if (expectedRecipient && transaction.to?.toLowerCase() !== expectedRecipient) {
      console.error('[confirm-payment] Wrong recipient:', transaction.to);
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    // Verify the amount matches expected tier pricing
    const amount = parseFloat(transaction.tokens?.[0]?.token_amount ?? '0');
    const validAmounts = [2, 5, 10]; // WLD tier prices
    if (!validAmounts.includes(amount)) {
      console.error('[confirm-payment] Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Determine tier from amount
    const tierMap: Record<number, number> = { 2: 1, 5: 2, 10: 3 };
    const tier = tierMap[amount];

    // TODO: In production, update the user's subscription in your database here:
    // 1. Look up user by 'from' address or 'reference' nonce
    // 2. Create subscription record with expiry = now + 7 days
    // 3. Award BKL tokens (2/5/10 based on tier)
    // 4. Mark nonce as confirmed

    console.log(`[confirm-payment] ✅ Payment confirmed: ${transactionId}, tier ${tier}, ${amount} WLD from ${from}`);

    return NextResponse.json({
      success: true,
      transactionId,
      tier,
      amount,
      from,
    });

  } catch (error: any) {
    console.error('[confirm-payment] Error:', error);
    return NextResponse.json(
      { error: 'Internal error confirming payment' },
      { status: 500 }
    );
  }
}
