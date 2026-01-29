import { ethers } from 'ethers';
import { getProvider } from './provider';

// ABI for MultiversePrediction contract - only the functions we need
const MultiversePredictionAbi = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserPredictions',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'predictionId', type: 'uint256' }],
    name: 'predictions',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'parentId', type: 'uint256' },
      { name: 'collateralAmount', type: 'uint256' },
      { name: 'loanAmount', type: 'uint256' },
      { name: 'priceFeed', type: 'address' },
      { name: 'priceTarget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'bool' },
      { name: 'collateralizationRatio', type: 'uint256' },
      { name: 'liquidated', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_ADDRESS || process.env.NEXT_PUBLIC_MULTIVERSE_PREDICTION_ADDRESS || '';

export async function fetchPredictionsFromContract(creator: string) {
  if (!CONTRACT_ADDRESS) {
    console.warn('NEXT_PUBLIC_PREDICTION_ADDRESS not set');
    return [];
  }

  try {
    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MultiversePredictionAbi, provider);

    // Get user's prediction IDs
    const ids: bigint[] = await contract.getUserPredictions(creator);

    const results = [];

    for (const id of ids) {
      try {
        const p = await contract.predictions(id);

        // Calculate health based on collateral/loan ratio
        const collateral = Number(p.collateralAmount) / 1e18;
        const loan = Number(p.loanAmount) / 1e18;
        const health = collateral > 0 ? ((collateral + loan) / (collateral * 1.5)) * 100 : 150;

        results.push({
          id: Number(id),
          parent_id: Number(p.parentId),
          creator: p.creator,
          collateral: p.collateralAmount.toString(),
          loan_amount: p.loanAmount.toString(),
          price_target: p.priceTarget.toString(),
          deadline: Number(p.deadline),
          leverage_bps: loan > 0 && collateral > 0 ? Math.floor((loan / collateral) * 10000) : 0,
          liquidated: p.liquidated,
          resolved: p.resolved,
          created_at: new Date().toISOString(), // Contract doesn't store creation time
          outcome: p.outcome,
          health: health
        });
      } catch (predError) {
        console.error(`Failed to fetch prediction ${id}:`, predError);
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching predictions from contract:', error);
    return [];
  }
}
