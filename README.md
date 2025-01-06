# Liquidbook Market Maker Bot

A market maker bot implementation for LiquidBook, designed to provide liquidity and facilitate trading on the decentralized orderbook.

## 📋 Overview

This market maker bot interacts with LiquidBook smart contracts to automatically place and manage orders, maintaining liquidity in the orderbook. The bot is implemented in TypeScript and includes configuration options for different market making strategies.

## 🏗️ Project Structure

```
├── config/        # Configuration files and settings
├── src/           # Source code
├── .env.example   # Environment variables template
├── .gitignore     # Git ignore rules
├── README.md      # Documentation
├── bun.lockb      # Bun lockfile
├── index.ts       # Main entry point
├── market-maker-flow.mermaid  # Flow diagram
├── package.json   # Project dependencies
└── tsconfig.json  # TypeScript configuration
```

## 🛠️ Technical Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Network**: Arbitrum (via Stylus)

## 🚀 Getting Started

### Prerequisites

- Bun runtime
- Node.js 18+
- Access to Arbitrum RPC endpoint

### Installation

1. Clone the repository:
```bash
git clone [[repository-url]](https://github.com/liquid-book/marketmaker)
cd marketmaker
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment:
```bash
cp .env.example .env
```
Edit `.env` with your specific configuration

### Running the Bot

1. Development mode:
```bash
bun dev
```

2. Production mode:
```bash
bun start
```

## ⚙️ Configuration

Configure the market maker bot through the `/config` directory and environment variables:

- Trading pairs
- Order sizes
- Spread parameters
- Risk management settings
- Network configurations
  
## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
