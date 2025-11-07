import { Schema } from 'mongoose';
import mongoose from 'mongoose';
import { Staff } from '#/modules/staff/staff.schema';

const APIKEY_COLLECTION_NAME = 'apikeys';

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

apikeySchema.index(
  { apiKey: 1 }
);

type ApiKeyDocument = mongoose.InferSchemaType<typeof apikeySchema> & mongoose.Document;
const ApiKeyModel = mongoose.model<ApiKeyDocument>(APIKEY_COLLECTION_NAME, apikeySchema);


apikeySchema.post(/findOneAndDelete|findOneAndRemove/, async function (doc: ApiKeyDocument) {
  if (!doc) return;
  try {
    await Staff.updateMany({ apiKey: doc.apiKey }, { $pull: { apiKey: doc.apiKey } });
  } catch (err) {
    console.error('Error cleaning up Staff apiKey refs after findOneAndDelete/Remove:', err);
  }
});

export { ApiKeyModel as ApiKey };
export type { ApiKeyDocument };
