# DeFi Borrowing - Borrow Against Gold

A modern DeFi application that allows users to deposit USDT, swap to tokenized gold (XAUT), and borrow against their holdings - all gasless on Arbitrum.

## 🚀 Features

- **Gasless Transactions**: Powered by Biconomy MEE (abstractjs) for seamless user experience
- **Privy Authentication**: Simple and secure wallet-less onboarding
- **Tokenized Gold**: Swap USDT to Tether Gold (XAUT) for stable collateral
- **Morpho Blue Integration**: Borrow against your gold holdings at competitive rates
- **Real-time Monitoring**: Track positions, health factors, and market conditions
- **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Query (TanStack Query)
- **Authentication**: Privy
- **Smart Account**: Biconomy MEE (abstractjs)
- **Blockchain**: Arbitrum
- **DeFi Protocols**: Morpho Blue, Uniswap V4

### Key Components

- **Borrowing Engine**: Supply collateral and borrow assets through Morpho Blue
- **Swap Integration**: Uniswap Universal Router for token swaps
- **Smart Account Management**: Biconomy for gasless transactions
- **Position Tracking**: Real-time monitoring of borrowing positions

## 📋 Supported Tokens

| Token | Symbol | Contract Address | Decimals |
|-------|--------|------------------|----------|
| Tether USD | USDT0 | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| Tether Gold | XAUT0 | `0x40461291347e1eCbb09499F3371D3f17f10d7159` | 6 |
| Wrapped Ether | WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 18 |

## 🔗 Smart Contracts

- **Morpho Blue**: `0x6c247b1F6182318877311737BaC0844bAa518F5e`
- **Uniswap Universal Router**: `0xa51afafe0263b40edaef0df8781ea9aa03e381a3`
- **Permit2**: `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- **Uniswap V4 Pool Manager**: `0x360e68faccca8ca495c1b759fd9eee466db9fb32`

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd defi-borrowing-assignment
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp example.env .env.local
   ```
   Fill in the required environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`: Your Privy application ID
   - `NEXT_PUBLIC_ARBITRUM_RPC_URL`: Arbitrum RPC endpoint
   - `NEXT_PUBLIC_BICONOMY_MEE_API_KEY`: Biconomy MEE API key
   - `NEXT_PUBLIC_BICONOMY_STAGING`: Set to `true` for testnet

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Getting Started

1. **Connect Wallet**: Use Privy to authenticate and create a smart account
2. **Deposit USDT**: Send USDT to your generated deposit address
3. **Swap to Gold**: Convert USDT to Tether Gold (XAUT) using Uniswap
4. **Supply Collateral**: Deposit XAUT as collateral in Morpho Blue
5. **Borrow**: Borrow USDT against your gold holdings
6. **Manage Position**: Monitor health factor, repay, or withdraw collateral

### Key Features

- **Gasless Operations**: All transactions sponsored by Biconomy
- **Real-time Data**: Live price feeds and position updates
- **Risk Management**: Health factor monitoring and liquidation warnings
- **Flexible Repayment**: Partial or full repayment options
- **Collateral Management**: Withdraw excess collateral when safe

## 🏦 Market Parameters

The application uses a specific Morpho Blue market with the following parameters:

- **Market ID**: `0x1d094624063756fc61aaf061c7da056aebe3b3ad0ae0395b22e00db6c074de7c`
- **Loan Token**: USDT0
- **Collateral Token**: XAUT0
- **Safe LTV**: 67%
- **Warning LTV**: 72%
- **Liquidation LTV**: Determined by market LLTV

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js app router
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── borrow/           # Borrowing interface
│   ├── layout/           # Layout components
│   ├── shared/           # Shared UI components
│   ├── swap/             # Token swapping
│   └── wallet/           # Wallet management
├── config/               # Configuration files
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── services/             # External service integrations
└── types/                # TypeScript type definitions
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

### Key Hooks

- `useBorrow` - Borrowing operations and state management
- `useMorphoMarket` - Market data and parameters
- `useMorphoPosition` - User position tracking
- `useTokenBalances` - Token balance management
- `useSmartAccount` - Smart account operations

## 🔒 Security Considerations

- **Smart Contracts**: Interacts with audited Morpho Blue and Uniswap protocols
- **Private Keys**: Managed by Privy's secure infrastructure
- **Gasless Security**: Biconomy MEE handles transaction sponsorship securely
- **Frontend Security**: Next.js security best practices implemented

## 🌐 Network

- **Primary Network**: Arbitrum One
- **RPC**: Custom Arbitrum RPC endpoint required
- **Gas Token**: ETH (sponsored by Biconomy)
- **Block Explorer**: [Arbiscan](https://arbiscan.io/)

## 📊 Risk Management

### Health Factor Monitoring

- **Safe Zone**: Health factor > 1.4 (LTV < 67%)
- **Warning Zone**: Health factor < 1.4 (LTV > 72%)
- **Danger Zone**: Health factor approaching liquidation threshold

### Liquidation Risk

- Positions with health factor below 1.0 are subject to liquidation
- Monitor market conditions and collateral value regularly
- Maintain adequate collateral to avoid liquidation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the existing issues on GitHub
2. Review the documentation
3. Join our community discussions

## 🔄 Roadmap

- [ ] Support for additional collateral types
- [ ] Advanced position management features
- [ ] Mobile app development
- [ ] Governance token integration
- [ ] Yield farming opportunities

---

**Disclaimer**: This is a DeFi application involving financial risk. Users should conduct their own research and understand the risks before participating. The smart contracts and protocols used are audited, but users are always responsible for their own funds and positions.
