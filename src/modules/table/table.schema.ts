import mongoose, { model, Schema } from "mongoose";

const TABLE_COLLECTION_NAME = "tables";

const counterSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    seq: {
        type: Number,
        default: 0,
    },
});
const CounterModel = model("counters", counterSchema);

const tableSchema = new Schema({
    tableId: {
        type: Number,
        required: true,
        unique: true,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

// pre-save hook to assign an auto-incrementing tableId when not provided
tableSchema.pre("save", async function (this: mongoose.Document & { tableId?: number; isNew?: boolean }, next) {
    const doc = this;
    try {
        if (doc.isNew && (doc.tableId === undefined || doc.tableId === null)) {
            const agg = await mongoose.connection
                .collection(TABLE_COLLECTION_NAME)
                .aggregate([
                    {
                        $group: {
                            _id: null,
                            max: {
                                $max: "$tableId",
                            },
                        },
                    },
                ])
                .toArray();
            const currentMax =
                agg?.[0] && typeof agg[0].max === "number" ? agg[0].max : 0;
            const counter = await CounterModel.findOneAndUpdate(
                {
                    _id: "tableId",
                },
                {
                    $setOnInsert: {
                        seq: currentMax,
                    },
                    $inc: {
                        seq: 1,
                    },
                },
                {
                    new: true,
                    upsert: true,
                },
            ).exec();
            doc.tableId = counter.seq;
        }
        next();
    } catch (err) {
        next(err as Error);
    }
});

const TableModel = model(TABLE_COLLECTION_NAME, tableSchema);
type TableDocument = mongoose.InferSchemaType<typeof tableSchema> &
    mongoose.Document;
export { TableModel as Table };
export type { TableDocument };
