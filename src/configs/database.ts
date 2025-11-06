import type { Db } from "mongodb";

import { MongoClient } from "mongodb";

import { MONGODB_DB_NAME, MONGODB_URI } from "#/constants";

let client: MongoClient;
let database: Db;
let isWarned: boolean = false;

const connectDatabase = async (): Promise<void> => {
    if (database) return void 0;

    try {
        client = await MongoClient.connect(MONGODB_URI);
        database = client.db(MONGODB_DB_NAME);
    } catch (_: unknown) {
        if (isWarned) return void 0;
        console.log("Failed to connect to database.");
        console.log("The application will continue to run without a database.");
        isWarned = true;
    }
};

const getDatabase = (): Db => {
    if (!database) throw new Error("Database is not connected.");
    return database;
};

export { connectDatabase, getDatabase };
