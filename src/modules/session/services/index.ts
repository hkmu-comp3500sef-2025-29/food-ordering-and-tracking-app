import { ObjectId } from "mongodb";

import { findSessionById } from "#/modules/session/sql";

const serviceFindSession = async (id: string) => {
    return findSessionById(new ObjectId(id));
};

export { serviceFindSession };
