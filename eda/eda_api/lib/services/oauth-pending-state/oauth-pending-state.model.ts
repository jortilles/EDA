import * as mongoose from 'mongoose';

/**
 * Shared OAuth "state" storage for plugins that run an authorization-code flow
 * (Shopify, GA4...). The app runs as a Node cluster with several worker processes,
 * so the state set by /auth-url (handled by one worker) must be readable from
 * /oauth-callback and /poll-token even when a different worker handles those
 * requests — an in-memory Map does not survive across workers. Mongo does.
 *
 * The TTL index below makes Mongo delete documents 10 minutes after creation,
 * regardless of which process created them, so no manual cleanup is needed.
 */
export interface IOAuthPendingState extends mongoose.Document {
    state: string;
    data: Record<string, any>;
    token: string;
    createdAt: Date;
}

const OAuthPendingStateSchema = new mongoose.Schema({
    state: { type: String, required: true, unique: true },
    data: { type: Object, required: true },
    token: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, expires: 600 },
}, { collection: 'oauth-pending-state' });

export default mongoose.model<IOAuthPendingState>('OAuthPendingState', OAuthPendingStateSchema);
