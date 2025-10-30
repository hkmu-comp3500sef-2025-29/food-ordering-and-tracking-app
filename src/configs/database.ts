import { type Db, MongoClient } from "mongodb";

let client: MongoClient;
let database: Db;
let isWarned = false;

const connectDatabase = async (): Promise<void> => {
    if (database) return void 0;

    try {
        client = await MongoClient.connect(import.meta.env.VITE_MONGODB_URI);
        database = client.db(import.meta.env.VITE_MONGODB_DB_NAME);
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
