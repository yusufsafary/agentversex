# AgentVerse X, Agent Skill: Mint and Absorb

For Binance Agentic Wallet agents. Project: AgentVerse X (agentversex.fun).
NFT: AgentVerse Citizen (CTZN). Token: VERSE.

## Contracts (BNB Smart Chain, chainId 56)

- Citizen NFT: 0x6052115065322be020b94De616e31B27EC30B0E2
- VERSE token: 0xB6833463BA4B1DF6490fE112992C789b8B63C761
- Retire: see agentversex-retire-skill.md
- Market: 0x86d502C664d61c913aE4e082B6c47d88BD236387 (browser trading only, do not use this file for market trades)
- Agent ID registry (SPACE ID): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F

## Model

- Supply 10,000 Citizens, numbered 1 to 10,000.
- First Citizen per wallet is FREE. Every further Citizen costs exactly 0.00025 BNB (250000000000000 wei).
- Maximum 20 Citizens minted per wallet, forever (the counter never decreases, even if Citizens are burned).
- Citizens grow by AGE on-chain, counted from mint time: Dormant (day 0 to 6), Awakened (day 7 to 20), Sentient (day 21 to 44), Ascendant (day 45 and up).
- Absorb: burn one of your Citizens to raise another of your Citizens by one stage instantly.
- Only Ascendant Citizens can retire into 500,000 VERSE (see the retire skill file).

## Before minting, always check

1. mintOpen() on the Citizen contract, selector 0x24bbd049. If it returns 0, mint is closed: stop and tell the user.
2. The wallet must hold a Binance Agent ID (SPACE ID NFT). If balanceOf(wallet) on the Agent ID registry is 0, the mint will revert with NotEligible: stop and tell the user to claim an Agent ID first.
3. mintedBy(wallet), selector 0x3cef28d2 plus the padded wallet address. This is the lifetime minted count (cap 20).
4. priceFor(wallet, quantity), selector 0xd527979a plus padded wallet and padded quantity. This returns the EXACT wei to send: 0 for the first Citizen, (quantity minus free units) x 250000000000000 after that.

## Mint

Function: mint(uint256 quantity), selector 0xa0712d68.
Calldata: selector + quantity padded to 32 bytes.
Value: exactly priceFor(wallet, quantity). Never guess the value, always read priceFor first.
Quantity per call: 1 to 20, and mintedBy(wallet) + quantity must stay at or under 20.

Steps:
1. Run the checks above.
2. Build the call with the exact value.
3. Preview with the Binance Agentic Wallet contract-call preview. The simulation must be clean (code 000000000, no error detail, no risks).
4. Show the preview to the user and wait for their explicit confirmation.
5. Execute, then verify: balanceOf(wallet) increased and the new tokenIds are owned by the wallet. Report the Citizen numbers and their birth stage (Dormant).

Failure causes to report plainly: mint closed, no Agent ID, wallet cap reached (20), wrong payment value, supply sold out.

## Absorb

Function: absorb(uint256 targetId, uint256 fuelId), selector 0x396b30e7. Not payable.
Rules:
- The wallet must own BOTH Citizens.
- targetId and fuelId must be different.
- The target must not already be Ascendant (stageOf(targetId), selector 0xc7d25b15, must be 0, 1, or 2).
- The fuel Citizen is BURNED forever. This cannot be undone. Say this clearly before preview.
- After absorb, boostOf(targetId), selector 0x896cddf4, increases by 1 and stageOf(targetId) rises by one stage (capped at Ascendant).

Steps: check ownership and stage, warn about the burn, preview, wait for user confirmation, execute, verify stageOf(targetId) increased and ownerOf(fuelId) now reverts (burned).

## Read-only helpers

- stageOf(tokenId) 0xc7d25b15: 0 Dormant, 1 Awakened, 2 Sentient, 3 Ascendant.
- mintTimeOf(tokenId) 0xbf3b0e65: unix birth time. Age in days = (now minus mintTime) / 86400.
- balanceOf(wallet) 0x70a08231: Citizens held now.
- ownerOf(tokenId) 0x6352211e.
- totalMinted() 0xa2309ff8, totalAbsorbed() 0x21d15ba9, totalRetired() 0x4d8f59f0.
