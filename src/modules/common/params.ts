import type { Param } from "./repo";

import { ObjectId } from "mongodb";

/**
 * Generic Param factory that sets the MongoDB _id on a Partial<T>.
 * Useful across modules that use ObjectId primary keys.
 */
export function WithMongoId<
    T extends {
        _id?: any;
    },
>(id: string | ObjectId): Param<T> {
    return async (config: Partial<T>): Promise<void> => {
        let objectId: ObjectId;
        if (id instanceof ObjectId) {
            objectId = id;
        } else {
            if (!ObjectId.isValid(id)) {
                throw new Error("Invalid MongoDB ObjectId");
            }
            objectId = new ObjectId(id);
        }
        (
            config as Partial<
                T & {
                    _id?: ObjectId;
                }
            >
        )._id = objectId;
    };
}

/**
 * Generic Param factory to set a field on the Partial<T>.
 * Use this where you previously had small setters like WithApiKey.
 */
export function WithField<T, K extends keyof T>(key: K, value: T[K]): Param<T> {
    return async (config: Partial<T>): Promise<void> => {
        (config as Partial<T>)[key] = value;
    };
}
