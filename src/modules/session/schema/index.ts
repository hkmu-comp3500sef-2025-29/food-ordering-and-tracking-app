import type { Collection } from "mongodb";

import { getDatabase } from "#/configs/database";

const COLLECTION_NAME: string = "sessions" as const;

type Session = {
    tableNo: string;
    createdAt: Date;
    updatedAt: Date;
};

const session: Collection<Session> =
    getDatabase().collection<Session>(COLLECTION_NAME);

export type { Session };
export { session };
