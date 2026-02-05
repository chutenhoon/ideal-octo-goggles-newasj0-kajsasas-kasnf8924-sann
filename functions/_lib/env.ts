export interface Env {
  DB: D1Database;
  R2_VIDEOS: R2Bucket;
  VMS_KEY: string;
  ADMIN_KEY: string;
  ADMIN_PANEL_KEY: string;
  SESSION_SECRET: string;
  APP_NAME: string;
  R2_S3_ACCESS_KEY_ID: string;
  R2_S3_SECRET_ACCESS_KEY: string;
  R2_S3_ENDPOINT: string;
  R2_S3_BUCKET: string;
}
