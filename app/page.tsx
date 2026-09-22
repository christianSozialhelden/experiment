import OsmLinkForm from "./OsmLinkForm";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex w-full max-w-md justify-end pb-4">
          <ThemeToggle />
        </div>
        <OsmLinkForm />
      </main>
    </div>
  );
}
