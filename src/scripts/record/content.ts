import type { DishDocument } from "#/modules/dish/dish.schema.js";
import type { OrderDocument } from "#/modules/order/order.schema.js";
import type { ClientSession } from "#/types/session.js";

type GetOrdersResponse = {
    success: boolean;
    data: OrderDocument[];
};

type GetDishResponse = {
    success: boolean;
    data: DishDocument;
};

const getSession = (): ClientSession | null => {
    const session: string | null = localStorage.getItem("session");
    if (!session) return null;
    const json = JSON.parse(session) as ClientSession;
    if (!json.id) return null;
    return json;
};

const getOrders = async (): Promise<OrderDocument[] | null> => {
    const session: ClientSession | null = getSession();

    if (!session) return null;

    const response: Response = await fetch("/api/v1/orders?sort=desc", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-session-id": session.id,
        },
    });

    if (!response.ok) return null;

    const result: GetOrdersResponse = await response.json();

    if (!result.success) return null;

    if (result.data.length === 0) return null;

    return result.data;
};

const getDish = async (dishId: string): Promise<DishDocument | null> => {
    const response: Response = await fetch(`/api/v1/dishes/${dishId}`);

    if (!response.ok) return null;

    const result: GetDishResponse = await response.json();

    if (!result.success) return null;

    return result.data;
};

const load = async (): Promise<void> => {
    const el: HTMLElement | null = document.getElementById("record-content");

    if (!el) return void 0;

    const session: ClientSession | null = getSession();

    if (!session) return void 0;

    const orders: OrderDocument[] | null = await getOrders();

    if (!orders) return void 0;

    let content: string = "";

    for (const order of orders) {
        let total: number = 0;

        content += `
            <div class="order">
                <div class="order-title">Order Info</div>

                <table>

                <tr>
                    <th class="order-table-row-header order-table-row-header-item">Item</th>
                    <th class="order-table-row-header">Status</th>
                    <th class="order-table-row-header">Price</th>
                </tr>
        `;

        for (const dish of order.dish) {
            const data: DishDocument | null = await getDish(
                dish.dish_id?.toString() ?? "",
            );

            if (!data) continue;

            total += data.price;

            content += `
                <tr>
                    <td class="order-table-row-data order-item-name">${data.name}</td>
                    <td class="order-table-row-data order-item-status">${dish.status}</td>
                    <td class="order-table-row-data order-item-price">$${data.price}</td>
                </tr>
            `;
        }

        content += `
                    <tr>
                        <td class="order-table-row-data order-item-name">Total Amount:</td>
                        <td class="order-table-row-data"></td>
                        <td class="order-table-row-data order-item-price">$${total}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    el.innerHTML = content;
};

document.addEventListener("DOMContentLoaded", load);
