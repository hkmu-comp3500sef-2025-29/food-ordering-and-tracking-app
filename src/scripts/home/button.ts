import type { SessionDocument } from "#/modules/session/session.schema.js";
import type { ClientSession } from "#/types/session.js";

/**
 * No bundler solution.
 *
 * Therefore, this is copied from `./src/constants/index.ts`.
 */
const HARDCODED_API_KEY =
    "279fca02ea24283477a4e3723e490b69f2c9d99a714f26859038cd290fc7a875" as const;

type SessionResponse = {
    success: boolean;
    data: SessionDocument;
};

document.addEventListener("DOMContentLoaded", (): void => {
    const btn: HTMLButtonElement | null = document.getElementById(
        "menu-btn",
    ) as HTMLButtonElement | null;

    if (!btn) {
        window.alert("Failed to initialize menu button");
        return void 0;
    }

    btn.addEventListener("click", async (): Promise<void> => {
        // create session
        const response: Response = await fetch("/api/v1/sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": HARDCODED_API_KEY,
            },
        });

        const data: SessionResponse = await response.json();

        if (!response.ok || !data.success) {
            window.alert("Service unavailable");
            return void 0;
        }

        // store session

        // this is the worst practice, but it works.

        window.localStorage.setItem(
            "session",
            JSON.stringify({
                id: data.data.uuid,
            } satisfies ClientSession),
        );

        // redirect
        window.location.href = "/menu";
    });
});
