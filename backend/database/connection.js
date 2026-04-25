require('dotenv').config({ quiet: true });

const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'backend', 'database.sqlite');

const resolveDbPath = () => {
    return path.resolve(process.cwd(), process.env.DB_PATH || DEFAULT_DB_PATH);
};

const database = new Database(resolveDbPath());
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

module.exports = {
    database,
    resolveDbPath
};
