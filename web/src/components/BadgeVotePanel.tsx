'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useSignMessage } from 'wagmi';

// Badge definitions
const BADGES = [
  { id: 'WHALE', name: 'Whale Strategist', emoji: '🐋', description: 'High TVL trader' },
  { id: 'ACCURACY_KING', name: 'Accuracy King', emoji: '🎯', description: '70%+ win rate' },
  { id: 'CHAIN_MASTER', name: 'Chain Master', emoji: '⛓️', description: 'Deep chain builder' },
  { id: 'DIAMOND_HANDS', name: 'Diamond Hands', emoji: '💎', description: 'Long-term holder' },
  { id: 'RISK_MANAGER', name: 'Risk Manager', emoji: '🛡️', description: 'Maintains high health' },
  { id: 'COMMUNITY_FAVORITE', name: 'Community Favorite', emoji: '⭐', description: 'Community endorsed' }
];

interface BadgeVotePanelProps {
  recipientAddress: string;
  onClose?: () => void;
  onBadgeAwarded?: (badge: { type: string; name: string; emoji: string }) => void;
}

export default function BadgeVotePanel({ recipientAddress, onClose, onBadgeAwarded }: BadgeVotePanelProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [awardedBadges, setAwardedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [votingBadge, setVotingBadge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleVote = async (badgeId: string) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet to vote');
      return;
    }

    if (awardedBadges.includes(badgeId)) {
      setError('Already voted for this badge');
      return;
    }

    setVotingBadge(badgeId);
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Create message to sign
      const message = `Award ${badgeId} badge to ${recipientAddress}`;

      // Sign the message
      let signature = '';
      try {
        signature = await signMessageAsync({ message });
      } catch (sigError: any) {
        if (sigError.message?.includes('rejected')) {
          setError('Signature rejected');
          setLoading(false);
          setVotingBadge(null);
          return;
        }
        // If signature fails, continue without it (for testing)
        console.warn('Signature failed, continuing without:', sigError);
      }

      // Submit vote
      const res = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          voter: address,
          recipient: recipientAddress,
          badgeType: badgeId,
          signature
        })
      });

      const data = await res.json();

      if (data.ok) {
        const badge = BADGES.find(b => b.id === badgeId)!;
        setSuccess(`${badge.emoji} ${badge.name} badge awarded!`);
        setAwardedBadges([...awardedBadges, badgeId]);
        onBadgeAwarded?.({ type: badgeId, name: badge.name, emoji: badge.emoji });
      } else {
        setError(data.error || 'Vote failed');
      }
    } catch (err: any) {
      setError('Failed to submit vote');
      console.error('Vote error:', err);
    } finally {
      setLoading(false);
      setVotingBadge(null);
    }
  };

  return (
    <div className="p-4 bg-gray-900/90 rounded-xl border border-yellow-500/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
          🏅 Award Badge
        </h4>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Vote to award a reputation badge NFT to this strategist
      </p>

      {/* Badge grid */}
      <div className="grid grid-cols-2 gap-2">
        {BADGES.map((badge) => {
          const hasAwarded = awardedBadges.includes(badge.id);
          const isVoting = votingBadge === badge.id;

          return (
            <motion.button
              key={badge.id}
              onClick={() => !hasAwarded && !loading && handleVote(badge.id)}
              disabled={hasAwarded || loading || !isConnected}
              className={`relative p-3 rounded-lg text-left transition-all ${hasAwarded
                  ? 'bg-green-600/30 border border-green-500/50 cursor-default'
                  : isVoting
                    ? 'bg-yellow-600/30 border border-yellow-500/50'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-yellow-500/50 hover:bg-gray-700/50 cursor-pointer'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={!hasAwarded && isConnected ? { scale: 1.02 } : {}}
              whileTap={!hasAwarded && isConnected ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-sm font-medium text-white">{badge.name}</span>
              </div>
              <p className="text-xs text-gray-400 ml-8">{badge.description}</p>

              {/* Awarded indicator */}
              {hasAwarded && (
                <div className="absolute top-2 right-2 text-green-400 text-sm">✓</div>
              )}

              {/* Loading overlay */}
              {isVoting && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 rounded-lg">
                  <motion.div
                    className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Error/Success messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 p-2 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-sm text-center"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect wallet prompt */}
      {!isConnected && (
        <p className="mt-3 text-center text-sm text-yellow-500">
          ⚠️ Connect wallet to award badges
        </p>
      )}

      {/* Info */}
      <p className="mt-3 text-center text-xs text-gray-500">
        Each vote awards the badge as an NFT!
      </p>
    </div>
  );
}
