import { exit } from "node:process";

import mongoose from "mongoose";

import { ConfigManager as cm } from "#/configs/config.manager.js";
import { logger } from "#/configs/logger.js";

const Config = cm.getInstance();

export class DatabaseManager {
    private static instance: DatabaseManager;
    private uri: string = Config.get("MONGODB_URI");
    private dbName: string = Config.get("MONGODB_DB_NAME");
    private ready: Promise<void>;

    private constructor() {
        // keep a reference to the initialization promise so callers can await it
        this.ready = this.initialize();
    }

    /**
     * Get the singleton instance. This method is async to ensure callers
     * receive an instance only after the DB connection attempt finished
     * (successful connect or the process exits on failure).
     */
    public static async getInstance(): Promise<DatabaseManager> {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        // wait for initialization to complete (connect or timeout -> exit)
        await DatabaseManager.instance.ready;
        return DatabaseManager.instance;
    }

    private async initialize(): Promise<void> {
        this.uri = Config.get("MONGODB_URI");
        this.dbName = Config.get("MONGODB_DB_NAME");
        try {
            await this.connectedOrTimeout();
            logger.info("Connected to MongoDB database:", this.dbName);
        } catch (error) {
            logger.error("Failed to connect to MongoDB:", error);
            logger.error("Exiting application.");
            exit(1);
        }
    }

    private async connectedOrTimeout(timeoutMs = 10000): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error("Database connection timed out."));
            }, timeoutMs);

            mongoose
                .connect(this.uri, {
                    dbName: this.dbName,
                })
                .then(() => {
                    clearTimeout(timer);
                    resolve();
                })
                .catch((error) => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    public async close(): Promise<void> {
        await mongoose.disconnect();
    }
}
