[Arcade.xyz](https://docs.arcade.xyz/docs/faq) is a platform for autonomous borrowing, lending, and escrow of NFT collateral on EVM blockchains. This repository contains the contracts for a token-based governance system, which can be granted ownership and management authority over the core lending protocol. This governance system is built on the [Council Framework](https://docs.element.fi/governance-council/council-protocol-overview).

# Relevant Links

- 🌐 [Website](https://www.arcade.xyz) - UI to the Arcade Lending Protocol, hosted by Arcade.xyz.
- 📝 [Usage Documentation](https://docs.arcade.xyz) - User-facing documentation for the Arcade Lending Protocol.
- 🐛 [Bug Bounty](https://immunefi.com/bounty/arcade/) - Security discloure and bounty program for the Arcade Lending Protocol.
- 💬 [Discord](https://discord.gg/arcadexyz) - Join the Arcade.xyz community! Great for further technical discussion and real-time support.
- 🔔 [Twitter](https://twitter.com/arcade_xyz) - Follow us on Twitter for alerts, announcements, and alpha.

# Governance Features

- Talk about frozen airdrop vault
- Talk about NFT multipliers

# Overview of Contracts

### ___See natspec for technical detail.___

The Arcade governance system's smart contracts can be grouped into the following categories:

- __Voting Vaults__: Depositories for voting tokens in the governance system - see [Council's documentation](https://docs.element.fi/governance-council/council-protocol-overview/voting-vaults) for more general information. Each voting vault contract is a separate deployment, which handles its own deposits and vote-counting mechanisms for those deposits. As described below, the Arcade.xyz uses novel vote-counting mechanisms. Voting vaults also support vote delegation: a critical component of the Council governance system.
- __Core Voting Contracts__: These contracts can be used to submit and vote on governance transactions. When governing a protocol, core voting contracts may either administrate the protocol directly, or may be intermediated by a Timelock contract.
- __Token Distribution__: