// ============================================
// LIBYA FLEX — SUPABASE CONFIG
// ============================================

const SUPABASE_URL = "ضع_رابط_مشروعك_هنا";
const SUPABASE_ANON_KEY = "ضع_Anon_Key_هنا";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// --------------------------------------------
// ORDERS
// --------------------------------------------

async function getOrders() {
    const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("getOrders:", error);
        throw error;
    }

    return data || [];
}

// --------------------------------------------
// DELIVERY HISTORY
// --------------------------------------------

async function getDeliveryHistory(orderId) {
    const { data, error } = await supabaseClient
        .from("delivery_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("getDeliveryHistory:", error);
        throw error;
    }

    return data || [];
}

// --------------------------------------------
// آخر حالة للطلب
// --------------------------------------------

async function getLatestDeliveryStatus(orderId) {
    const { data, error } = await supabaseClient
        .from("delivery_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("getLatestDeliveryStatus:", error);
        throw error;
    }

    return data;
}

// --------------------------------------------
// إضافة حالة جديدة
// --------------------------------------------

async function addDeliveryHistory(orderId, status, notes = "") {

    const { data, error } = await supabaseClient
        .from("delivery_history")
        .insert({
            order_id: orderId,
            status: status,
            notes: notes || null
        })
        .select()
        .single();

    if (error) {
        console.error("addDeliveryHistory:", error);
        throw error;
    }

    return data;
}

// --------------------------------------------
// تحديث حالة الطلب + إضافة History
// --------------------------------------------

async function updateOrderStatus(orderId, status, notes = "") {

    const { data, error } = await supabaseClient
        .from("orders")
        .update({
            status: status
        })
        .eq("id", orderId)
        .select()
        .single();

    if (error) {
        console.error("updateOrderStatus:", error);
        throw error;
    }

    await addDeliveryHistory(orderId, status, notes);

    return data;
}

// --------------------------------------------
// إحصائيات العميل
// --------------------------------------------

async function getCustomerDeliveryStats(phone) {

    if (!phone) {
        return {
            delivered: 0,
            failed: 0,
            total: 0
        };
    }

    const { data: orders, error } = await supabaseClient
        .from("orders")
        .select("id")
        .eq("customer_phone", phone);

    if (error) {
        console.error(error);
        throw error;
    }

    if (!orders || orders.length === 0) {
        return {
            delivered: 0,
            failed: 0,
            total: 0
        };
    }

    const ids = orders.map(order => order.id);

    const { data: history, error: historyError } =
        await supabaseClient
            .from("delivery_history")
            .select("order_id,status")
            .in("order_id", ids);

    if (historyError) {
        console.error(historyError);
        throw historyError;
    }

    let delivered = 0;
    let failed = 0;

    (history || []).forEach(item => {

        const status = String(item.status || "").toLowerCase();

        if (
            status === "delivered" ||
            status === "تم الاستلام" ||
            status === "received"
        ) {
            delivered++;
        }

        if (
            status === "failed" ||
            status === "لم يستلم" ||
            status === "not_received"
        ) {
            failed++;
        }

    });

    return {
        delivered,
        failed,
        total: orders.length
    };
}
