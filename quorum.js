// Part 8.1: Validate quorum parameters instead of trusting a weakened rule.
class Quorum {
    constructor(size, quorumSize = Math.floor(size / 2) + 1) {
        this.size = size;
        this.quorumSize = quorumSize;
        this.validateQuorum();
    }

    validateQuorum() {
        if (!Number.isInteger(this.size) || this.size < 1) {
            throw new Error(`Invalid acceptor count: ${this.size}`);
        }
        const minimum = Math.floor(this.size / 2) + 1;
        if (!Number.isInteger(this.quorumSize) ||
            this.quorumSize < minimum || this.quorumSize > this.size) {
            throw new Error(
                `Unsafe quorum size: ${this.quorumSize} for ${this.size} acceptors (minimum ${minimum})`
            );
        }
        return true;
    }

    majority() {
        this.validateQuorum();
        return this.quorumSize;
    }

    reached(count) {
        // Deliberately use the validated field, not a monkey-patched majority() method.
        this.validateQuorum();
        return Number.isInteger(count) && count >= this.quorumSize;
    }
}

module.exports = Quorum;
