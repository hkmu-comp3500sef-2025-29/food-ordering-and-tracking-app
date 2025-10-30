import type { Collection } from "mongodb";

import { getDatabase } from "#/configs/database";

const COLLECTION_NAME: string = "products" as const;

type Product = {
    price: string;
    createdAt: Date;
    updatedAt: Date;
};

const product: Collection<Product> =
    getDatabase().collection<Product>(COLLECTION_NAME);

export type { Product };
export { product };
