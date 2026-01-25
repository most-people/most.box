DROP TABLE IF EXISTS users;
CREATE TABLE users (
    address TEXT PRIMARY KEY,
    username TEXT,
    created_at INTEGER
);

DROP TABLE IF EXISTS files;
CREATE TABLE files (
    cid TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    tx_hash TEXT,
    created_at INTEGER,
    expired_at INTEGER,
    address TEXT,
    path TEXT DEFAULT '/',
    PRIMARY KEY (address, cid),
    FOREIGN KEY (address) REFERENCES users(address)
);
