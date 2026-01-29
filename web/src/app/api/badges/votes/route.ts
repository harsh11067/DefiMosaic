import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSupabaseServer } from '@/lib/supabaseServer';

// In-memory vote storage (replace with Supabase in production)
const voteStorage: Map<string, { voter: string; recipient: string; badgeType: string; signature: string; timestamp: number }[]> = new Map();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const recipient = searchParams.get('recipient')?.toLowerCase();
    const voter = searchParams.get('voter')?.toLowerCase();

    if (!recipient) {
      return NextResponse.json({ ok: false, error: 'Missing recipient' }, { status: 400 });
    }

    // Get all votes for recipient
    const allVotes = Array.from(voteStorage.values()).flat();
    const recipientVotes = allVotes.filter(v => v.recipient === recipient);

    // Count votes per badge type
    const voteCounts: Record<string, number> = {};
    recipientVotes.forEach(v => {
      voteCounts[v.badgeType] = (voteCounts[v.badgeType] || 0) + 1;
    });

    // Get user's votes if voter provided
    let userVotes: string[] = [];
    if (voter) {
      userVotes = recipientVotes
        .filter(v => v.voter === voter)
        .map(v => v.badgeType);
    }

    return NextResponse.json({
      ok: true,
      voteCounts,
      userVotes,
      totalVotes: recipientVotes.length
    });
  } catch (err) {
    console.error('Badge votes GET error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { voter, recipient, badgeType, signature, message } = body;

    // Validate required fields
    if (!voter || !recipient || !badgeType || !signature) {
      return NextResponse.json({
        ok: false,
        error: 'Missing required fields: voter, recipient, badgeType, signature'
      }, { status: 400 });
    }

    // Validate badge type
    const validBadges = ['WHALE', 'ACCURACY_KING', 'CHAIN_MASTER', 'DIAMOND_HANDS', 'RISK_MANAGER', 'COMMUNITY_FAVORITE'];
    if (!validBadges.includes(badgeType)) {
      return NextResponse.json({ ok: false, error: 'Invalid badge type' }, { status: 400 });
    }

    // Prevent self-voting
    if (voter.toLowerCase() === recipient.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Cannot vote for yourself' }, { status: 400 });
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== voter.toLowerCase()) {
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
      }
    } catch (sigError) {
      return NextResponse.json({ ok: false, error: 'Signature verification failed' }, { status: 400 });
    }

    // Check for duplicate vote
    const key = `${voter.toLowerCase()}-${recipient.toLowerCase()}`;
    const existingVotes = voteStorage.get(key) || [];

    if (existingVotes.some(v => v.badgeType === badgeType)) {
      return NextResponse.json({ ok: false, error: 'Already voted for this badge' }, { status: 400 });
    }

    // Store vote
    const newVote = {
      voter: voter.toLowerCase(),
      recipient: recipient.toLowerCase(),
      badgeType,
      signature,
      timestamp: Date.now()
    };

    voteStorage.set(key, [...existingVotes, newVote]);

    // Count total votes for this recipient for this badge
    const allVotes = Array.from(voteStorage.values()).flat();
    const badgeVoteCount = allVotes.filter(
      v => v.recipient === recipient.toLowerCase() && v.badgeType === badgeType
    ).length;

    return NextResponse.json({
      ok: true,
      message: 'Vote recorded successfully',
      voteCount: badgeVoteCount
    });
  } catch (err) {
    console.error('Badge votes POST error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
