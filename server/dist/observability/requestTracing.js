"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRequestTracing = applyRequestTracing;
const crypto_1 = require("crypto");
/**
 * Middleware léger de tracing : assigne un correlation id (X-Request-Id)
 * pour suivre une requête de bout en bout dans les logs.
 */
function applyRequestTracing() {
    return (req, res, next) => {
        const incomingId = req.headers['x-request-id'] ||
            req.headers['x-correlation-id'];
        const requestId = incomingId || (0, crypto_1.randomUUID)();
        req.requestId = requestId;
        res.setHeader('X-Request-Id', requestId);
        // Conserve aussi côté locals pour d’éventuels middlewares ultérieurs
        res.locals.requestId = requestId;
        next();
    };
}
