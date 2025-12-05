import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware léger de tracing : assigne un correlation id (X-Request-Id)
 * pour suivre une requête de bout en bout dans les logs.
 */
export function applyRequestTracing(): RequestHandler {
  return (req, res, next) => {
    const incomingId =
      (req.headers['x-request-id'] as string | undefined) ||
      (req.headers['x-correlation-id'] as string | undefined);

    const requestId = incomingId || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Conserve aussi côté locals pour d’éventuels middlewares ultérieurs
    res.locals.requestId = requestId;

    next();
  };
}
