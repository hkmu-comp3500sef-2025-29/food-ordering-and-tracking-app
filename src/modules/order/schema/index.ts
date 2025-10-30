import type { Collection, ObjectId } from "mongodb";

import { getDatabase } from "#/configs/database";

const COLLECTION_NAME: string = "orders" as const;

type OrderStatus = "pending" | "preparing" | "done";

type Order = {
    sessionId: ObjectId;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
};

const order: Collection<Order> =
    getDatabase().collection<Order>(COLLECTION_NAME);

export type { Order, OrderStatus };
export { order };
