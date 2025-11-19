import mongoose, { Schema } from "mongoose";

import { logger } from "#/configs/logger.js";
import { Staff } from "#/modules/staff/staff.schema.js";

const APIKEY_COLLECTION_NAME = "apikeys";

const apikeySchema = new Schema({
    apiKey: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    expiredAt: {
        type: Date,
        default: null,
    },
});

apikeySchema.post(
    /findOneAndDelete|findOneAndRemove/,
    async (doc: ApiKeyDocument) => {
        if (!doc) return;
        try {
            await Staff.updateMany(
                {
                    apiKey: doc.apiKey,
                },
                {
                    $pull: {
                        apiKey: doc.apiKey,
                    },
                },
            );
        } catch (err) {
            logger.error(
                "Error cleaning up Staff apiKey refs after findOneAndDelete/Remove:",
                err,
            );
        }
    },
);

type ApiKeyDocument = mongoose.InferSchemaType<typeof apikeySchema> &
    mongoose.Document;
const ApiKeyModel = mongoose.model<ApiKeyDocument>(
    APIKEY_COLLECTION_NAME,
    apikeySchema,
);

export { ApiKeyModel as ApiKey };
export type { ApiKeyDocument };
