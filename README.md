# COMSM0122 Workshop 3 — Paxos Hardening (Part 8)

This educational project is based on the workshop-provided Paxos simulator. The original Part 1–7 scenario files are retained. Part 8 implements **all five optional choices** of hardening mechanism described in the manual (the manual requires **one or more**, not all five).

## Requirements

- Node.js version 18 or newer
- npm
- Windows / WSL Ubuntu, Linux or macOS terminal
- No third-party runtime dependencies

## Install and run

From the `paxos-lab` folder:

```bash
node -v
npm install
npm run hardening
npm test
npm run verify
```

`npm run hardening` runs each Part 8.1–8.5 demonstration. `npm test` runs 14 focused tests using the built-in Node.js test runner. `npm run verify` additionally runs the original Part 1–7 scenarios and checks that the hardening scenario still executes.

## Part 8 defensive mechanisms

| Manual task | Code | Demonstration |
|---|---|---|
| 8.1 Protect Quorum Rules | `quorum.js` | `new Quorum(5, 2)` is rejected; runtime tampering also rejected |
| 8.2 Detect State Loss | `state_guard.js`, `simulator.js` | a trusted checkpoint of `(101, instances=10)` detects a live acceptor reset to `(0, null)` |
| 8.3 Protect Against Majority Loss | `health.js`, `simulator.js` | 1/3 available acceptors: new proposal blocked before proposer number increments |
| 8.4 Detect Proposer Instability | `proposal_monitor.js`, `simulator.js` | alternating P1/P2 causes an alert; a single increasing-number P1 does not |
| 8.5 Improve Observability | `audit_logger.js`, `simulator.js` | structured JSONL captures proposal, promises, acceptances, quorum outcomes, chosen values |

The generated log is `results/hardening_audit.jsonl`. Each line is an individual JSON object. For example:

```bash
cat results/hardening_audit.jsonl
```

Log entries include an ISO timestamp and event types `HEALTH`, `PROPOSAL`, `PROMISE`, `QUORUM`, `ACCEPTED`, and `CHOSEN`. Additional `BLOCKED` or `CHURN_ALERT` events appear when relevant.

## What changed from the original workshop ZIP

- Modified `quorum.js`: added bounds validation and a safely checked quorum field.
- Modified `simulator.js`: checks snapshots and majority before proposing, persists new acceptor states in guarded runs, records proposer events and audit events; added a structured return value.
- Replaced `scenarios/hardening.js`: **the original #5 was a safe deployment example**, not Task 8.5 observability; the replacement explicitly demonstrates each manual task.
- Modified `package.json`: added `test` and `verify` scripts.
- Added `state_guard.js`, `health.js`, `proposal_monitor.js`, `audit_logger.js`.
- Added `tests/hardening.test.js`, `PART8_REPORT.md`, `MODIFICATION_GUIDE.md`.
- **Not modified:** original `acceptor.js`, `proposer.js`, Part 1–7 scenario files and `network.js`.

A code-only unified diff is included as `CODE_CHANGES.patch`.

## Example outputs

```text
[Task 8.1] Protect Quorum Rules
BLOCKED: Unsafe quorum size: 2 for 5 acceptors (minimum 3)

[Task 8.2] Detect State Loss
BLOCKED: STATE LOSS DETECTED: A1

[Task 8.3] Protect Against Majority Loss
MAJORITY LOST: 1/3 online; need 2
New proposals disabled

[Task 8.4] Detect Proposer Instability
Alternating proposers: 4 switches; alert=true
One stable proposer: 0 switches; alert=false

[Task 8.5] Improve Observability
VALUE CHOSEN: instances=20
Audit log: results/hardening_audit.jsonl
```

## Important limits (educational implementation)

- The simulator runs synchronously in one Node.js process; it is not a real distributed deployment.
- The state guard compares an independent **local** JSON checkpoint with in-memory state. It does not protect against simultaneous deletion or malicious tampering of the checkpoint, power-loss durability failures, networked state repair, or restore safe consensus state automatically. Correct persistent Paxos storage requires stronger persistence and recovery procedures.
- The proposal monitor detects changes of proposer identifier within the last five recorded attempts. It does not analyse wall-clock rates, failure frequencies or real leader elections.
- The health check detects the number of online acceptors **before** a run. A real system needs ongoing health checks and quorum tracking across asynchronous messages.
- The JSONL audit log is local, not cryptographically protected, not replicated, and may contain application values that should be restricted in a real system.
- Original teaching scenarios deliberately exhibit limitations. In particular, the original Part 4 example reuses proposal number 101 for two different values; it has **not** been silently altered here. The original Part 7.4 scenario directly monkey-patches `majority()` to display 2; the hardening checks use the validated `quorumSize` and cannot be bypassed by that display-only change.


