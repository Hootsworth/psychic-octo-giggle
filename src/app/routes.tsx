import { createBrowserRouter, Navigate } from "react-router";
import Archive from "./Archive";
import Dashboard from "./Dashboard";
import Editor from "./Editor";
import Publishing from "./Publishing";
import Settings from "./Settings";
import Auth from "./Auth";
import { ProtectedLayout, PublicOnly } from "./AuthContext";

export const router = createBrowserRouter([
  { path: "/auth", element: <PublicOnly><Auth /></PublicOnly> },
  { path: "/archive", Component: Archive },
  {
    Component: ProtectedLayout,
    children: [
      { path: "/", Component: Dashboard },
      { path: "/editor/:issueId", Component: Editor },
      { path: "/publishing", Component: Publishing },
      { path: "/settings", Component: Settings },
    ],
  },
  { path: "*", element: <Navigate replace to="/" /> },
], {
  basename: import.meta.env.BASE_URL,
});
