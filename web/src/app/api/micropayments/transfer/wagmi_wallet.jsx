// frontend snippet
import { useAccount, useProvider } from "wagmi";
import { ethers } from "ethers";

async function fetchAndRecommend(provider, address) {
  // tokenList example: replace with token addresses on polygon_amoy
  const tokenList = [
    { id: "USDC", address: "0x...USDC_ON_AMOY" },
    { id: "DAI", address: "0x...DAI_ON_AMOY" }
  ];

  // 1) native balance
  const nativeRaw = await provider.getBalance(address);
  const native = Number(ethers.formatEther(nativeRaw));

  // 2) token balances by ERC20
  const tokens = {};
  const abi = ["function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)"];
  for (const t of tokenList) {
    try {
      const c = new ethers.Contract(t.address, abi, provider);
      const raw = await c.balanceOf(address);
      const decimals = await c.decimals();
      const human = Number(ethers.formatUnits(raw, decimals));
      const symbol = await c.symbol().catch(() => t.id);
      tokens[t.id] = { address: t.address, raw: raw.toString(), decimals, human, symbol };
    } catch (e) {
      tokens[t.id] = { address: t.address, raw: "0", decimals: 18, human: 0, symbol: t.id };
    }
  }

  // 3) call recommendation API
  const resp = await fetch("/api/recommend-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, tokenList, risk: "medium" })
  });
  const json = await resp.json();
  return json;
}
