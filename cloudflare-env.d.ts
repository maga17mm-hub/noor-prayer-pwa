declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    NOOR_CRON_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
