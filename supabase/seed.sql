-- =============================================================================
-- Development seed data: catalog + content only (no auth users — the admin
-- account is bootstrapped separately by `npm run seed`, which needs the
-- Supabase Auth Admin API, not plain SQL). Run automatically by
-- `supabase db reset`, or manually with:
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Explicit small-integer IDs (via OVERRIDING SYSTEM VALUE, since these
-- columns are `generated always as identity`) are used purely so this file
-- stays deterministic and readable — re-running it against a fresh reset is
-- expected; it is NOT written to be safely re-run against a database that
-- already has this seed applied (it will hit unique-constraint conflicts).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, display_order, is_active) overriding system value values
  (1, 'Rings', 'rings', 1, true),
  (2, 'Necklaces', 'necklaces', 2, true),
  (3, 'Earrings', 'earrings', 3, true),
  (4, 'Bracelets', 'bracelets', 4, true);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
insert into public.tags (id, name, slug) overriding system value values
  (1, 'New', 'new'),
  (2, 'Sale', 'sale'),
  (3, 'Popular', 'popular'),
  (4, 'Featured', 'featured'),
  (5, 'Summer', 'summer'),
  (6, 'Winter', 'winter'),
  (7, 'Premium', 'premium'),
  (8, 'Limited', 'limited');

-- ---------------------------------------------------------------------------
-- Products (prices in PKR)
-- ---------------------------------------------------------------------------
insert into public.products
  (id, category_id, name, slug, description, price_before_discount, price_after_discount, quantity_in_stock, is_active)
overriding system value
values
  (1, 1, 'Aurora Solitaire Ring', 'aurora-solitaire-ring',
    'A timeless solitaire ring in 18k gold vermeil, set with a brilliant-cut cubic zirconia centerpiece. Hand-finished for a soft, warm shine.',
    24900, 19900, 14, true),
  (2, 1, 'Eterna Pavé Band', 'eterna-pave-band',
    'A delicate pavé band that catches the light from every angle. Comfortable enough for everyday wear.',
    15900, 15900, 3, true),
  (3, 2, 'Lumière Pendant Necklace', 'lumiere-pendant-necklace',
    'A single teardrop pendant on a fine 18-inch chain — quietly luxurious, easy to layer.',
    18500, 14900, 22, true),
  (4, 2, 'Cascade Layered Necklace', 'cascade-layered-necklace',
    'Three fine chains of graduating length, pre-layered so you never have to untangle them.',
    21900, 21900, 0, true),
  (5, 3, 'Halo Drop Earrings', 'halo-drop-earrings',
    'Classic drop earrings with a halo of tiny stones around each centerpiece.',
    13900, 11900, 30, true),
  (6, 3, 'Petal Stud Earrings', 'petal-stud-earrings',
    'Minimal flower-petal studs in brushed gold — an everyday staple.',
    8900, 8900, 45, true),
  (7, 4, 'Reverie Chain Bracelet', 'reverie-chain-bracelet',
    'An adjustable chain bracelet with a subtle figaro link pattern.',
    11900, 9900, 4, true),
  (8, 4, 'Bloom Charm Bracelet', 'bloom-charm-bracelet',
    'A dainty bracelet with three enamel flower charms.',
    12900, 12900, 17, true),
  (9, 1, 'Vesper Twist Ring', 'vesper-twist-ring',
    'An asymmetric twist band, hand-forged for a one-of-a-kind silhouette.',
    17900, 17900, 9, true),
  (10, 2, 'Solstice Choker', 'solstice-choker',
    'A structured choker with a single bezel-set stone at the collarbone.',
    16900, 13500, 0, true),
  (11, 3, 'Wisp Threader Earrings', 'wisp-threader-earrings',
    'Ultra-fine threader earrings that drape along the earlobe.',
    9900, 9900, 25, true),
  (12, 4, 'Marlowe Cuff', 'marlowe-cuff',
    'A statement open cuff with a hammered-metal finish. Limited production run.',
    22900, 18900, 6, true);

-- Placeholder imagery (picsum.photos — stable, keyed by seed so each
-- product gets a consistent image across reloads). Swap for real product
-- photography via the admin product-image manager.
insert into public.product_images (product_id, url, storage_path, alt_text, display_order)
select id, 'https://picsum.photos/seed/' || slug || '/1200/1200', 'seed/' || slug || '.jpg', name, 0
from public.products;
insert into public.product_images (product_id, url, storage_path, alt_text, display_order)
select id, 'https://picsum.photos/seed/' || slug || '-alt/1200/1200', 'seed/' || slug || '-alt.jpg', name || ' (alternate view)', 1
from public.products;

