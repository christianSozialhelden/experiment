import OsmLinkForm from "./OsmLinkForm";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-7xl flex-1 flex-col items-center justify-center bg-white px-4 py-12 sm:px-8 dark:bg-black">
        <div className="flex w-full justify-end pb-6">
          <ThemeToggle />
        </div>
        <OsmLinkForm />
      </main>
    </div>
  );
}
