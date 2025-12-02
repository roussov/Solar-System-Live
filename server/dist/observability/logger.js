"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
function baseLog(level, message, context) {
    const payload = {
        level,
        message,
        time: new Date().toISOString(),
        ...context
    };
    const serialized = JSON.stringify(payload);
    if (level === 'error') {
        // eslint-disable-next-line no-console
        console.error(serialized);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(serialized);
    }
}
function logInfo(message, context) {
    baseLog('info', message, context);
}
function logWarn(message, context) {
    baseLog('warn', message, context);
}
function logError(message, context) {
    baseLog('error', message, context);
}
