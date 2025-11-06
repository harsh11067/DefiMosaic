# DeFi Mosaic 🎯

> **The Future of Decentralized Prediction Markets & Social Trading**

DeFi Mosaic is a revolutionary DeFi platform that combines cascading prediction markets with undercollateralized loans, social copy trading, and AI-powered portfolio optimization. Built on Polygon, it enables users to create prediction chains, leverage positions, and follow successful trading strategies—all in one seamless ecosystem.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-^0.8.24-lightgrey.svg)
![Next.js](https://img.shields.io/badge/next.js-15.5.4-black)
![Polygon](https://img.shields.io/badge/network-Polygon%20Amoy-purple)

---

## 🌟 Unique Selling Points (USP)

### 1. **Cascading Predictions with Undercollateralized Loans**
- **Predict. Chain. Prosper.** - Create root predictions with collateral and receive undercollateralized loans (up to 80% leverage)
- Chain predictions together: Parent predictions fund child predictions, creating cascading opportunities
- Amplified ROI on successful chains with automatic subtree liquidation on failures
- First-of-its-kind implementation of conditional prediction markets with loan structures

### 2. **Social Copy Trading Platform**
- Follow top-performing trading strategies with transparent fee structures (0-20%)
- Real-time leaderboard tracking today's top strategies
- Comprehensive strategy management with 4-tab interface (Overview, Trade History, Positions, Performance)
- Investment tracking with detailed P&L analytics

### 3. **AI-Powered Portfolio Optimization**
- Personalized risk profile assessment
- Intelligent strategy recommendations based on risk tolerance
- Dynamic portfolio allocation suggestions
- Real-time market analysis and insights

### 4. **Live Market Data & Price Tracking**
- Real-time cryptocurrency prices from CoinGecko API
- Price target setting for any token
- 24h change tracking with auto-refresh
- ETH price display with live updates

### 5. **Leveraged Betting Pools**
- ERC1155-based betting pools with native MATIC support
- Create child bets using existing shares as collateral
- Up to 80% leverage on positions
- Oracle-based resolution with 2x/0.5x payout structure

---

## ✨ Key Features

### 🎲 Prediction Markets
- **Root Predictions**: Post collateral (MATIC) and receive undercollateralized loans
- **Child Predictions**: Branch from parent predictions using loan funds
- **Chain Management**: Visual representation of prediction chains
- **Automatic Resolution**: Oracle-based price resolution with Chainlink-compatible feeds
- **Liquidation System**: Entire subtree liquidates if parent fails

### 👥 Social Copy Trading
- **Strategy Creation**: Create custom trading strategies with unique IDs and names
- **Follow System**: Invest in strategies with transparent fee structures
- **Leaderboard**: Real-time ranking based on today's gains
- **Strategy Management**: 4-tab interface for comprehensive strategy analysis
- **Performance Tracking**: Daily and total gains, TVL, follower counts

### 📊 Portfolio Dashboard
- **Risk Profile Assessment**: AI-powered risk analysis
- **Strategy Recommendations**: Personalized allocation suggestions
- **Allocation Charts**: Visual portfolio distribution
- **Joined Strategies**: Track all followed strategies in one place

### 💱 Live Price Data
- **CoinGecko Integration**: Real-time prices for 100+ cryptocurrencies
- **Price Targets**: Set custom price targets for any token
- **Top Gainers**: Identify trending tokens
- **Auto-refresh**: Updates every 60 seconds

### 🔄 Token Swapping
- **Surge Boost**: Swap POL (native MATIC) for top-performing tokens
- **Gas Estimation**: Smart gas fee calculation with user alerts
- **Mock Support**: Development-friendly mocking for testnet compatibility

---

## 🏗️ Architecture

### Smart Contracts
- **BetPoolFactory**: Factory for creating betting pools
- **BetPool**: ERC1155-based betting pools with leverage
- **MultiversePrediction**: Cascading prediction system with loans
- **StrategyRegistry**: Social copy trading registry
- **SwapHelper**: Token swapping functionality

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **Wagmi v2**: Ethereum React hooks
- **RainbowKit**: Wallet connection UI
- **Framer Motion**: Smooth animations
- **Tailwind CSS**: Modern styling
- **TypeScript**: Type-safe development

### Infrastructure
- **Polygon Amoy**: Testnet deployment
- **Chainlink-Compatible Oracles**: Price feeds
- **CoinGecko API**: Market data
- **OpenAI API**: AI-powered recommendations (optional)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- MetaMask or compatible Web3 wallet
- Polygon Amoy testnet configured in wallet
- Test MATIC tokens (get from [Polygon Faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd DefiMosaic

# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../web
npm install
```

### Setup

1. **Configure Environment Variables**
   ```bash
   cd web
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

2. **Deploy Smart Contracts**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network polygon_amoy
   ```

3. **Start Development Server**
   ```bash
   cd web
   npm run dev
   ```

4. **Open in Browser**
   - Navigate to `http://localhost:3000`
   - Connect your wallet
   - Start exploring!

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## 📖 Documentation

- **[SETUP.md](./SETUP.md)** - Comprehensive setup guide
- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Technical architecture and implementation details
- **[API Documentation](./PROJECT_DOCUMENTATION.md#api-endpoints)** - API endpoints reference

---

## 🎯 Use Cases

### For Traders
- Create prediction chains with leverage
- Follow successful strategies automatically
- Track portfolio performance in real-time
- Set price targets and get notified

### For Strategy Creators
- Monetize trading strategies with fees
- Build a following and reputation
- Track performance metrics
- Manage multiple strategies

### For Investors
- Diversify across multiple strategies
- AI-powered portfolio recommendations
- Transparent fee structures
- Real-time performance tracking

---

## 🔒 Security

- **Audited Smart Contracts**: Built with OpenZeppelin libraries
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive validation on all inputs
- **Oracle Security**: Chainlink-compatible price feeds
- **Collateralization**: Minimum 150% collateral ratio
- **Liquidation Protection**: Automatic liquidation thresholds

---

## 🧪 Testing

```bash
# Run contract tests
cd contracts
npm test

# Run specific test suite
npx hardhat test test/POLPoolCreation.test.js
```

---

## 📦 Contract Addresses (Polygon Amoy)

| Contract | Address |
|----------|---------|
| BetPoolFactory | `0x32623DD680542C47F569E049E9F6adA0540c6703` |
| StrategyRegistry | `0xb3918f95309e2b64D61Ea02C966c861A02b1B824` |
| Bet1155 | `0x6aa46B7Ed0f7A0Ce345b3B58eE11A21F438150e8` |
| USDCMock | `0x6E1A9051b7357411FF352C70aa0391Ac261D9EED` |
| MockOracle | `0x45064dbB154e43aCfdedb90b41b2c2Befd86690b` |

---

## 🛠️ Development

### Project Structure
```
DefiMosaic/
├── contracts/          # Smart contracts
│   ├── contracts/     # Solidity source files
│   ├── scripts/       # Deployment scripts
│   └── test/          # Test files
├── web/               # Next.js frontend
│   ├── src/
│   │   ├── app/      # Next.js pages
│   │   ├── components/ # React components
│   │   └── config/   # Configuration files
│   └── public/        # Static assets
└── docs/              # Documentation
```

### Key Technologies
- **Solidity** ^0.8.24
- **Hardhat** ^2.26.3
- **Next.js** 15.5.4
- **Wagmi** ^2.17.5
- **Viem** ^2.38.0
- **TypeScript** ^5

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Cascading predictions with loans
- ✅ Social copy trading
- ✅ AI portfolio recommendations
- ✅ Live price tracking

### Phase 2 (Upcoming)
- [ ] Real-time chain visualization
- [ ] Advanced performance charts
- [ ] Strategy backtesting
- [ ] Multi-chain support

### Phase 3 (Future)
- [ ] Governance token integration
- [ ] Automated liquidation bots
- [ ] Strategy templates marketplace
- [ ] Social features (comments, ratings)

---

## 📞 Support

- **Documentation**: See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
- **Issues**: Open an issue on GitHub
- **Discussions**: Join our community discussions

---

## 🙏 Acknowledgments

- **OpenZeppelin** for secure contract libraries
- **Chainlink** for oracle infrastructure
- **Polygon** for scalable blockchain infrastructure
- **CoinGecko** for market data API
- **Wagmi** and **RainbowKit** for Web3 integration

---

## ⚡ Performance

- **Fast Transactions**: Optimized gas usage
- **Real-time Updates**: WebSocket connections for live data
- **Responsive Design**: Mobile-first approach
- **Smooth Animations**: 60fps with Framer Motion

---

## 🎨 UI/UX Highlights

- **Modern Design**: Dark theme with gradient accents
- **Smooth Animations**: Framer Motion transitions
- **Responsive Layout**: Works on all devices
- **Intuitive Navigation**: Clear user flows
- **Real-time Feedback**: Instant transaction status

---

**Built with ❤️ for the DeFi community**

*DeFi Mosaic - Where Predictions Meet Prosperity*

