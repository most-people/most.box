export type Bindings = {
  DB: D1Database;
  BACKUP_BUCKET: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
  FAUCET_MNEMONIC: string;
  ENVIRONMENT: string;
};

export type Variables = {
  address: string;
};
