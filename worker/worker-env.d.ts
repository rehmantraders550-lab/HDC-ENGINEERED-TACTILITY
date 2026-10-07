/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ARTWORKS: R2Bucket;
    ASSETS: { fetch(request: Request): Promise<Response> };
    APP_ENV: string;
    SESSION_SECRET: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD_HASH: string;
  }
}
