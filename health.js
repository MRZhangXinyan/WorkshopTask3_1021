// Part 8.3: Check whether enough acceptors are currently online to make progress.
const Quorum = require("./quorum");

function quorumHealth(acceptors, quorum = new Quorum(acceptors.length)) {
    const online = acceptors.filter(acceptor => acceptor.online).length;
    const required = quorum.majority();
    return {
        online,
        total: acceptors.length,
        required,
        healthy: quorum.reached(online)
    };
}

module.exports = { quorumHealth };
