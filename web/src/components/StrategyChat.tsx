'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useSupabase } from '@/lib/supabaseConfig';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  createdAt: any;
}

interface StrategyChatProps {
  strategyId: number;
}

export default function StrategyChat({ strategyId }: StrategyChatProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { supabase, isLoading, error } = useSupabase(); // Use hook to get supabase client
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial messages and subscribe to real-time updates
  useEffect(() => {
    if (!supabase || !strategyId || isLoading) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('strategy_messages')
          .select('*')
          .eq('strategy_id', strategyId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error.message || JSON.stringify(error) || 'Unknown Supabase error');
          return;
        }

        if (data) {
          const formattedMessages: ChatMessage[] = data.map((msg: any) => ({
            id: msg.id.toString(),
            user: msg.user_address,
            text: msg.message,
            createdAt: msg.created_at
          }));
          setMessages(formattedMessages);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (err) {
        console.error('Error in fetchMessages:', err);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`strategy-${strategyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategy_messages',
          filter: `strategy_id=eq.${strategyId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id.toString(),
                user: newMsg.user_address,
                text: newMsg.message,
                createdAt: newMsg.created_at
              }
            ]);
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, strategyId, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !address || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const nonce = Date.now();
      const message = `DefiMosaic Chat Auth\nstrategy:${strategyId}\nnonce:${nonce}`;

      const signature = await signMessageAsync({ message });

      let response;
      try {
        response = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strategyId,
            message: text,
            signature,
            nonce
          })
        });
      } catch (networkError: any) {
        console.error('Network error sending message:', networkError);
        alert('Failed to send message: Network error. Please check your connection.');
        setInput(text);
        setSending(false);
        return;
      }

      const data = await response.json();

      if (!data.ok) {
        alert('Failed to send message: ' + (data.error || 'Unknown error'));
        setInput(text); // Restore input on error
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      alert('Failed to send message: ' + (error?.message || 'Unknown error'));
      setInput(text); // Restore input on error
    } finally {
      setSending(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    // Handle both string timestamps and Date objects
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4 text-center text-gray-400">
        Connect your wallet to join the chat
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4 text-center text-gray-400">
        <p>Loading Supabase...</p>
      </div>
    );
  }

  if (!supabase || error) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4 text-center text-gray-400">
        <p className="text-red-400 font-semibold mb-2">Supabase not configured</p>
        <p className="text-sm mt-2">{error || 'Please set NEXT_PUBLIC_SUPABASE_* environment variables'}</p>
        <div className="text-xs mt-4 text-gray-500 text-left bg-gray-900/50 p-3 rounded">
          <p className="font-semibold mb-1">Required variables in web/.env.local:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="mt-2 text-yellow-400">⚠️ Restart dev server after adding variables</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Strategy Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user?.toLowerCase() === address?.toLowerCase();
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${isOwn
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-100'
                    }`}
                >
                  {!isOwn && (
                    <div className="text-xs text-gray-400 mb-1">
                      {formatAddress(msg.user)}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

