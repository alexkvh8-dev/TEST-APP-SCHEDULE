import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-lg px-4 pt-6">{children}</div>
      <BottomNav />
      <ServiceWorkerRegistrar />
    </>
  );
}
