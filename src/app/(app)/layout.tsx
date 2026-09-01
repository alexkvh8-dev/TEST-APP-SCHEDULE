import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="has-tabbar mx-auto w-full max-w-lg px-4 pt-5">{children}</div>
      <BottomNav />
    </>
  );
}
