// Part 8.5: Structured audit events for proposal, promise, acceptance and decision.
const fs = require("node:fs");
const path = require("node:path");

class AuditLogger {
    constructor(filePath = null, { truncate = false } = {}) {
        this.events = [];
        this.filePath = filePath;
        if (filePath) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            if (truncate) fs.writeFileSync(filePath, "", { mode: 0o600 });
        }
    }

    record(type, details = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            type,
            ...details
        };
        if (this.filePath) {
            fs.appendFileSync(this.filePath, JSON.stringify(event) + "\n", { mode: 0o600 });
        }
        this.events.push(event);
        return event;
    }
}

module.exports = AuditLogger;
