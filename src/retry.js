const BACKOFF_MS = [0, 5000, 10000]; // research.md §7 (001) — 0s / 5s / 10s

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta fn() hasta 3 veces con backoff 0s/5s/10s (FR-008, Principio III).
 * onAttempt(status, attempt) se llama en cada intento: 'retrying' antes de reintentar,
 * 'ok' o 'failed' al terminar.
 */
async function withRetry(fn, onAttempt) {
  let lastError = null;

  for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt += 1) {
    if (BACKOFF_MS[attempt - 1] > 0) {
      await sleep(BACKOFF_MS[attempt - 1]);
    }
    try {
      const result = await fn();
      if (onAttempt) onAttempt('ok', attempt);
      return { ok: true, result };
    } catch (err) {
      lastError = err;
      const isLast = attempt === BACKOFF_MS.length;
      if (onAttempt) onAttempt(isLast ? 'failed' : 'retrying', attempt);
    }
  }

  return { ok: false, error: lastError };
}

module.exports = { withRetry };
