"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductTable } from "./product-table";
import { ProductForm }  from "./product-form";
import type { ProductWithVariants } from "@/actions/products/get-products.action";

interface ProductsShellProps {
  initialProducts: ProductWithVariants[];
  categories:      { id: string; name: string; color: string | null }[];
}

export function ProductsShell({ initialProducts, categories }: ProductsShellProps) {
  const router           = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      <ProductTable
        products={initialProducts}
        categories={categories}
        onAdd={() => setShowForm(true)}
        onRefresh={handleRefresh}
      />

      {showForm && (
        <ProductForm
          categories={categories}
          onSuccess={() => { setShowForm(false); handleRefresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}