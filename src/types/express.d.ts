import type { SessionDocument } from "#/modules/session/session.schema";
import type { TableDocument } from "#/modules/table/table.schema";

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            requestStartTime?: bigint;
            // apiKey?: string;
            // staff?: StaffDocument | null;
            role?: string;
            sessionContext?: {
                session: SessionDocument;
                table?: TableDocument | null;
            } | null;
        }
    }
}
