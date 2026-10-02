#!/usr/bin/env node
/**
 * Experimental, commissioned as a test of the IMD swarm. It may not work as described. Read the code, start with small amounts, no warranty.
 */
import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve, basename } from "node:path";

const NOTICE = "Experimental, commissioned as a test of the IMD swarm. It may not work as described. Read the code, start with small amounts, no warranty.";
const ROOT = resolve(import.meta.dirname);
const WORKFLOWS = resolve(ROOT, "workflows");
const RESULTS = resolve(ROOT, "results.json");
const REQUIRED_SUPPLY = "1,000,000,000";

/**
 * The publication searches behind the pack's duplicate check, as they answered on the date below.
 * Each entry is one GET https://api.imd.fun/publications?q=<query>; "matches" summarizes
 * relevant results. The complete response pages are saved under site/fixtures/live/ and indexed
 * by its manifest. Catalogues change, so rerun the queries before paying for a body.
 */
const PUBLICATION_SEARCHES = {
  ranOn: "2026-10-03",
  timezone: "Europe/Berlin",
  endpoint: "https://api.imd.fun/publications?q=",
  snapshotManifest: "site/fixtures/live/manifest.json",
  queries: [
    { for: "workflows/06-custody-handoff.json", q: "custody chain", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "chain of custody", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "consignment", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "shipment", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "freight", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "cargo", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "courier", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "logistics", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "bill of lading", count: 0, matches: [] },
    { for: "workflows/06-custody-handoff.json", q: "proof of delivery", count: 0, matches: [] },
    {
      for: "workflows/06-custody-handoff.json",
      q: "custody",
      count: 6,
      matches: [
        "launch:87513a53 (lumi #594, live) — a Pokemon TCG price-oracle consumer, uses the word in passing",
        "workflow:84f824c8 (BEAT #244, live) — DeadMansSwitch, which says it is not a custody product",
        "launch:5cdf977b (BZR #37, live) — an ERC-721 marketplace",
        "job:be59ed06, job:a5da5bb0, job:1d42e8ab — a review, a guide and a research proposal, no product of their own"
      ]
    },
    {
      for: "workflows/06-custody-handoff.json",
      q: "handover",
      count: 2,
      matches: [
        "workflow:760a7259 (BDGE #288, live) — SoulboundBadges, where handover means passing a badge type's issuer role",
        "job:449903bc — an ERC-6909 implementation job"
      ]
    },
    {
      for: "workflows/06-custody-handoff.json",
      q: "handoff",
      count: 115,
      matches: [
        "All 115 items across six saved pages concern launch/deployment handoffs, frontend handoff files, or unrelated work; none is a chain-of-custody or consignment product"
      ]
    },
    {
      for: "retired: the former workflows/06-subscription-pass.json",
      q: "subscription",
      count: 2,
      matches: [
        "workflow:b41fdc9b (CDNC #87, live) — SubscriptionRegistry sells a token-paid 30-day renewable period with isActive(address); the Access Pass body duplicated it and was withdrawn",
        "workflow:1022bc34 (SIGNAL #499, parked) — a per-wallet signal board, unrelated"
      ]
    },
    {
      for: "workflows/10-credential-verifier.json",
      q: "badge",
      count: 9,
      matches: [
        "workflow:760a7259 (BDGE #288, live) — SoulboundBadges mints permissionless ERC-721 badge types for an anti-spam burn, with no expiry and holder-side burning; SKIL mints nothing and keeps issuer-scoped records bound to an evidence hash and a uint256 expiry",
        "workflow:3b69e363 (MCLUB #145, live) — a balance-gated soulbound membership badge",
        "workflow:500e1a99 (IMD #445, live) — a card-payment receiver whose site shows a Sepolia badge",
        "launch:9046f91e (DUEL #35, live) and five job publications — matched on wording that rules badges out, or on unrelated UI badges"
      ]
    },
    {
      for: "workflows/10-credential-verifier.json",
      q: "credential",
      count: 17,
      matches: [
        "workflow:b752de71 (CHKN #309, live) — EventCheckin, which states its attendance records are not credentials",
        "workflow:760a7259 (BDGE #288, live) — as above, SoulboundBadges states its badges are not credentials",
        "workflow:bcfbc7c4, workflow:54934f3a, workflow:20270aa7, workflow:0dfa414d, workflow:693be293, launch:9046f91e and nine job publications — matched on frontend boilerplate about wallet or operator credentials"
      ]
    },
    {
      for: "workflows/02-reservation-deposit.json; workflows/08-repair-deposit.json; workflows/09-returnable-kit.json",
      q: "escrow",
      count: 17,
      matches: [
        "launch:1237279a (ESCR #61, live) — generic buyer-funded escrow: buyer release, seller refund, buyer reclaim after deadline; closest to RPR, which gates reclaim on the repairer's completion state",
        "workflow:a75f3c3f (SHAKE #82, live) — buyer release, seller claim after deadline, and pre-deadline dispute split; none of the three deposit bodies grants the counterparty a timeout claim",
        "workflow:bc727928 (ARBT, live) — seller delivery mark and buyer release, plus third-party arbitration and multiple timeout paths; RPR has no arbiter or dispute path",
        "The other 14 returned publications cover other escrow uses or mention the term in unrelated work; full bodies are in the saved response page"
      ]
    },
    {
      for: "workflows/02-reservation-deposit.json; workflows/08-repair-deposit.json; workflows/09-returnable-kit.json",
      q: "deposit",
      count: 43,
      matches: [
        "launch:1237279a (ESCR #61, live) — generic two-party deposit, compared with RSVR, RPR and KIT in the escrow search above",
        "Other results include vaults, streams, vesting, savings, and unrelated uses of deposit; none describes a host-created reservation slot, repair completion gate, or kit-return confirmation"
      ]
    },
    {
      for: "workflows/08-repair-deposit.json",
      q: "repair",
      count: 5,
      matches: [
        "The five returned publications concern a UI request, SwarmWorld, Proof Of Work, and VolatilityGuard work; none is an appliance-repair deposit product"
      ]
    }
  ]
};

