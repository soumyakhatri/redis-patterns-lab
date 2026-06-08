import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchProduct } from "../api/client";
import { CacheBadge } from "../components/CacheBadge";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="muted">Loading product...</p>;
  }

  if (isError || !data) {
    return (
      <div className="card card-error">
        <p>Product not found or API unavailable.</p>
        <Link to="/">Back to catalog</Link>
      </div>
    );
  }

  const { product } = data.data;

  return (
    <main className="page">
      <p className="back-link">
        <Link to="/">← Back to catalog</Link>
      </p>
      <div className="card">
        <div className="card-header">
          <h1>{product.name}</h1>
          <CacheBadge status={data.cache} />
        </div>
        <p className="lead">{product.description ?? "No description."}</p>
        <dl className="detail-grid">
          <div>
            <dt>Price</dt>
            <dd>{formatPrice(product.price)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{product.category.name}</dd>
          </div>
          <div>
            <dt>In stock</dt>
            <dd>{product.inventory?.quantity ?? 0}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing..." : "Reload (check X-Cache)"}
        </button>
      </div>
    </main>
  );
}
