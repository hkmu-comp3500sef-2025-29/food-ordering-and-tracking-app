import type mongoose from "mongoose";

import { model, Schema } from "mongoose";

const ORDER_COLLECTION_NAME = "orders";

const orderSchema = new Schema({
    dish: [
        {
            dish_id: {
                type: Schema.Types.ObjectId,
                ref: "Dish",
            },
            customer_notes: {
                type: String,
                default: "",
            },
            quantity: {
                type: Number,
                default: 1,
            },
            status: {
                type: String,
                enum: [
                    "placed",
                    "confirmed",
                    "preparing",
                    "refund",
                    "ready",
                    "delivered",
                ],
                default: "placed",
            },
        },
    ],
    session: {
        type: Schema.Types.ObjectId,
        ref: "Session",
    },
});

const OrderModel = model(ORDER_COLLECTION_NAME, orderSchema);
type OrderDocument = mongoose.InferSchemaType<typeof orderSchema> &
    mongoose.Document;

export { OrderModel as Order };
export type { OrderDocument };
