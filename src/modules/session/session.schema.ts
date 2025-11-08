import type mongoose from "mongoose";

import { model, Schema } from "mongoose";

const SESSION_COLLECTION_NAME = "sessions";

const sessionSchema = new Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: [
            "active",
            "cancelled",
            "closed",
        ],
        required: true,
    },
    table: {
        type: Schema.Types.ObjectId,
        ref: "Table",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    closedAt: {
        type: Date,
    },
});

sessionSchema.index({
    uuid: 1,
});
sessionSchema.index({
    table: 1,
    status: 1,
});

const SessionModel = model(SESSION_COLLECTION_NAME, sessionSchema);

type SessionDocument = mongoose.InferSchemaType<typeof sessionSchema> &
    mongoose.Document;

export { SessionModel };
export type { SessionDocument };
