// ==========================================
// LIBYA FLEX - ORDERS MANAGEMENT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();

    const orderForm = document.getElementById("orderForm");

    if (orderForm) {
        orderForm.addEventListener("submit", createOrder);
    }
});


// ==========================================
// LOAD ORDERS
// ==========================================

async function loadOrders() {
    const tableBody = document.getElementById("ordersTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center;">
                Loading orders...
            </td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            customer_name,
            customer_phone,
            customer_email,
            delivery_address,
            city,
            total_amount,
            status,
            notes,
            created_at
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error loading orders:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;color:red;">
                    Failed to load orders.
                </td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;">
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = "";

    data.forEach(order => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.id}</td>

            <td>
                ${escapeHTML(order.customer_name)}
            </td>

            <td>
                ${escapeHTML(order.customer_phone)}
            </td>

            <td>
                ${escapeHTML(order.city || "")}
            </td>

            <td>
                ${escapeHTML(order.delivery_address)}
            </td>

            <td>
                ${Number(order.total_amount).toFixed(2)}
            </td>

            <td>
                <span class="status ${getStatusClass(order.status)}">
                    ${escapeHTML(order.status)}
                </span>
            </td>

            <td>
                <button
                    onclick="viewOrder(${order.id})"
                    class="order-btn">
                    View
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}


// ==========================================
// CREATE ORDER
// ==========================================

async function createOrder(event) {
    event.preventDefault();

    const form = event.target;

    const customerName =
        form.querySelector('[name="customer_name"]')?.value.trim();

    const customerPhone =
        form.querySelector('[name="customer_phone"]')?.value.trim();

    const customerEmail =
        form.querySelector('[name="customer_email"]')?.value.trim();

    const deliveryAddress =
        form.querySelector('[name="delivery_address"]')?.value.trim();

    const city =
        form.querySelector('[name="city"]')?.value.trim();

    const totalAmount =
        form.querySelector('[name="total_amount"]')?.value;

    const notes =
        form.querySelector('[name="notes"]')?.value.trim();


    if (!customerName || !customerPhone || !deliveryAddress || !totalAmount) {
        alert("Please fill in all required fields.");
        return;
    }


    const { data, error } = await supabase
        .from("orders")
        .insert([
            {
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail || null,
                delivery_address: deliveryAddress,
                city: city || null,
                total_amount: Number(totalAmount),
                status: "pending",
                notes: notes || null
            }
        ])
        .select()
        .single();


    if (error) {
        console.error("Error creating order:", error);

        alert("Failed to create order.");

        return;
    }


    // Add first delivery history record

    const { error: historyError } = await supabase
        .from("delivery_history")
        .insert([
            {
                order_id: data.id,
                status: "pending",
                notes: "Order received"
            }
        ]);


    if (historyError) {
        console.error(
            "Order created, but history failed:",
            historyError
        );
    }


    alert("Order created successfully!");

    form.reset();

    loadOrders();
}


// ==========================================
// VIEW ORDER
// ==========================================

async function viewOrder(orderId) {

    const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();


    if (error) {
        console.error(error);
        alert("Unable to load order.");
        return;
    }


    const { data: history, error: historyError } =
        await supabase
            .from("delivery_history")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });


    if (historyError) {
        console.error(historyError);
    }


    let historyHTML = "";


    if (history && history.length > 0) {

        history.forEach(item => {

            historyHTML += `
                <div class="history-item">

                    <strong>
                        ${escapeHTML(item.status)}
                    </strong>

                    <p>
                        ${escapeHTML(item.notes || "")}
                    </p>

                    <small>
                        ${formatDate(item.created_at)}
                    </small>

                </div>
            `;

        });

    } else {

        historyHTML = `
            <p>No delivery history yet.</p>
        `;

    }


    const message = `
ORDER #${order.id}

Customer:
${order.customer_name}

Phone:
${order.customer_phone}

Email:
${order.customer_email || "N/A"}

Address:
${order.delivery_address}

City:
${order.city || "N/A"}

Total:
${Number(order.total_amount).toFixed(2)}

Status:
${order.status}

Notes:
${order.notes || "N/A"}


DELIVERY HISTORY

${history
    ? history.map(item =>
        `${item.status} - ${item.notes || ""}`
      ).join("\n")
    : "No history"}
    `;


    alert(message);
}


// ==========================================
// UPDATE ORDER STATUS
// ==========================================

async function updateOrderStatus(orderId, newStatus, notes = "") {

    const { error } = await supabase
        .from("orders")
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq("id", orderId);


    if (error) {
        console.error(error);

        alert("Failed to update order.");

        return false;
    }


    const { error: historyError } =
        await supabase
            .from("delivery_history")
            .insert([
                {
                    order_id: orderId,
                    status: newStatus,
                    notes: notes || `Order status changed to ${newStatus}`
                }
            ]);


    if (historyError) {
        console.error(historyError);

        alert("Order updated, but history could not be saved.");

        return false;
    }


    alert("Order status updated successfully.");

    loadOrders();

    return true;
}


// ==========================================
// STATUS CSS CLASS
// ==========================================

function getStatusClass(status) {

    switch (status) {

        case "pending":
            return "status-pending";

        case "confirmed":
            return "status-confirmed";

        case "processing":
            return "status-processing";

        case "shipped":
            return "status-shipped";

        case "delivered":
            return "status-delivered";

        case "cancelled":
            return "status-cancelled";

        default:
            return "status-default";
    }
}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleString();
}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// MAKE FUNCTIONS AVAILABLE
// ==========================================

window.loadOrders = loadOrders;
window.createOrder = createOrder;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
