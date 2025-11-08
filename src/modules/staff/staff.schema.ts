import type mongoose from "mongoose";

import { model, Schema } from "mongoose";

const STAFF_COLLECTION_NAME = "staffs";

const staffSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: [
            "chef",
            "waiter",
            "admin",
        ],
        required: true,
    },
    apiKey: [
        {
            type: String,
            ref: "apikeys",
        },
    ],
});

staffSchema.virtual("apikeys", {
    ref: "apikeys", // model to use
    localField: "apiKey", // field on Staff
    foreignField: "apiKey", // field on Apikey
    justOne: false,
});

// Ensure virtuals are included when converting to JSON / Objects
staffSchema.set("toObject", {
    virtuals: true,
});
staffSchema.set("toJSON", {
    virtuals: true,
});

staffSchema.index({
    name: 1,
});

const StaffModel = model(STAFF_COLLECTION_NAME, staffSchema);

type StaffDocument = mongoose.InferSchemaType<typeof staffSchema> &
    mongoose.Document;

export { StaffModel as Staff };
export type { StaffDocument };
