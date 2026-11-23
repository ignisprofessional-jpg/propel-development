import { LangToggle, ThemeToggle } from "@/components/layout/Toggles";
import { PinCard } from "./PinForm";
import s from "./login.module.css";

export const metadata = { title: "Code" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className={s.page}>
      <div className={s.toggles}>
        <ThemeToggle />
        <LangToggle />
      </div>
      <PinCard next={next ?? "/"} />
    </main>
  );
}
