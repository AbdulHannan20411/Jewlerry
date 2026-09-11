import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchProducts, getAllCategories } from "@/lib/products/queries";
import { getActiveBanners } from "@/lib/banners/queries";
import { getSiteSettings } from "@/lib/settings/queries";
import { BannerCarousel } from "@/components/storefront/banner-carousel";
import { ProductSection } from "@/components/storefront/product-section";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const [banners, featured, newArrivals, sale, categories, settings] = await Promise.all([
    getActiveBanners(supabase),
    searchProducts(supabase, { sort: "newest", page: 1, tag: "featured" }, { pageSize: 4 }),
    searchProducts(supabase, { sort: "newest", page: 1 }, { pageSize: 4 }),
    searchProducts(supabase, { sort: "newest", page: 1, tag: "sale" }, { pageSize: 4 }),
    getAllCategories(supabase, { activeOnly: true }),
    getSiteSettings(),
  ]);

  const lowStockThreshold = settings?.low_stock_threshold;

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <BannerCarousel banners={banners} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <ProductSection
          title="Featured"
          viewAllHref="/products?tag=featured"
          products={featured.items}
          lowStockThreshold={lowStockThreshold}
        />

        <ProductSection
          title="New Arrivals"
          viewAllHref="/products?sort=newest"
          products={newArrivals.items}
          lowStockThreshold={lowStockThreshold}
        />

        {categories.length > 0 && (
          <section className="py-10">
            <h2 className="mb-5 font-heading text-2xl font-semibold">Shop by Category</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={{ pathname: "/products", query: { category: category.slug } }}
                  className="group flex flex-col items-center gap-3 rounded-lg border border-border/70 bg-card p-6 text-center transition-colors hover:border-primary"
                >
                  <span className="font-heading text-lg font-medium text-foreground group-hover:text-primary">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ProductSection
          title="On Sale"
          viewAllHref="/products?tag=sale"
          products={sale.items}
          lowStockThreshold={lowStockThreshold}
        />
      </div>

      <section className="mt-8 border-t border-border/70 bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 text-center sm:grid-cols-3">
          <div>
            <p className="font-heading text-lg font-medium">Complimentary Gift Wrapping</p>
            <p className="mt-1 text-sm text-muted-foreground">On every order, no exceptions.</p>
          </div>
          <div>
            <p className="font-heading text-lg font-medium">Secure Payments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payment is verified by our team, every time.
            </p>
          </div>
          <div>
            <p className="font-heading text-lg font-medium">Here to Help</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions? <Link href="/contact" className="text-primary hover:underline">Get in touch</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
