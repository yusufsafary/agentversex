# AgentVerse X, Agent Skill: Retire an Ascendant into VERSE

For Binance Agentic Wallet agents. Project: AgentVerse X (agentversex.fun).

## Contracts (BNB Smart Chain, chainId 56)

- Citizen NFT: 0x6052115065322be020b94De616e31B27EC30B0E2
- VERSE token: 0xB6833463BA4B1DF6490fE112992C789b8B63C761
- Retire contract: 0xcCe4b47FC42d2263106659210605f9d846E2B426

## Rules

- Only an ASCENDANT Citizen can retire: stageOf(tokenId) on the NFT contract, selector 0xc7d25b15, must return 3.
- Retiring BURNS the Citizen forever and pays exactly 500,000 VERSE (500000000000000000000000 wei) from the retire pool to the Citizen owner.
- Fee per retire: exactly 238148103194019 wei in BNB. Read claimFee() on the retire contract, selector 0x99d32fc4, and use that value; do not hardcode trust in this file if the read disagrees, report the read value to the user.
- The retire window must be open: claimOpen() on the retire contract, selector 0x4b8bcb58, must return 1.
- claimsRemaining() on the retire contract, selector 0x754c463f, shows how many retires the pool can still pay.

## Retire

Function: claim(uint256 tokenId) on the retire contract, selector 0x379607f5.
Calldata: selector + tokenId padded to 32 bytes.
Value: exactly claimFee().

Steps:
1. Check claimOpen() is 1, stageOf(tokenId) is 3, and ownerOf(tokenId) on the NFT contract is the user wallet.
2. Warn the user clearly: the Citizen will be burned forever in exchange for 500,000 VERSE.
3. Preview with the Binance Agentic Wallet contract-call preview. Simulation must be clean (code 000000000, no error detail, no risks). The preview balance changes should show the Citizen leaving and 500,000 VERSE arriving.
4. Show the preview and wait for explicit user confirmation.
5. Execute, then verify: ownerOf(tokenId) reverts (burned) and the wallet VERSE balance increased by 500,000.

Failure causes to report plainly: retire window closed, Citizen not Ascendant yet (give its current stage and the day it reaches Ascendant, or offer absorb), not the owner, wrong fee value, pool empty.
