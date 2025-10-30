import type { Collection, ObjectId } from "mongodb";

import type { Language } from "#/locales/language";

import { getDatabase } from "#/configs/database";

const COLLECTION_NAME: string = "product_infos" as const;

type ProductInfo = {
    productId: ObjectId;
    name: string;
    description: string;
    language: Language;
    createdAt: Date;
    updatedAt: Date;
};

const productInfo: Collection<ProductInfo> =
    getDatabase().collection<ProductInfo>(COLLECTION_NAME);

export type { ProductInfo };
export { productInfo };
