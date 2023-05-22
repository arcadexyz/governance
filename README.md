[Arcade.xyz](https://docs.arcade.xyz/docs/faq) is a platform for autonomous borrowing, lending, and escrow of NFT collateral on EVM blockchains. This repository contains the contracts for a token-based governance system, which can be granted ownership and management authority over the core lending protocol. This governance system is built on the [Council Framework](https://docs.element.fi/governance-council/council-protocol-overview).

# Relevant Links

- 🌐 [Website](https://www.arcade.xyz) - UI to the Arcade Lending Protocol, hosted by Arcade.xyz.
- 📝 [Usage Documentation](https://docs.arcade.xyz) - User-facing documentation for the Arcade Lending Protocol.
- 🐛 [Bug Bounty](https://immunefi.com/bounty/arcade/) - Security discloure and bounty program for the Arcade Lending Protocol.
- 💬 [Discord](https://discord.gg/arcadexyz) - Join the Arcade.xyz community! Great for further technical discussion and real-time support.
- 🔔 [Twitter](https://twitter.com/arcade_xyz) - Follow us on Twitter for alerts, announcements, and alpha.

# Overview of Contracts

### ___See natspec for technical detail.___

The Arcade governance system's smart contracts can be grouped into the following categories:

- __Voting Vaults__: Depositories for voting tokens in the governance system - see [Council's documentation](https://docs.element.fi/governance-council/council-protocol-overview/voting-vaults) for more general information. Each voting vault contract is a separate deployment, which handles its own deposits and vote-counting mechanisms for those deposits. As described below, the Arcade.xyz uses novel vote-counting mechanisms. Voting vaults also support vote delegation: a critical component of the Council governance system.
- __Core Voting Contracts__: These contracts can be used to submit and vote on governance transactions. When governing a protocol, core voting contracts may either administrate the protocol directly, or may be intermediated by a Timelock contract.
- __Token Distribution__: The ERC20 governance token, along with contracts required for initial deployment and distribution of the token (airdrop contract, initial distributor contract).

## Voting Vaults

### BaseVotingVault

A basic `VotingVault` implementation, with little extension from Council. Defines common query
and management interfaces for all voting vaults.
### NFTBoostVault

The core community voting vault for governance: it enables token-weighted vote counting with
delegation and an NFT "boost". Tokenholders can deposit or withdraw into the vault to
register voting power, with no liquidity restrictions. Each token deposited represents a
unit of voting power. In addition, the NFT boost allows certain ERC1155 assets to receive
"multipliers": when users deposit those NFTs, the voting power of their deposited ERC20
tokens are boosted by multiplier. In addition to adding tokens and an NFT at deposit time,
both components of the deposit can be managed separately: NFTs can be added, updated, or
withdrawn separately, and a user can add or remove tokens from an NFT boosted position.

At any time, governance may update the multiplier value associated with a given NFT. Due
to gas constraints, this will not immediately update the voting power of users who are
using this NFT for a boost. However, any user's voting power can be updated by any other
user via the `updateVotingPower` function - this value will look up the current multiplier
of the user's registered NFT and recalculate the boosted voting power. This can be used
in cases where obselete boosts may be influencing the outcome of a vote.

### ArcadeGSCVotingVault

An instance of Council's `GSCVault`, a voting vault contract for a
[Governance Steering Council](https://docs.element.fi/governance-council/council-protocol-overview/governance-steering-council).
See Council documentation for more information.

### ARCDVestingVault

A voting vault, designed for early Arcade community members, contributors, and launch
partners, that holds tokens in escrow subject to a vesting timeline. Both locked and
unlocked tokens held by the vault contribute governance voting power. Since locked
tokens are held by the `ARCDVestingVault`, they are not eligible for NFT boosts. Based
heavily on Council's `AbstractVestingVault`.

### ImmutableVestingVault

An instance of the `ARCDVestingVault`, with functionality extended such that `revokeGrant`
can not be used. Tokens held in this vault otherwise have the same voting power
and liquidity constraints as ones held by `ARCDVestingVault`.

## Core Voting Contracts
### CoreVoting

An instance of Council's `GSCVault`, a voting vault contract for a
[Governance Steering Council](https://docs.element.fi/governance-council/council-protocol-overview/governance-steering-council).
See Council documentation for more information.

### ArcadeGscCoreVoting

An instance of Council's `CoreVoting`, set up for use by a GSC.

### Timelock

A contract which allows generic function call to be submitted by users,
where the calls can only be executed after a waiting period. Arcade
governance uses Council's `Timelock` directly.

## Token Distribution

### ArcadeToken

A standard OpenZeppelin based `ERC20` token, with minting capability.
At deploy time, an initial amount of circulating tokens are minted
to a distributor contract (see `ArcadeTokenDistributor`).

Governance is given ownership of the token on deployment, and every 365 days,
governance may decide to call the `mint` function to mint new tokens. The
ability to call `mint` is granted by governance to a single address. When
calling `mint`, governance may mint up to 2% of the total supply. After calling,
`mint`, it may not be called again for 365 days.

### ArcadeTokenDistributor

A contract which receives the initial circulating supply of token, and will
send tokens to destinations representing distribution according to tokenomics.
This may include airdrop contracts or vesting vaults.

### ArcadeAirdrop

A contract which can receive tokens from the distributor, and release them
for a second distribution according to a merkle tree. Governance may set
a merkle root, and users can claim tokens by proving ownership in the tree.

Unclaimed tokens after a set `expiration` time may be reclaimed by governance.

### Treasury

A contract which can receive tokens from the distributor, and transfer or
approve them based on invocations from governance. The GSC may be authorized
to spend smaller amounts from their own voting contract: all other amounts
must be authorized by full community votes.

# Privileged Roles & Access

* Vaults derived from the `BaseVotingVault` have two roles:
    * A `manager` role can access operational functions,
        such as calling `setMultiplier` in the `NFTBoostVault`,
        and calling `addGrantAndDelegate` and `revokeGrant`
        in the `ARCDVestingVault`.
    * A `timelock` role can change the `manager`, as well as changing
        its own role to a new timelock. For the `NFTBoostVault`, the
        timelock can eventually choose to allow token withdrawals.
* Core voting contracts have an `owner`, which in a governance
    system should be a timelock that is owned by `CoreVoting` itself:
    such that all updates to `CoreVoting` require passing votes. This
    `owner` is able to change parameters around voting, such as the
    minimum voting power needed to submit a proposal. The same suggested
    ownership architecture applies to `ArcadeGSCCoreVoting`: it should
    have ownership power over a separate timelock, which itself owns
    the voting contract.
* The `ArcadeToken` contract sets a `minter` role, which can mint new tokens
    under certain constraints (see `ArcadeToken` above). The `minter`
    can also transfer the role to another address.
* The `ArcadeAirdrop` contract as an `owner` that can update the merkle root,
    as well as reclaim tokens after airdrop expiry. This should be operationally
    managed by a voting contract.
* The `ArcadeTokenDistributor` contract is owned by an address which can administer
    the distribution. This owner may decide which address receives their reserved
    amount of tokens.
* The `Treasury` contract grants permissions to addresses who are allowed
    to spend tokens. There are separate roles for full spends, which should be granted
    to a community voting contract, and GSC spends, which may be granted to a community
    voting contract. Ownership may also be granted to timelocks owned by the respective
    voting contracts.