-- Tag assignments
insert into public.product_tags (product_id, tag_id) values
  (1, 1), -- Aurora: New
  (1, 4), -- Aurora: Featured
  (1, 2), -- Aurora: Sale
  (2, 7), -- Eterna: Premium
  (3, 3), -- Lumière: Popular
  (3, 2), -- Lumière: Sale
  (4, 6), -- Cascade: Winter
  (5, 3), -- Halo: Popular
  (5, 2), -- Halo: Sale
  (6, 5), -- Petal: Summer
  (7, 1), -- Reverie: New
  (9, 4), -- Vesper: Featured
  (10, 2), -- Solstice: Sale
  (12, 8), -- Marlowe: Limited
  (12, 7); -- Marlowe: Premium

-- ---------------------------------------------------------------------------
-- Banners
-- ---------------------------------------------------------------------------
insert into public.banners (title, description, image_url, storage_path, button_text, button_url, is_active, display_order) values
  ('The Aurora Collection', 'New arrivals, hand-finished in 18k gold vermeil.', 'https://picsum.photos/seed/banner-aurora/1600/700', 'seed/banner-aurora.jpg', 'Shop New Arrivals', '/products?tag=new', true, 1),
  ('End of Season Sale', 'Up to 25% off selected pieces, while stocks last.', 'https://picsum.photos/seed/banner-sale/1600/700', 'seed/banner-sale.jpg', 'Shop Sale', '/products?tag=sale', true, 2),
  ('Gifting, Made Easy', 'Complimentary gift wrapping on every order.', 'https://picsum.photos/seed/banner-gift/1600/700', 'seed/banner-gift.jpg', 'Explore Gifts', '/products', true, 3);

-- ---------------------------------------------------------------------------
-- Payment methods (fake development values — never real account details)
-- ---------------------------------------------------------------------------
insert into public.payment_methods (id, type, name, account_holder_name, account_number, instructions, is_active, display_order) overriding system value values
  (1, 'mobile_wallet', 'JazzCash', 'Atelier Jewelry', '0300-0000000',
    'Send the exact order total to this JazzCash account, then upload your payment screenshot and the transaction reference below.', true, 1),
  (2, 'mobile_wallet', 'EasyPaisa', 'Atelier Jewelry', '0300-1111111',
    'Send the exact order total to this EasyPaisa account, then upload your payment screenshot and the transaction reference below.', true, 2);

insert into public.payment_methods (id, type, name, account_holder_name, account_number, iban, bank_name, instructions, is_active, display_order) overriding system value values
  (3, 'bank_transfer', 'Bank Transfer', 'Atelier Jewelry (Pvt) Ltd', '0123456789012345',
    'PK00DEVL0000001234567890', 'Development Bank Ltd',
    'Transfer the exact order total via online banking or a branch deposit, then upload your deposit slip / transaction screenshot below.', true, 3);

insert into public.payment_method_details (payment_method_id, swift_code, branch_code) values
  (3, 'DEVLPKKA', '0001');

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------
insert into public.faqs (question, answer, display_order) values
  ('How do I pay for my order?', 'After checkout, choose one of our configured payment methods (mobile wallet or bank transfer), send the exact total shown, then upload a screenshot of your payment along with the transaction reference. Our team verifies and confirms it, usually within a few hours.', 1),
  ('How long does delivery take?', 'Orders are typically processed within 1-2 business days of payment confirmation, with delivery across the country in 3-5 business days.', 2),
  ('Can I return an item?', 'Yes — eligible delivered orders can be returned; open your order from your account and request a return, or contact us directly.', 3),
  ('Is my payment screenshot secure?', 'Yes. Payment screenshots are stored in a private, access-controlled location and are only ever viewed by our verification team.', 4),
  ('Do you offer gift wrapping?', 'Yes, every order includes complimentary gift wrapping at no extra cost.', 5),
  ('How do I track my order status?', 'Sign in and visit "My Orders" to see the live status and full history of any order.', 6);

-- Keep each identity sequence ahead of the explicit values inserted above,
-- so the next admin-created row doesn't collide with a seeded id.
select setval(pg_get_serial_sequence('public.categories', 'id'), (select max(id) from public.categories));
select setval(pg_get_serial_sequence('public.tags', 'id'), (select max(id) from public.tags));
select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));
select setval(pg_get_serial_sequence('public.payment_methods', 'id'), (select max(id) from public.payment_methods));
