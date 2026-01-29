import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

// Badge types - now awards badge on first vote!
const BADGE_TYPES = {
  WHALE: { name: 'Whale Strategist', minTVL: 10000, emoji: '🐋' },
  ACCURACY_KING: { name: 'Accuracy King', minWinRate: 0.7, emoji: '🎯' },
  CHAIN_MASTER: { name: 'Chain Master', minDepth: 3, emoji: '⛓️' },
  DIAMOND_HANDS: { name: 'Diamond Hands', minHoldTime: 30, emoji: '💎' },
  RISK_MANAGER: { name: 'Risk Manager', minHealth: 180, emoji: '🛡️' },
  COMMUNITY_FAVORITE: { name: 'Community Favorite', minVotes: 1, emoji: '⭐' } // Changed to 1 vote!
};

// In-memory storage fallback
const memoryVotes: Map<string, any[]> = new Map();
const memoryBadges: Map<string, any[]> = new Map();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    // Return all badge types for display
    const badges = Object.entries(BADGE_TYPES).map(([key, value]) => ({
      id: key,
      ...value
    }));

    // If address provided, also return user's badges and votes
    if (address) {
      const supabase = getSupabaseServer();

      let userBadges: any[] = [];
      let votesReceived: any[] = [];

      if (supabase) {
        try {
          const { data: dbBadges } = await supabase
            .from('reputation_badges')
            .select('*')
            .eq('address', address.toLowerCase());

          const { data: dbVotes } = await supabase
            .from('badge_votes')
            .select('*')
            .eq('recipient', address.toLowerCase());

          userBadges = dbBadges || [];
          votesReceived = dbVotes || [];
        } catch (dbErr) {
          console.warn('Supabase fetch failed, using memory:', dbErr);
        }
      }

      // Merge with memory storage
      const memBadges = memoryBadges.get(address.toLowerCase()) || [];
      const memVotes = Array.from(memoryVotes.values()).flat().filter(v => v.recipient === address.toLowerCase());

      userBadges = [...userBadges, ...memBadges];
      votesReceived = [...votesReceived, ...memVotes];

      return NextResponse.json({
        ok: true,
        badges,
        userBadges,
        votesReceived,
        totalVotes: votesReceived.length
      });
    }

    return NextResponse.json({ ok: true, badges });
  } catch (err) {
    console.error('Badge GET error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, voter, recipient, badgeType, signature } = body;

    if (action === 'vote') {
      // Vote for a badge
      if (!voter || !recipient || !badgeType) {
        return NextResponse.json({
          ok: false,
          error: 'Missing voter, recipient, or badgeType'
        }, { status: 400 });
      }

      // Verify badge type exists
      if (!BADGE_TYPES[badgeType as keyof typeof BADGE_TYPES]) {
        return NextResponse.json({
          ok: false,
          error: 'Invalid badge type'
        }, { status: 400 });
      }

      const voterLower = voter.toLowerCase();
      const recipientLower = recipient.toLowerCase();
      const voteKey = `${voterLower}-${recipientLower}-${badgeType}`;

      // Try Supabase first
      const supabase = getSupabaseServer();
      let useSupabase = false;

      if (supabase) {
        try {
          // Check for duplicate vote
          const { data: existingVote } = await supabase
            .from('badge_votes')
            .select('id')
            .eq('voter', voterLower)
            .eq('recipient', recipientLower)
            .eq('badge_type', badgeType)
            .maybeSingle();

          if (existingVote) {
            return NextResponse.json({
              ok: false,
              error: 'Already voted for this badge'
            }, { status: 400 });
          }

          // Insert vote
          const { error } = await supabase
            .from('badge_votes')
            .insert({
              voter: voterLower,
              recipient: recipientLower,
              badge_type: badgeType,
              signature
            });

          if (!error) {
            useSupabase = true;

            // Award badge immediately on first vote!
            await supabase
              .from('reputation_badges')
              .upsert({
                address: recipientLower,
                badge_type: badgeType,
                awarded_at: new Date().toISOString(),
                proof: { voter: voterLower, voteCount: 1 }
              }, { onConflict: 'address,badge_type' });
          }
        } catch (dbErr) {
          console.warn('Supabase failed, falling back to memory:', dbErr);
        }
      }

      // Fallback to memory storage
      if (!useSupabase) {
        // Check memory for duplicate
        const existingVotes = memoryVotes.get(voteKey);
        if (existingVotes && existingVotes.length > 0) {
          return NextResponse.json({
            ok: false,
            error: 'Already voted for this badge'
          }, { status: 400 });
        }

        // Store vote in memory
        const vote = {
          voter: voterLower,
          recipient: recipientLower,
          badge_type: badgeType,
          signature,
          timestamp: Date.now()
        };
        memoryVotes.set(voteKey, [vote]);

        // Award badge immediately
        const existingBadges = memoryBadges.get(recipientLower) || [];
        if (!existingBadges.find(b => b.badge_type === badgeType)) {
          existingBadges.push({
            address: recipientLower,
            badge_type: badgeType,
            awarded_at: new Date().toISOString(),
            proof: { voter: voterLower }
          });
          memoryBadges.set(recipientLower, existingBadges);
        }
      }

      // Get badge info for response
      const badge = BADGE_TYPES[badgeType as keyof typeof BADGE_TYPES];

      return NextResponse.json({
        ok: true,
        message: `${badge.emoji} ${badge.name} badge awarded!`,
        badgeAwarded: true,
        badge: {
          type: badgeType,
          name: badge.name,
          emoji: badge.emoji
        }
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'Unknown action'
    }, { status: 400 });
  } catch (err) {
    console.error('Badge POST error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
