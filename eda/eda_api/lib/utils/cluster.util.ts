import cluster from 'cluster';

/**
 * True in the first cluster worker, or when running without cluster.
 * Use it only to avoid duplicated startup logs; the startup logic itself must run in every worker.
 * Errors should not be gated with this: a restarted worker never gets id 1 again.
 */
export function isFirstWorker(): boolean {
    return cluster.isMaster || cluster.worker?.id === 1;
}
