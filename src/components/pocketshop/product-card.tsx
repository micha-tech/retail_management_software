import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "./favorite-button";
import { addToCartAction } from "@/modules/pocketshop/cart-actions";
import { formatMoney } from "@/lib/money";

export type StorefrontProduct = {
  id: string; name: string; slug: string; price: bigint; compareAtPrice: bigint | null;
  categoryName: string | null; images: string[]; defaultVariantId: string | null; available: boolean;
};

export function ProductCard({ product, storeSlug, currency }: { product: StorefrontProduct; storeSlug: string; currency: string }) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(Number((product.compareAtPrice - product.price) * 100n / product.compareAtPrice)) : 0;
  return (
    <article className="ps-product-card">
      <div className="ps-product-card-media">
        <Link href={`/store/${storeSlug}/products/${product.slug}`} aria-label={product.name}>
          {product.images[0] ? <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 620px) 50vw, 280px" unoptimized /> : <div className="ps-product-placeholder">No photo yet</div>}
        </Link>
        <FavoriteButton productId={product.id} />
        {discount > 0 && <span className="ps-discount">−{discount}%</span>}
      </div>
      <div className="ps-product-card-body">
        <small>{product.categoryName ?? "Product"}</small>
        <Link href={`/store/${storeSlug}/products/${product.slug}`}><strong>{product.name}</strong></Link>
        <div className="ps-price"><b>{formatMoney(product.price, currency)}</b>{product.compareAtPrice && product.compareAtPrice > product.price && <s>{formatMoney(product.compareAtPrice, currency)}</s>}</div>
        {product.defaultVariantId && product.available ? (
          <form action={addToCartAction}>
            <input type="hidden" name="storeSlug" value={storeSlug} />
            <input type="hidden" name="variantId" value={product.defaultVariantId} />
            <input type="hidden" name="quantity" value="1" />
            <button className="ps-button secondary small" type="submit">Add to cart</button>
          </form>
        ) : <span className="ps-hint" style={{ fontSize: 11 }}>Currently unavailable</span>}
      </div>
    </article>
  );
}
