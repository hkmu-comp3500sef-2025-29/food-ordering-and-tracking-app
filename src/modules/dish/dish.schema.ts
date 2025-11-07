import mongoose, { Schema, model } from 'mongoose';

const DISH_COLLECTION_NAME = 'dishes';

const dishSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['appetizer', 'main course', 'dessert', 'beverage', 'undefined'],
    default: 'undefined',
  },
  image: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: 0.0,
  },
});

dishSchema.index(
  { name: 1 }
);

const DishModel = model(DISH_COLLECTION_NAME, dishSchema);
type DishDocument = mongoose.InferSchemaType<typeof dishSchema> & mongoose.Document;
export { DishModel as Dish };
export type { DishDocument };
