import type { DishDocument } from "#/modules/dish/dish.schema.js";
import type { CartItem } from "#/types/cart.js";

type OrderItemData = {
    id: string;
    quantity: number;
};

const getCart = (): CartItem[] => {
    return JSON.parse(localStorage.getItem("cart") || "[]");
};

const getDish = async (dishId: string): Promise<DishDocument | null> => {
    const response = await fetch(`/api/v1/dishes/${dishId}`);
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.success) return null;
    return result.data;
};

// load the cart
const loadCartView = async (cart: CartItem[]): Promise<void> => {
    const itemsContainer = document.getElementById(
        "cart-items-list",
    ) as HTMLElement;

    const totalPriceElement = document.getElementById(
        "total-price",
    ) as HTMLElement;

    let totalPrice = 0;

    itemsContainer.innerHTML = "";

    if (cart.length > 0) {
        for await (const item of cart) {
            const data: DishDocument | null = await getDish(item.dishId);

            if (!data) continue;

            const itemContainer = document.createElement("div");
            itemContainer.classList.add("item-container");
            itemContainer.dataset.id = data.id;

            itemContainer.innerHTML = `
              <div class="column-1">
                  <img class="item-icon" src="${data.image}" alt="Item Image">
              </div>
              <div class="column-2">
                  <h2 class="item-name">${data.name}</h2>
              </div>
              <div class="column-3">
                  <span class="item-price">$${data.price}</span>
              </div>
            `;

            const dottedBox = document.createElement("div");
            dottedBox.classList.add("dotted-box");

            itemsContainer.appendChild(itemContainer);
            itemsContainer.appendChild(dottedBox);

            totalPrice += data.price;
        }
    } else {
        itemsContainer.innerHTML = `
            <div id="no-item-container">
                <img src="/static/styles/images/cart_empty_icon.png">
                <h3>There is no item here</h3>
                <div class="dotted-box"></div>
            </div>
        `;
    }

    totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
};

window.onload = async (): Promise<void> => {
    const cart: CartItem[] = getCart();

    if (cart.length === 0) return void 0;

    await loadCartView(cart);

    const placeOrderBtn = document.getElementById(
        "place-order",
    ) as HTMLButtonElement;

    placeOrderBtn.addEventListener("click", async () => {
        const currentCart: CartItem[] = getCart();

        if (currentCart.length === 0) {
            alert("Your cart is empty!");
            return void 0;
        }

        const items: OrderItemData[] = [];

        for (const item of currentCart) {
            const dish = await getDish(item.dishId);

            if (!dish) continue;

            items.push({
                id: item.dishId,
                quantity: 1,
            });
        }

        // Hardcoded tableId for now, will be replaced with actual data
        const tableId = "T1";

        const orderData = {
            tableId: tableId,
            items,
        };

        const apiKey = localStorage.getItem("api_key");

        if (!apiKey) {
            alert("API key is missing.");
            return void 0;
        }

        try {
            const response = await fetch("/api/v1/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                },
                body: JSON.stringify(orderData),
            });

            if (response.ok) {
                alert("Order placed successfully!");
                localStorage.removeItem("cart");
                window.location.href = "/record";
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Error placing order:", error);
            alert(
                "An error occurred while placing your order. Please try again later.",
            );
        }
    });
};
