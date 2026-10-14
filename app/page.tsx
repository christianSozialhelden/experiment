import OsmLinkForm from "./OsmLinkForm";
import SozialheldinnenLogo from "./SozialheldinnenLogo";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center overflow-x-clip justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-7xl flex-1 flex-col items-center justify-center bg-white px-4 py-12 sm:px-8 dark:bg-black">
        <header className="flex w-full flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SozialheldinnenLogo className="h-10 w-auto text-black sm:h-12 dark:text-zinc-50" />
            <h1 className="text-3xl font-semibold text-red-800 sm:text-4xl dark:text-red-400">
              Geokoordinaten Experiment
            </h1>
          </div>
          <ThemeToggle />
        </header>
        <OsmLinkForm />
      </main>
    </div>
  );
}