function help() {
  console.log(`imd-workflow-pack checker\n\n${NOTICE}\n\nUsage: node check-workflows.mjs [--validate] [--help]\n\nPosts every workflows/*.json body to https://api.imd.fun/requests/check.\nNetwork or 5xx failures are retried at most three times, with a three-second pause.\nEvery run copies the dated duplicate-check searches into results.json.\n--validate checks the pack locally and writes results.json without a network request.`);
}

function validate(file, body) {
  const faults = [];
  const input = body?.input;
  const draft = input?.draft;
  const allText = JSON.stringify(body).toLowerCase();
  if (body?.action !== "workflow.open") faults.push("action must be workflow.open");
  if (!input || !draft) faults.push("input and input.draft are required");
  if (draft?.shape !== "chain" && draft?.shape !== "dag") faults.push("draft.shape must be chain or dag");
  if (draft?.onchain !== "evm_project") faults.push("draft.onchain must be evm_project");
  if (input?.permissions?.onchain?.chainId !== 11155111) faults.push("permissions chainId must be 11155111");
  if (input?.permissions?.onchain?.kind !== "evm_project") faults.push("permissions onchain kind must be evm_project");
  const steps = draft?.steps || [];
  const frontends = steps.filter((s) => s.skill === "frontend-for-contract" || s.skill === "build-website");
  if (frontends.length !== 1) faults.push("exactly one frontend-for-contract or build-website step is required");
  if (!steps.some((s) => s.skill === "adversarial-review")) faults.push("an adversarial-review step is required");
  const combined = `${input?.request || ""}\n${input?.context || ""}\n${draft?.objective || ""}`;
  if (combined.length >= 7000) faults.push("request + context + draft objective must be under 7,000 characters");
  if (!input?.request?.includes(REQUIRED_SUPPLY) || !/18 decimals/.test(input.request)) faults.push("request must state 1,000,000,000 supply and 18 decimals");
  for (const phrase of ["bytecode_hash", "proxy", "delegatecall", "selfdestruct", "constructor"]) {
    if (!allText.includes(phrase)) faults.push(`missing required constraint: ${phrase}`);
  }
  if (!/only address, uint256, bool or bytes32 arguments/.test(input?.context || "")) faults.push("constructor type restriction is missing");
  return { file, valid: faults.length === 0, faults, characters: combined.length };
}

async function sleep(ms) { return new Promise((done) => setTimeout(done, ms)); }

async function checkOne(file, body) {
  const attempts = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.imd.fun/requests/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      attempts.push({ attempt, status: response.status, response: payload });
      if (response.status < 500) return { file, outcome: "responded", attempts };
    } catch (error) {
      attempts.push({ attempt, error: error instanceof Error ? error.message : String(error) });
    }
    if (attempt < 3) await sleep(3000);
  }
  return { file, outcome: "unavailable_after_retries", attempts };
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) { help(); process.exit(0); }
const localOnly = args.has("--validate");
if ([...args].some((arg) => arg !== "--validate")) { help(); process.exit(2); }

const names = (await readdir(WORKFLOWS)).filter((name) => name.endsWith(".json")).sort();
const bodies = await Promise.all(names.map(async (name) => ({ file: `workflows/${name}`, body: JSON.parse(await readFile(resolve(WORKFLOWS, name), "utf8")) })));
const validations = bodies.map(({ file, body }) => validate(file, body));
const report = {
  generatedAt: new Date().toISOString(),
  endpoint: "https://api.imd.fun/requests/check",
  mode: localOnly ? "local-validation" : "remote-check",
  notice: NOTICE,
  publicationSearches: PUBLICATION_SEARCHES,
  validations,
  results: []
};

if (validations.some((item) => !item.valid)) {
  report.results = validations.filter((item) => !item.valid).map((item) => ({ file: item.file, outcome: "not_sent_invalid_body", faults: item.faults }));
} else if (localOnly) {
  report.results = bodies.map(({ file }) => ({ file, outcome: "not_sent_local_validation_only" }));
} else {
  for (const { file, body } of bodies) report.results.push(await checkOne(file, body));
}
await writeFile(`${RESULTS}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
await rename(`${RESULTS}.tmp`, RESULTS);
console.log(`${report.results.length} workflow result(s) written to ${basename(RESULTS)}.`);
if (validations.some((item) => !item.valid)) process.exitCode = 1;
