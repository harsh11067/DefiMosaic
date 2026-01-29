// StrategyChatSend.tsx (part of StrategyChat UI)
import { useNetwork, useAccount } from 'wagmi';
import { ethers } from 'ethers';

async function sendMessage(strategyId: string, text: string, signer: any) {
  const nonce = Date.now();
  const msg = `DefiMosaic Chat Auth\nstrategy:${strategyId}\nnonce:${nonce}`;
  const signature = await signer.signMessage(msg);
  const res = await fetch('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ strategyId, message: text, signature, nonce }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}
