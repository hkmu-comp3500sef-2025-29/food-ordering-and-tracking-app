import type { SessionDocument } from "#/modules/session/session.schema.js";

type SessionResponse = {
    success: boolean;
    data: SessionDocument;
}

document.addEventListener("DOMContentLoaded", (): void => {
    const btn: HTMLButtonElement | null = document.getElementById(
        "menu-btn",
    ) as HTMLButtonElement | null;

    if (!btn) {
        window.alert("Failed to initialize menu button");
        return void 0;
    };

    btn.addEventListener("click", async (): Promise<void> => {
        // create session
        const response: Response = await fetch("/api/v1/sessions", {
            method: "POST",
        });

        const data: SessionResponse = await response.json();

        if (!response.ok || !data.success) {
            window.alert("Service unavailable");
            return void 0;
        }

        // store session

        // redirect
        window.location.href = "/menu";
    });
});
