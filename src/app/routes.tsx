import { createBrowserRouter, Navigate, useRouteError } from "react-router";
import Archive from "./Archive";
import Dashboard from "./Dashboard";
import Editor from "./Editor";
import Publishing from "./Publishing";
import Settings from "./Settings";
import Auth from "./Auth";
import ReaderView from "./ReaderView";
import ReleaseNotes from "./ReleaseNotes";
import { ProtectedLayout, PublicOnly } from "./AuthContext";

function RouteErrorBoundary() {
  const error = useRouteError();
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "An unexpected error occurred.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5ed] p-6 text-center text-[#171714] dark:bg-[#151513] dark:text-[#f3f0e8]">
      <div className="max-w-md rounded-2xl border border-black/15 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-white/15 dark:bg-[#20201d]/90">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
          Editorial Recovery
        </span>
        <h1 className="mt-2 font-serif text-3xl font-bold">Something went off-grid.</h1>
        <p className="mt-3 text-xs leading-relaxed text-black/60 dark:text-[#f3f0e8]/60">
          The application encountered an unexpected issue while rendering this page. Your saved work remains safe in storage.
        </p>
        <p className="mt-3 rounded border border-black/10 bg-black/5 p-2 font-mono text-[11px] text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-red-400">
          {errorMessage}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            className="rounded-full bg-[#171714] px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#ef5a35] dark:bg-white dark:text-black dark:hover:bg-[#ef5a35] dark:hover:text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload Page
          </button>
          <a
            className="rounded-full border border-black/20 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-black/70 hover:border-black dark:border-white/20 dark:text-white/70 dark:hover:border-white"
            href="/"
          >
            Return to Desk
          </a>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/auth", element: <PublicOnly><Auth /></PublicOnly>, errorElement: <RouteErrorBoundary /> },
  { path: "/archive", Component: Archive, errorElement: <RouteErrorBoundary /> },
  { path: "/read/:issueId", Component: ReaderView, errorElement: <RouteErrorBoundary /> },
  { path: "/view/:issueId", Component: ReaderView, errorElement: <RouteErrorBoundary /> },
  {
    Component: ProtectedLayout,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", Component: Dashboard },
      { path: "/editor/:issueId", Component: Editor },
      { path: "/publishing", Component: Publishing },
      { path: "/settings", Component: Settings },
      { path: "/release-notes", Component: ReleaseNotes },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
], {
  basename: import.meta.env.BASE_URL,
});
