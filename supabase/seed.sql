-- =============================================================================
-- Development seed data: catalog + content only (no auth users — the admin
-- account is bootstrapped separately by `npm run seed`, which needs the
-- Supabase Auth Admin API, not plain SQL). Run automatically by
-- `supabase db reset`, or manually with:
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Fixed UUIDs are used (instead of gen_random_uuid()) purely so this file
-- is deterministic and re-readable — re-running it against a fresh reset is
-- expected; it is NOT written to be safely re-run against a database that
-- already has this seed applied (it will hit unique-constraint conflicts).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, display_order, is_active) values
  ('a0000000-0000-0000-0000-000000000001', 'Rings', 'rings', 1, true),
  ('a0000000-0000-0000-0000-000000000002', 'Necklaces', 'necklaces', 2, true),
  ('a0000000-0000-0000-0000-000000000003', 'Earrings', 'earrings', 3, true),
  ('a0000000-0000-0000-0000-000000000004', 'Bracelets', 'bracelets', 4, true);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
insert into public.tags (id, name, slug) values
  ('b0000000-0000-0000-0000-000000000001', 'New', 'new'),
  ('b0000000-0000-0000-0000-000000000002', 'Sale', 'sale'),
  ('b0000000-0000-0000-0000-000000000003', 'Popular', 'popular'),
  ('b0000000-0000-0000-0000-000000000004', 'Featured', 'featured'),
  ('b0000000-0000-0000-0000-000000000005', 'Summer', 'summer'),
  ('b0000000-0000-0000-0000-000000000006', 'Winter', 'winter'),
  ('b0000000-0000-0000-0000-000000000007', 'Premium', 'premium'),
  ('b0000000-0000-0000-0000-000000000008', 'Limited', 'limited');

-- ---------------------------------------------------------------------------
-- Products (prices in PKR)
-- ---------------------------------------------------------------------------
insert into public.products
  (id, category_id, name, slug, description, price_before_discount, price_after_discount, quantity_in_stock, is_active)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
    'Aurora Solitaire Ring', 'aurora-solitaire-ring',
    'A timeless solitaire ring in 18k gold vermeil, set with a brilliant-cut cubic zirconia centerpiece. Hand-finished for a soft, warm shine.',
    24900, 19900, 14, true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
    'Eterna Pavé Band', 'eterna-pave-band',
    'A delicate pavé band that catches the light from every angle. Comfortable enough for everyday wear.',
    15900, 15900, 3, true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
    'Lumière Pendant Necklace', 'lumiere-pendant-necklace',
    'A single teardrop pendant on a fine 18-inch chain — quietly luxurious, easy to layer.',
    18500, 14900, 22, true),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
    'Cascade Layered Necklace', 'cascade-layered-necklace',
    'Three fine chains of graduating length, pre-layered so you never have to untangle them.',
    21900, 21900, 0, true),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003',
    'Halo Drop Earrings', 'halo-drop-earrings',
    'Classic drop earrings with a halo of tiny stones around each centerpiece.',
    13900, 11900, 30, true),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003',
    'Petal Stud Earrings', 'petal-stud-earrings',
    'Minimal flower-petal studs in brushed gold — an everyday staple.',
    8900, 8900, 45, true),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004',
    'Reverie Chain Bracelet', 'reverie-chain-bracelet',
    'An adjustable chain bracelet with a subtle figaro link pattern.',
    11900, 9900, 4, true),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004',
    'Bloom Charm Bracelet', 'bloom-charm-bracelet',
    'A dainty bracelet with three enamel flower charms.',
    12900, 12900, 17, true),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
    'Vesper Twist Ring', 'vesper-twist-ring',
    'An asymmetric twist band, hand-forged for a one-of-a-kind silhouette.',
    17900, 17900, 9, true),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002',
    'Solstice Choker', 'solstice-choker',
    'A structured choker with a single bezel-set stone at the collarbone.',
    16900, 13500, 0, true),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003',
    'Wisp Threader Earrings', 'wisp-threader-earrings',
    'Ultra-fine threader earrings that drape along the earlobe.',
    9900, 9900, 25, true),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000004',
    'Marlowe Cuff', 'marlowe-cuff',
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
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'), -- Aurora: New
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004'), -- Aurora: Featured
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'), -- Aurora: Sale
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000007'), -- Eterna: Premium
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003'), -- Lumière: Popular
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'), -- Lumière: Sale
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006'), -- Cascade: Winter
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003'), -- Halo: Popular
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002'), -- Halo: Sale
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005'), -- Petal: Summer
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001'), -- Reverie: New
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004'), -- Vesper: Featured
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002'), -- Solstice: Sale
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000008'), -- Marlowe: Limited
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000007'); -- Marlowe: Premium

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
insert into public.payment_methods (id, type, name, account_holder_name, account_number, instructions, is_active, display_order) values
  ('d0000000-0000-0000-0000-000000000001', 'mobile_wallet', 'JazzCash', 'Atelier Jewelry', '0300-0000000',
    'Send the exact order total to this JazzCash account, then upload your payment screenshot and the transaction reference below.', true, 1),
  ('d0000000-0000-0000-0000-000000000002', 'mobile_wallet', 'EasyPaisa', 'Atelier Jewelry', '0300-1111111',
    'Send the exact order total to this EasyPaisa account, then upload your payment screenshot and the transaction reference below.', true, 2);

insert into public.payment_methods (id, type, name, account_holder_name, account_number, iban, bank_name, instructions, is_active, display_order) values
  ('d0000000-0000-0000-0000-000000000003', 'bank_transfer', 'Bank Transfer', 'Atelier Jewelry (Pvt) Ltd', '0123456789012345',
    'PK00DEVL0000001234567890', 'Development Bank Ltd',
    'Transfer the exact order total via online banking or a branch deposit, then upload your deposit slip / transaction screenshot below.', true, 3);

insert into public.payment_method_details (payment_method_id, swift_code, branch_code) values
  ('d0000000-0000-0000-0000-000000000003', 'DEVLPKKA', '0001');

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
