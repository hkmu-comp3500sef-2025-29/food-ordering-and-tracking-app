import type { CartItem } from "#/types/cart.js";

document.addEventListener("DOMContentLoaded", (): void => {
    const btn: HTMLButtonElement | null = document.getElementById(
        "customize-item-button-a2c",
    ) as HTMLButtonElement | null;

    if (!btn) return void 0;

    btn.addEventListener("click", (): void => {
        const cart: CartItem[] = JSON.parse(
            window.localStorage.getItem("cart") ?? "[]",
        ) as CartItem[];

        const dishId: string | undefined = btn.value;

        if (!dishId) return void 0;

        window.localStorage.setItem(
            "cart",
            JSON.stringify([
                ...cart,
                {
                    dishId,
                },
            ] satisfies CartItem[]),
        );

        window.location.href = "/menu";
    });
});
