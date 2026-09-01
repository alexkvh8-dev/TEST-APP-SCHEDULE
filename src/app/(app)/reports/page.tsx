import { Suspense } from "react";

import { ReportsScreen } from "@/components/ReportsScreen";
import type { Period } from "@/lib/types";

export const metadata = { title: "Reports — FinX" };

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const initial: Period = PERIODS.includes(period as Period) ? (period as Period) : "daily";

  return (
    <Suspense>
      <ReportsScreen initialPeriod={initial} />
    </Suspense>
  );
}
