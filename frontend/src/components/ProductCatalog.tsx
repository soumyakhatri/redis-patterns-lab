import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api/client";
import { CacheBadge } from "./CacheBadge";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
}

export function ProductCatalog() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  if (isLoading) {
    return <p className="muted">Loading products...</p>;
  }

  if (isError || !data) {
    return (
      <div className="card card-error">
        <p>Unable to load products.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const products = data.data.products;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Product Catalog</h2>
        <CacheBadge status={data.cache} />
      </div>
      <p className="muted catalog-hint">
        Refresh to observe cache hits after the first load. Open a product for
        per-item cache-aside behavior.
      </p>
      <ul className="product-list">
        {products.map((product) => (
          <li key={product.id}>
            <Link to={`/products/${product.id}`} className="product-link">
              <span className="product-name">{product.name}</span>
              <span className="product-meta">
                {formatPrice(product.price)} · {product.category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? "Refreshing..." : "Reload (check X-Cache)"}
      </button>
    </div>
  );
}
