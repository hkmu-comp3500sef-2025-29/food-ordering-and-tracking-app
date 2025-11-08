import type { Param } from "#/modules/common/repo";
import type { SessionDocument } from "#/modules/session/session.schema";

import crypto from "node:crypto";

import { ObjectId } from "mongodb";
import { z } from "zod";

import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params";
import { SessionModel } from "#/modules/session/session.schema";
import { Table } from "#/modules/table/table.schema";

type SessionParam = Param<SessionDocument>;
type Status = "active" | "cancelled" | "closed";

export async function createSession(
    params: SessionParam[],
): Promise<SessionDocument> {
    // initial config
    const config: Partial<SessionDocument> = {
        uuid: crypto.randomUUID(),
        status: "active",
        createdAt: new Date(),
    };

    for (const p of params) {
        try {
            await p(config);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }

    const session = await SessionModel.db.startSession();
    try {
        session.startTransaction();

        let tableId: ObjectId | undefined;
        if (config.table) {
            if (config.table instanceof ObjectId) tableId = config.table;
            else {
                if (!ObjectId.isValid(String(config.table))) {
                    throw new Error("Invalid table id");
                }
                tableId = new ObjectId(String(config.table));
            }

            const active = await SessionModel.findOne({
                table: tableId,
                status: "active",
            })
                .session(session)
                .exec();
            if (active) {
                throw new Error(
                    "Requested table is already active in another session",
                );
            }

            const updated = await Table.findOneAndUpdate(
                {
                    _id: tableId,
                    available: true,
                },
                {
                    $set: {
                        available: false,
                    },
                },
                {
                    session,
                    new: true,
                },
            ).exec();
            if (!updated) {
                throw new Error("Requested table is not available");
            }
        } else {
            const picked = await Table.findOneAndUpdate(
                {
                    available: true,
                },
                {
                    $set: {
                        available: false,
                    },
                },
                {
                    session,
                    new: true,
                },
            ).exec();
            if (!picked) {
                throw new Error("No available tables");
            }
            tableId = picked._id as ObjectId;
            config.table = tableId as any;
        }

        const created = new SessionModel(config);
        await created.save({
            session,
        });

        await session.commitTransaction();
        session.endSession();
        return created as SessionDocument;
    } catch (err) {
        try {
            await session.abortTransaction();
        } catch (_) {
            // ignore
        }
        session.endSession();
        throw err;
    }
}

// Closes a session with exactly matching params
export async function closeSession(
    params: SessionParam[],
): Promise<SessionDocument | null> {
    const query: Partial<SessionDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }
    const updates: Partial<SessionDocument> = {
        status: "closed",
        closedAt: new Date(),
    };
    const doc = await SessionModel.findOneAndUpdate(query as any, updates, {
        new: true,
    }).exec();
    if (!doc) return null;
    return doc as SessionDocument;
}

export async function findSession(
    params: Param<SessionDocument>[],
): Promise<SessionDocument | null> {
    const query: Partial<SessionDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }

    const doc = await SessionModel.findOne(query as any).exec();
    if (!doc) return null;
    return doc as SessionDocument;
}

export async function findSessions(
    params: Param<SessionDocument>[],
): Promise<SessionDocument[]> {
    const query: Partial<SessionDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }
    const docs = await SessionModel.find(query as any).exec();
    return docs as SessionDocument[];
}

export async function updateSession(
    params: Param<SessionDocument>[],
    updates: Partial<SessionDocument>,
): Promise<SessionDocument | null> {
    const query: Partial<SessionDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }

    const doc = await SessionModel.findOneAndUpdate(query as any, updates, {
        new: true,
    }).exec();
    if (!doc) return null;
    return doc as SessionDocument;
}

export async function deleteSession(
    params: Param<SessionDocument>[],
): Promise<boolean> {
    const query: Partial<SessionDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            console.warn("Error applying session param:", err);
            console.warn("Skipping invalid param.");
        }
    }

    const result = await SessionModel.deleteOne(query as any).exec();
    return result.deletedCount === 1;
}

export const WithMongoId = (id: string | ObjectId): SessionParam =>
    WithMongoIdGeneric<SessionDocument>(id);

export const WithUuid = (uuid: string): SessionParam => {
    const result = z.string().uuid().safeParse(uuid);
    if (!result.success) {
        throw new Error("Invalid uuid");
    }
    return WithField<SessionDocument, "uuid">("uuid", uuid);
};

export const WithStatus = (status: Status): SessionParam => {
    return WithField<SessionDocument, "status">("status", status);
};

export const WithTableId = (tableId: string | ObjectId): SessionParam => {
    let objId: ObjectId;
    if (tableId instanceof ObjectId) {
        objId = tableId;
    } else {
        if (!ObjectId.isValid(tableId)) {
            throw new Error("Invalid tableId");
        }
        objId = new ObjectId(tableId);
    }
    return WithField<SessionDocument, "table">("table", objId);
};
