import { Link } from "react-router";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
      <Header />
      <Sidebar />
      <main className="pt-14 pl-0 md:pl-60">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4">
          <div className="flex flex-col items-center text-center max-w-md">
            {/* Monkey icon - similar to YouTube's 404 */}
            <div className="mb-6 text-(--color-text-secondary)">
              <svg viewBox="0 0 90 90" className="w-32 h-32" fill="currentColor">
                <path d="M45 5C23.46 5 6 22.46 6 44c0 9.87 3.67 18.87 9.72 25.73C21.29 76.12 32.49 80 45 80c12.51 0 23.71-3.88 29.28-10.27C80.33 62.87 84 53.87 84 44 84 22.46 66.54 5 45 5zm0 70c-17.12 0-31-13.88-31-31s13.88-31 31-31 31 13.88 31 31-13.88 31-31 31z"/>
                <circle cx="34" cy="38" r="5"/>
                <circle cx="56" cy="38" r="5"/>
                <path d="M45 62c-8.28 0-15-5.37-15-12h6c0 3.31 4.03 6 9 6s9-2.69 9-6h6c0 6.63-6.72 12-15 12z"/>
              </svg>
            </div>

            <h1 className="text-xl font-medium mb-2">
              This page isn't available. Sorry about that.
            </h1>

            <p className="text-(--color-text-secondary) mb-6">
              Try searching for something else.
            </p>

            <Link
              to="/"
              className="px-4 py-2 bg-(--color-text-primary) text-(--color-bg-primary) rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
