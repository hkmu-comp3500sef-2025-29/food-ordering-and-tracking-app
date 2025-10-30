import type { InsertOneResult, ObjectId, UpdateResult, WithId } from "mongodb";
import type { Format, Partial } from "ts-vista";

import type { Session } from "#/modules/session/schema";

import { session } from "#/modules/session/schema";

const findSessionById = async (
    id: ObjectId,
): Promise<WithId<Session> | null> => {
    return await session.findOne({
        _id: id,
    });
};

type CreateSessionData = Format<Pick<Session, "tableNo">>;

const createSession = async (
    data: CreateSessionData,
): Promise<InsertOneResult<Session>> => {
    return await session.insertOne({
        tableNo: data.tableNo,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
};

type UpdateSessionData = Format<Partial<CreateSessionData>>;

const updateSession = async (
    id: ObjectId,
    data: UpdateSessionData,
): Promise<UpdateResult<Session>> => {
    return await session.updateOne(
        {
            _id: id,
        },
        {
            $set: {
                ...data,
                updatedAt: new Date(),
            },
        },
    );
};

export { findSessionById, createSession, updateSession };
