"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StockTable } from "./stock-table";
import { RestockModal } from "./restock-modal";
import { LossModal } from "./loss-modal";
import type { StockRow } from "./stock-table";

interface StockShellProps {
  data: StockRow[];
}

export function StockShell({ data }: StockShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [restockRow, setRestockRow] = useState<StockRow | null>(null);
  const [lossRow,    setLossRow]    = useState<StockRow | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      <StockTable
        data={data}
        onRestock={(row) => setRestockRow(row)}
        onLoss={(row)    => setLossRow(row)}
      />

      {restockRow && (
        <RestockModal
          row={restockRow}
          onClose={() => setRestockRow(null)}
          onSuccess={() => { setRestockRow(null); refresh(); }}
        />
      )}

      {lossRow && (
        <LossModal
          row={lossRow}
          onClose={() => setLossRow(null)}
          onSuccess={() => { setLossRow(null); refresh(); }}
        />
      )}
    </>
  );
}