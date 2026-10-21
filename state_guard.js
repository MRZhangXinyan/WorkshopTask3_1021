// Part 8.2: Compare live acceptor state to an independent on-disk checkpoint.
// Educational snapshot: it is not a distributed durable-storage implementation.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

class StateGuard {
    constructor(directory) {
        this.directory = directory;
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    }

    snapshotPath(acceptor) {
        if (!/^[A-Za-z0-9_-]+$/.test(acceptor.id)) {
            throw new Error("Invalid acceptor ID for state snapshot");
        }
        return path.join(this.directory, `${acceptor.id}.json`);
    }

    extract(acceptor) {
        const promised = acceptor.highestPromised;
        const accepted = acceptor.acceptedProposal;
        if (!Number.isSafeInteger(promised) || promised < 0 ||
            (accepted !== null &&
             (!Number.isSafeInteger(accepted.number) || accepted.number < 0 ||
              typeof accepted.value !== "string" || accepted.number > promised))) {
            throw new Error(`INVALID STATE: ${acceptor.id}`);
        }
        return {
            highestPromised: promised,
            acceptedProposal: accepted ? {
                number: accepted.number,
                value: accepted.value
            } : null
        };
    }

    checkpoint(acceptor) {
        const state = this.extract(acceptor);
        const target = this.snapshotPath(acceptor);
        const temp = `${target}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
        try {
            fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600, flag: "wx" });
            fs.renameSync(temp, target);
        } finally {
            if (fs.existsSync(temp)) fs.unlinkSync(temp);
        }
        return state;
    }

    verify(acceptor) {
        const target = this.snapshotPath(acceptor);
        if (!fs.existsSync(target)) {
            throw new Error(`MISSING STATE SNAPSHOT: ${acceptor.id}`);
        }
        let stored;
        try {
            stored = JSON.parse(fs.readFileSync(target, "utf8"));
        } catch (error) {
            throw new Error(`CORRUPT STATE SNAPSHOT: ${acceptor.id}`);
        }
        const current = this.extract(acceptor);
        if (!Number.isSafeInteger(stored.highestPromised) ||
            current.highestPromised < stored.highestPromised ||
            (stored.acceptedProposal &&
             (!current.acceptedProposal ||
              current.acceptedProposal.number < stored.acceptedProposal.number ||
              (current.acceptedProposal.number === stored.acceptedProposal.number &&
               current.acceptedProposal.value !== stored.acceptedProposal.value)))) {
            throw new Error(`STATE LOSS DETECTED: ${acceptor.id}`);
        }
        return true;
    }
}

module.exports = StateGuard;
