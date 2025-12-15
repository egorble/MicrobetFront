Smart contracts: https://github.com/egorble/Crossapp-Microbet

# Microbet Frontend

- Microbet Lottery: A prediction game where users place small bets (native token) on crypto price direction (UP/DOWN) within time-boxed rounds. Winners are paid out; losing-side bets are lost. Designed for cross-chain participation on Linera.
- Leaderboard: Aggregates player statistics (wins, losses, total won/lost, net winnings). Updates live from on-chain events and a PocketBase mirror for fast UI rendering.
- AI Assistant: A chat overlay that analyzes live market context and recent round history to suggest short predictions. It fetches 1m candles from Binance for the selected token and combines them with the latest rounds data to produce concise guidance (e.g., **UP**/**DOWN**) directly in the UI.
- Tech Overview: React + Vite UI connecting to Linera HTTP GraphQL endpoints and WebSocket subscriptions for live updates. PocketBase is used for caching and rendering leaderboard data. Orchestrator scripts keep data in sync between chain apps and the UI.
