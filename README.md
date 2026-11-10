# LIBYA FLEX — Pro Storefront + Control Room

An Arabic RTL football-shirt store with a custom black/champagne identity, a matching warm-white theme, and a protected administration area.

## What is included

### Storefront (`index.html`)
- Responsive Arabic RTL storefront designed for mobile first.
- Black / champagne theme and warm-white / champagne theme; preference is saved in the browser.
- Product search, category browsing, sorting, featured products, favorites, product details, size/variant selection, cart, and guest checkout.
- Checkout sends product IDs, variant IDs, and quantities to a database function. The database recalculates prices, validates stock, applies coupon rules, creates the order and line items atomically, and writes delivery history.
- Store settings and active campaign banner content are loaded from Supabase.
- Cash on delivery only. No online payment provider is configured.

### Admin (`admin.html`, `login.html`)
- No admin link is shown in the customer storefront.
- Direct access to `admin.html` requires a valid Supabase session and a positive `public.is_admin()` check. Login performs the same authorization check.
- Dashboard metrics and recent orders.
- Product create/edit, publish/unpublish, category assignment, featured status, image URL, description and pricing.
- Category create/edit and show/hide.
- Variant and inventory management by product, size, color, SKU and stock quantity.
- Order search, order detail, status changes, delivery-history notes, and CSV export.
- Campaign/banner create/edit/delete.
- Coupon create/edit/delete for fixed or percentage discounts, minimum order, and usage limits.
- Store name, description, currency, delivery fee and open/closed switch.
- The same saved theme choice is available in the admin and login pages.

## Existing database compatibility

The supplied database backup contains these public tables: `admins`, `categories`, `delivery_history`, `order_items`, `orders`, `product_images`, `product_variants`, `products`, and `store_settings`. Its captured data included 8 products, 4 categories and 2 orders. The `admins`, `order_items`, `product_images`, and `product_variants` tables were empty in that backup. The old orders therefore do not have saved line-item details in that backup. New stock starts at zero for products without size variants; enter actual stock quantities or add size/colour variants in the admin before accepting sales.

`schema-upgrade.sql` is an additive, idempotent migration. It does not drop existing tables, products, or orders. It:
- adds base stock tracking to products plus campaign and coupon tables;
- locks down public direct writes to orders and order items;
- removes public read/write access to delivery history;
- adds an atomic, database-validated checkout RPC;
- grants admin operations through the existing `public.is_admin()` check.

**Run `schema-upgrade.sql` in Supabase SQL Editor before deploying the new site.** Review the SQL and take a fresh backup first. The public checkout RPC is intentionally callable by visitors; it validates input and only creates orders. It does not return protected admin data. Consider adding edge/API rate limiting before a high-traffic public launch.

## Supabase setup

1. In Supabase, open **SQL Editor** and run `schema-upgrade.sql`.
2. In **Authentication → Users**, create the owner's email/password account. Use a strong, unique password.
3. Copy that user's UUID, or run the SQL below after replacing the email with the exact admin email:

   ```sql
   insert into public.admins(user_id)
   select id from auth.users
   where lower(email) = lower('YOUR-ADMIN-EMAIL')
   on conflict (user_id) do nothing;
   ```

4. In **Project Settings → API**, copy the Project URL and the publishable/anon client key. Put them in `config.js`:

   ```js
   window.LF_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseAnonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
   };
   ```

5. Never put a `service_role` or secret key in browser code or GitHub.
6. Deploy the five files in the repository root. Keep the SQL backup out of the public repository.
7. Open the storefront, verify products, test a draft order, then log in through `login.html` and confirm all admin sections work.

## Pages / files

- `index.html` — customer storefront
- `login.html` — admin sign-in
- `admin.html` — protected control room
- `config.js` — public Supabase URL and public client key (blank until configured)
- `schema-upgrade.sql` — database migration and checkout RPC

## Important launch checks / limitations

- This package has been syntax-checked, but it has **not** been connected to the live Supabase project or end-to-end tested against live credentials. Do not call it production-ready until the SQL migration, admin bootstrap, config, RLS checks, and real test orders succeed.
- Product images are managed by URL in this version. The existing `product_images` table is retained; a multi-image uploader / Supabase Storage workflow is a next enhancement.
- Delivery fee is currently a single store-wide default. City-specific delivery zones/rates need a delivery-rates table and UI before they can be managed separately.
- Online card payments, WhatsApp order notifications, shipping-provider integrations, customer accounts, and loyalty points are not connected.
- The storefront intentionally has no visible admin link. Hiding a URL is not security by itself; the server-side admin-role check and RLS policies are the security boundary.
- The store does not claim that products are authentic or officially licensed unless the owner independently verifies that claim.


## V3: إدارة الأقسام ورفع الصور
- اختيار الصور مباشرة من ألبوم الآيفون للمنتجات والأقسام والبانرات.
- الصور ترفع إلى Supabase Storage في bucket باسم `libya-flex-media`.
- مربعات الأقسام تُنشأ ديناميكياً من جدول `categories`، ويمكن إضافة/تعديل/ترتيب/إخفاء الأقسام من لوحة الأدمن.
- إعدادات إضافية للتحكم في شريط الإعلان والواجهة وزرها ورقم واتساب ونبذة التذييل.
- شغّل كامل ملف `schema-upgrade.sql` في Supabase SQL Editor قبل رفع ملفات الموقع.
- لا تضع Secret/service_role key في ملفات الموقع.

## V4 Phase 2
See `README-AR.md` for the expanded Arabic admin pages and deployment sequence. Run `phase2-admin-policies.sql` after the V4 foundation migration to enable admin management of customer profiles.
