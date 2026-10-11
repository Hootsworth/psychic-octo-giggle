import { RouterProvider } from "react-router";
import { router } from "./app/routes";
import { applyTheme, loadPreferences } from "./app/settingsStore";
import { AuthProvider } from "./app/AuthContext";

applyTheme(loadPreferences().theme);
if (typeof document !== "undefined") {
  document.title = "In Other Words";
}

export default function App() {
  return <AuthProvider><RouterProvider router={router} /></AuthProvider>;
}
