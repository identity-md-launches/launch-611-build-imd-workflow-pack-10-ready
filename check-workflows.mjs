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

function help() {
  console.log(`imd-workflow-pack checker\n\n${NOTICE}\n\nUsage: node check-workflows.mjs [--validate] [--help]\n\nPosts every workflows/*.json body to https://api.imd.fun/requests/check.\nNetwork or 5xx failures are retried at most three times, with a three-second pause.\n--validate checks the pack locally and writes results.json without a network request.`);
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
