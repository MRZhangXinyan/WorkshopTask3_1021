const Quorum = require("./quorum");
const { quorumHealth } = require("./health");

class Simulator {
    // Part 8 additions are optional, so original Part 1-7 scenarios still run.
    constructor(proposer, acceptors, learners, {
        audit = null,
        stateGuard = null,
        proposalMonitor = null
    } = {}) {
        this.proposer = proposer;
        this.acceptors = acceptors;
        this.learners = learners;
        this.quorum = new Quorum(acceptors.length);
        this.audit = audit;
        this.stateGuard = stateGuard;
        this.proposalMonitor = proposalMonitor;
    }

    record(type, details) {
        if (this.audit) this.audit.record(type, details);
    }

    run(value) {
        console.log("\n====================");
        console.log(`Proposal Value = ${value}`);
        console.log("====================");
        console.log(`Acceptors: ${this.acceptors.length}`);
        console.log(`Required Quorum: ${this.quorum.majority()}`);
        console.log("");

        // Part 8.1: validate before each attempt, not just on creation.
        this.quorum.validateQuorum();

        // Part 8.2: check known, independent state snapshots before participating.
        if (this.stateGuard) {
            try {
                for (const acceptor of this.acceptors) {
                    if (acceptor.online) this.stateGuard.verify(acceptor);
                }
            } catch (error) {
                console.log(`BLOCKED: ${error.message}`);
                this.record("BLOCKED", { reason: "STATE_INTEGRITY", message: error.message });
                return { status: "BLOCKED", reason: "STATE_INTEGRITY" };
            }
        }

        // Part 8.3: do not generate a proposal if a majority is absent.
        const health = quorumHealth(this.acceptors, this.quorum);
        this.record("HEALTH", health);
        if (!health.healthy) {
            console.log(`MAJORITY LOST: ${health.online}/${health.total} online; need ${health.required}`);
            console.log("New proposals disabled");
            this.record("BLOCKED", { reason: "MAJORITY_LOSS", ...health });
            return { status: "BLOCKED", reason: "MAJORITY_LOSS" };
        }

        const proposal = this.proposer.nextProposal(value);
        this.record("PROPOSAL", {
            proposer: this.proposer.id,
            proposalNumber: proposal.number,
            desiredValue: value
        });

        // Part 8.4: monitor proposer turnover (not just rising proposal numbers).
        if (this.proposalMonitor) {
            const activity = this.proposalMonitor.record(this.proposer.id, proposal.number);
            if (activity.alert) {
                console.log(`WARNING: PROPOSER CHURN (${activity.switches} switches)`);
                this.record("CHURN_ALERT", activity);
            }
        }

        // Phase 1: PREPARE / PROMISE
        const promises = [];
        for (const acceptor of this.acceptors) {
            const response = acceptor.prepare(proposal.number);
            if (response) {
                // Save state before counting a Promise as received.
                if (this.stateGuard) this.stateGuard.checkpoint(acceptor);
                promises.push(response);
                this.record("PROMISE", {
                    acceptor: response.acceptor,
                    proposalNumber: response.proposalNumber,
                    previouslyAccepted: response.accepted
                });
                console.log(`${acceptor.id} PROMISE`);
            }
        }

        console.log(`Promises Received: ${promises.length}/${this.acceptors.length}`);
        this.record("QUORUM", {
            phase: "PREPARE", received: promises.length,
            required: this.quorum.majority(), reached: this.quorum.reached(promises.length)
        });
        if (!this.quorum.reached(promises.length)) {
            console.log("FAILED: no quorum of promises");
            return { status: "FAILED", reason: "PREPARE_QUORUM" };
        }

        // Paxos safety: adopt the value of the highest previously accepted proposal.
        let highestAccepted = null;
        for (const promise of promises) {
            if (promise.accepted &&
                (highestAccepted === null || promise.accepted.number > highestAccepted.number)) {
                highestAccepted = promise.accepted;
            }
        }
        if (highestAccepted) {
            console.log("\nPREVIOUSLY ACCEPTED VALUE FOUND");
            console.log(`Proposal ${highestAccepted.number}`);
            console.log(`Value = ${highestAccepted.value}`);
            console.log("Overriding proposer value to preserve safety");
            proposal.value = highestAccepted.value;
        }

        // Phase 2: ACCEPT
        const accepted = [];
        for (const acceptor of this.acceptors) {
            const response = acceptor.accept(proposal);
            if (response) {
                if (this.stateGuard) this.stateGuard.checkpoint(acceptor);
                accepted.push(response);
                this.record("ACCEPTED", {
                    acceptor: acceptor.id,
                    proposalNumber: proposal.number,
                    value: proposal.value
                });
                console.log(`${acceptor.id} ACCEPTED`);
            }
        }

        console.log(`Acceptances Received: ${accepted.length}/${this.acceptors.length}`);
        this.record("QUORUM", {
            phase: "ACCEPT", received: accepted.length,
            required: this.quorum.majority(), reached: this.quorum.reached(accepted.length)
        });
        if (!this.quorum.reached(accepted.length)) {
            console.log("FAILED: no quorum of accepts");
            return { status: "FAILED", reason: "ACCEPT_QUORUM" };
        }

        // Learn + Part 8.5 audit of the chosen value.
        console.log(`VALUE CHOSEN: ${proposal.value}`);
        this.record("CHOSEN", { proposalNumber: proposal.number, value: proposal.value });
        for (const learner of this.learners) learner.learn(proposal.value);
        return { status: "CHOSEN", value: proposal.value, proposalNumber: proposal.number };
    }
}

module.exports = Simulator;
