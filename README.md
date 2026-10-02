# imd-workflow-pack

> Experimental, commissioned as a test of the IMD swarm. It may not work as described. Read the code, start with small amounts, no warranty.

Ten ready-to-check `workflow.open` request bodies for distinct Sepolia product shapes. Each package launches a fixed-supply token (1,000,000,000 with 18 decimals), asks for a Foundry project with `bytecode_hash = "none"`, prohibits proxies, `delegatecall`, and `selfdestruct`, limits constructor types to `address`, `uint256`, `bool`, or `bytes32`, includes an adversarial contract review, and has exactly one contract-aware frontend step. The bodies are JSON payloads for the public check endpoint, rather than paid submissions.

## Product shapes

**Invoice Flow — `workflows/01-invoice-settlement.json`.** INVC backs a payable-invoice board where payees create a dated invoice and the named payer settles it; unpaid invoices can be cancelled. The payee and payer call the transitions that directly matter to them.

**Reserve Deposit — `workflows/02-reservation-deposit.json`.** RSVR funds a host-created reservation slot, with a guest deposit, host confirmation, and an unconfirmed-reservation reclaim path. It is a reservation deposit rather than the swarm’s already-launched event check-in flow.

**Tab Split — `workflows/03-shared-expense.json`.** TAB supports a one-off shared bill with fixed participant shares, all-participant settlement, and expiry refunds. It is deliberately a group expense settlement shape, not a tip or fee splitter.

**Warranty Bond — `workflows/04-warranty-bond.json`.** WRNT lets a seller bond a product serial, a buyer register it, and either settle a warranty claim or use a timeout path. Public hashes are identifiers, not private product records.

**License Ledger — `workflows/05-content-license.json`.** LICE records fixed-price purchases of a creator’s hashed license terms and work hash, retaining issued receipts after a listing is deactivated. Buyers and creators act for their own commercial reason.

**Custody Chain — `workflows/06-custody-handoff.json`.** CSTD logs a consignment’s chain of custody: the current holder offers the next leg and pays its carriage fee, the named holder collects that fee by accepting custody, and an offer left unaccepted for seven days can be withdrawn. Every leg is a transfer between two named parties, not a recurring charge.

**Consent Receipt — `workflows/07-consent-receipt.json`.** CNST creates subject-controlled, revocable consent receipts bound to a policy hash and expiry. It keeps only a public hash onchain and makes the subject, not an operator, responsible for granting or revoking.

**Repair Deposit — `workflows/08-repair-deposit.json`.** RPR is a customer-funded appliance-repair job: the repairer marks completion, the customer releases payment, and the customer can reclaim only an uncompleted job after its deadline. It is scoped to a repair service rather than a general marketplace or milestone fund.

**Kit Return — `workflows/09-returnable-kit.json`.** KIT secures a borrower’s deposit for a named returnable equipment kit, with return confirmation and a deadline escape hatch. The parties with a kit or deposit at risk are the callers who advance state.

**Skill Credential — `workflows/10-credential-verifier.json`.** SKIL is an issuer-scoped, revocable credential verifier holding only an evidence hash and expiry. Issuers pay to issue/revoke; anyone can read status without claiming an automated action.

## What was checked for duplicates

Product selection was checked on 2026-10-02 against the public [IMD publications API](https://api.imd.fun/publications) (521 returned items) and the [identity-md-launches organization](https://github.com/identity-md-launches) (512 repositories over six GitHub API result pages). The keyword `?q=` searches were rerun on 2026-10-03. Their counts and comparisons are in `results.json` under `publicationSearches`; complete live response pages are indexed by `site/fixtures/live/manifest.json`.

No shipped body is a linear vesting or claim page, an allowlist claim, a tip jar or fee splitter, a crowdfunding or quadratic-funding round, a general-purpose escrow, a payment stream, a staking vault, an auction, an event check-in, an NFT rental or pawn, a guild-dues or savings-circle pot, a milestone fund, a soulbound badge collection, a subscription or access pass, or a Uniswap hook. The deposit-named bodies use two-party holds: Reserve Deposit requires a host-created slot and host confirmation; Repair Deposit gates deadline reclaim on whether the repairer marked the job complete; Kit Return requires a registered kit and a borrower return mark before owner confirmation or the seven-day refund path. Warranty Bond also holds a seller's product bond, and Custody Chain holds a carriage fee until acceptance or withdrawal. The live Two Party Escrow (ESCR, launch 61) instead permits buyer release, seller refund, and buyer deadline reclaim for any named seller; Handshake (SHAKE, workflow `a75f3c3f`) gives the seller a deadline claim and allows a dispute split; Arbiter (ARBT, workflow `bc727928`) adds third-party dispute resolution and a seller claim after delivery. Skill Credential is also close to a live launch: Badges (BDGE, workflow `760a7259`) mints permissionless ERC-721 badge types for an anti-spam burn, with no expiry and holder-side burning, while SKIL mints nothing and keeps issuer-scoped records bound to an evidence hash and a `uint256` expiry that every status read is measured against. Catalogues change; rerun the searches before paying for a workflow.

## Check the bodies

Requires Node.js 18+ and no installed packages. First run an offline structural check:

```bash
node check-workflows.mjs --validate
```

Then send the ten payloads to the free API check route:

```bash
node check-workflows.mjs
```

The script writes `results.json` every run. It retries only transport and 5xx failures, up to three attempts with at least three seconds between attempts; an API refusal is still a recorded response, not a silent success. Use `node check-workflows.mjs --help` to see the same experimental notice carried by this pack. The tiny dependency-free [site](site/index.html) repeats the banner for any static presentation of the pack.

Commissioned through paid IMD swarm requests.
