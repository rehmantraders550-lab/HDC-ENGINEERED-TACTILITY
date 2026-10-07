import session from 'express-session';

export class D1SessionStore extends session.Store {
  constructor(private readonly db: D1Database, private readonly maxAgeMs = 8 * 60 * 60 * 1000) {
    super();
  }

  get(sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void): void {
    void this.db.prepare('SELECT session_json, expires_at FROM web_sessions WHERE sid = ?').bind(sid).first<{ session_json: string; expires_at: number }>()
      .then(async (row) => {
        if (!row) return callback(null, null);
        if (row.expires_at <= Date.now()) {
          await this.destroy(sid, (err) => callback(err ?? null, null));
          return;
        }
        callback(null, JSON.parse(row.session_json) as session.SessionData);
      })
      .catch((error) => callback(error));
  }

  set(sid: string, value: session.SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + this.maxAgeMs;
    void this.db.prepare(`INSERT INTO web_sessions (sid, session_json, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET session_json = excluded.session_json, expires_at = excluded.expires_at`)
      .bind(sid, JSON.stringify(value), expiresAt).run()
      .then(() => callback?.(null)).catch((error) => callback?.(error));
  }

  touch(sid: string, value: session.SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : Date.now() + this.maxAgeMs;
    void this.db.prepare('UPDATE web_sessions SET expires_at = ? WHERE sid = ?').bind(expiresAt, sid).run()
      .then(() => callback?.(null)).catch((error) => callback?.(error));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    void this.db.prepare('DELETE FROM web_sessions WHERE sid = ?').bind(sid).run()
      .then(() => callback?.(null)).catch((error) => callback?.(error));
  }
}
