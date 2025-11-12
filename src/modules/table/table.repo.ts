import type { ObjectId } from "mongodb";

import type { Param } from "#/modules/common/repo.js";

import { DatabaseManager } from "#/configs/database.js";
import { logger } from "#/configs/logger.js";
import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params.js";
import { Table, type TableDocument } from "#/modules/table/table.schema.js";

type TableParam = Param<TableDocument>;

export async function createTable(
    params: TableParam[],
): Promise<TableDocument> {
    await DatabaseManager.getInstance();
    const config: Partial<TableDocument> = {};
    for (const param of params) {
        try {
            await param(config);
        } catch (err) {
            logger.warn("Error applying table param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    const created = new Table(config);
    try {
        await created.save();
    } catch (err: any) {
        const isDup =
            err &&
            (err.code === 11000 ||
                err.code === 11001 ||
                err.name === "MongoServerError");
        if (isDup) {
            throw new Error("tableId already exists");
        }
        throw err;
    }
    return created as TableDocument;
}

export async function findTable(
    params: TableParam[],
): Promise<TableDocument | null> {
    const query: Partial<TableDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying table param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return Table.findOne(query as any).exec();
}

export async function updateTable(
    params: TableParam[],
    updates: Partial<TableDocument>,
): Promise<TableDocument | null> {
    const query: Partial<TableDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying table param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    const doc = await Table.findOne(query as any).exec();
    if (!doc) return null;

    // Filter out undefined values
    const plain = (updates as Record<string, any>) || {};
    const toSet: Record<string, any> = {};
    for (const [k, v] of Object.entries(plain)) {
        if (v !== undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length === 0) {
        // nothing to update
        return doc;
    }
    doc.set(toSet);
    await doc.save();
    return doc as TableDocument;
}

export async function updateTableStatus(
    params: TableParam[],
    available: boolean,
): Promise<TableDocument | null> {
    return updateTable(params, {
        available,
    });
}

export async function deleteTable(params: TableParam[]): Promise<{
    deletedCount?: number;
}> {
    const query: Partial<TableDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying table param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return Table.deleteOne(query as any).exec();
}

export const WithMongoId = (id: string | ObjectId): TableParam =>
    WithMongoIdGeneric<TableDocument>(id);

export const WithTableId = (tableId: number): TableParam => {
    return WithField<TableDocument, "tableId">("tableId", tableId as any);
};

export const WithAvailable = (available: boolean): TableParam => {
    return WithField<TableDocument, "available">("available", available as any);
};
