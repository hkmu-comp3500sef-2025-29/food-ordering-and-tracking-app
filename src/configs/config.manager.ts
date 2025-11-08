import fs from "node:fs";
import path from "node:path";
import { exit } from "node:process";

import dotenv, { type DotenvParseOutput } from "dotenv";
import { ZodError } from "zod";

import {
    type Config,
    type ConfigKey,
    configSchema,
} from "./schema/config.schema";

interface IConfigManager {
    get<T extends ConfigKey>(key: T): Config[T];
    has(key: ConfigKey): boolean;
}

type LoadConfigParam = () => Promise<DotenvParseOutput | undefined>;

const PATH_ROOT = process.cwd();

export class ConfigManager implements IConfigManager {
    private static instance: ConfigManager;
    // The config will always be initialized
    private config: Config = {} as Config;

    private constructor() {
        const functions: LoadConfigParam[] = [];
        const NODE_ENV = process.env.NODE_ENV || "development";
        let envpath = fs.existsSync(path.resolve(PATH_ROOT, ".env"))
            ? path.resolve(PATH_ROOT, ".env")
            : undefined;
        if (envpath) {
            functions.push(WithFile(envpath));
        }
        if (NODE_ENV === "production") {
            envpath = path.resolve(PATH_ROOT, ".env.production");
            functions.push(WithFile(envpath));
        } else if (NODE_ENV === "development") {
            envpath = path.resolve(PATH_ROOT, ".env.development");
            functions.push(WithFile(envpath));
        }
        envpath = fs.existsSync(
            path.resolve(PATH_ROOT, `.env.${NODE_ENV}.local`),
        )
            ? path.resolve(PATH_ROOT, `.env.${NODE_ENV}.local`)
            : undefined;
        if (envpath) {
            functions.push(WithFile(envpath));
        }
        if (fs.existsSync(path.resolve(PATH_ROOT, ".env.local"))) {
            functions.push(WithFile(path.resolve(PATH_ROOT, ".env.local")));
        }
        this.loadConfig(functions);
    }

    private async loadConfig(params: LoadConfigParam[]): Promise<void> {
        var envContent: DotenvParseOutput = {};
        for (const param of params) {
            try {
                const result = await param();
                if (result) {
                    envContent = {
                        ...envContent,
                        ...result,
                    };
                }
            } catch (error) {
                console.error("Error loading config:", error);
                console.warn("Skipping invalid config file.");
            }
        }
        const rawConfig = {
            ...envContent,
            ...process.env,
        };
        try {
            this.config = configSchema.parse(rawConfig);
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.issues
                    .map(
                        (issue) =>
                            `- ${issue.path.join(".")}: ${issue.message}`,
                    )
                    .join("\n");
                console.error("The configuration is invalid:", errorMessages);
                exit(1);
            }
            throw error;
        }
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public get<T extends ConfigKey>(key: T): Config[T] {
        return this.config[key];
    }

    public has(key: ConfigKey): boolean {
        return key in this.config;
    }
}

function WithFile(path: string): LoadConfigParam {
    return async (): Promise<DotenvParseOutput | undefined> => {
        if (!fs.existsSync(path)) {
            throw new Error(
                `ConfigManager: File does not exist at path ${path}`,
            );
        }
        const fileContent: string = fs.readFileSync(path, "utf8");
        const envContent: DotenvParseOutput = dotenv.parse(fileContent);
        return envContent;
    };
}
