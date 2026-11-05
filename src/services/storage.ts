import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { DatabaseSync, backup } from 'node:sqlite';
import config from '../config';

/**
 * Schema migrations, applied in order on startup. SQLite's built-in `user_version`
 * records how many have run, so each runs exactly once per database file.
 * Never edit or reorder an entry that has shipped; add a new one at the end.
 */
const MIGRATIONS: string[] = [
    // 1: temporary reaction roles (👍 Gamer / 🚨 Bad Boi), so expiry survives restarts.
    `CREATE TABLE role_expiry (
        guild_id   TEXT    NOT NULL,
        user_id    TEXT    NOT NULL,
        role_id    TEXT    NOT NULL,
        expires_at INTEGER NOT NULL,   -- unix ms
        PRIMARY KEY (guild_id, user_id, role_id)
    )`,
];

function log(text: string): void {
    console.log(`${new Date().toISOString()} [storage] ${text}`);
}

let db: DatabaseSync | null = null;

/** Opens (creating if needed) the database and applies pending migrations. Call once at startup. */
export function initStorage(path = config.storage.dbPath): void {
    const file = resolve(path);
    mkdirSync(dirname(file), { recursive: true });

    db = new DatabaseSync(file);
    // WAL lets readers (e.g. an admin UI) work while the bot writes; busy_timeout waits out brief locks.
    db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');

    const from = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

    if (from > MIGRATIONS.length) {
        // e.g. rolled back to an older image after a newer one migrated the file.
        log(`WARNING: database is schema v${from}, this build only knows v${MIGRATIONS.length}`);
    }

    for (let version = from; version < MIGRATIONS.length; version++) {
        db.exec('BEGIN');
        try {
            db.exec(MIGRATIONS[version]);
            db.exec(`PRAGMA user_version = ${version + 1}`);
            db.exec('COMMIT');
        } catch (err) {
            db.exec('ROLLBACK');
            throw new Error(`Migration ${version + 1} failed: ${(err as Error).message}`);
        }
    }

    log(`Ready: ${file} (schema v${Math.max(from, MIGRATIONS.length)}${from < MIGRATIONS.length ? `, migrated from v${from}` : ''})`);
}

/** Flushes and closes the database. Safe to call more than once. */
export function closeStorage(): void {
    db?.close();
    db = null;
}

function database(): DatabaseSync {
    if (!db) throw new Error('Storage not initialized; call initStorage() at startup');
    return db;
}

/** Consistent snapshot to `destination`, safe while the bot is writing (unlike copying the file). */
export async function backupStorage(destination: string): Promise<void> {
    await backup(database(), resolve(destination));
}

// ---- Role expiry ----

export interface RoleExpiry {
    guildId: string;
    userId: string;
    roleId: string;
    expiresAt: number;
}

/** Records (or pushes back) when a temporary role should be removed. */
export function setRoleExpiry({ guildId, userId, roleId, expiresAt }: RoleExpiry): void {
    database().prepare(`
        INSERT INTO role_expiry (guild_id, user_id, role_id, expires_at) VALUES (?, ?, ?, ?)
        ON CONFLICT (guild_id, user_id, role_id) DO UPDATE SET expires_at = excluded.expires_at
    `).run(guildId, userId, roleId, expiresAt);
}

export function clearRoleExpiry(guildId: string, userId: string, roleId: string): void {
    database().prepare('DELETE FROM role_expiry WHERE guild_id = ? AND user_id = ? AND role_id = ?')
        .run(guildId, userId, roleId);
}

/** Roles whose time is up, oldest first. */
export function dueRoleExpiries(now = Date.now()): RoleExpiry[] {
    const rows = database().prepare(`
        SELECT guild_id, user_id, role_id, expires_at FROM role_expiry
        WHERE expires_at <= ? ORDER BY expires_at
    `).all(now) as { guild_id: string; user_id: string; role_id: string; expires_at: number }[];

    return rows.map(r => ({ guildId: r.guild_id, userId: r.user_id, roleId: r.role_id, expiresAt: r.expires_at }));
}
