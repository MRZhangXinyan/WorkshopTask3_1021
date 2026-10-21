// Part 8.4: Detect frequent changes of proposer within a bounded attempt window.
class ProposalMonitor {
    constructor({ windowSize = 5, switchThreshold = 3 } = {}) {
        if (!Number.isInteger(windowSize) || windowSize < 2 ||
            !Number.isInteger(switchThreshold) || switchThreshold < 1 ||
            switchThreshold >= windowSize) {
            throw new Error("Invalid proposal monitor configuration");
        }
        this.windowSize = windowSize;
        this.switchThreshold = switchThreshold;
        this.history = [];
    }

    record(proposerId, proposalNumber) {
        if (typeof proposerId !== "string" || !proposerId ||
            !Number.isSafeInteger(proposalNumber)) {
            throw new Error("Invalid proposal event");
        }
        this.history.push({ proposerId, proposalNumber });
        if (this.history.length > this.windowSize) this.history.shift();
        let switches = 0;
        for (let i = 1; i < this.history.length; i++) {
            if (this.history[i].proposerId !== this.history[i - 1].proposerId) switches++;
        }
        return {
            attempts: this.history.length,
            switches,
            alert: switches >= this.switchThreshold
        };
    }
}

module.exports = ProposalMonitor;
