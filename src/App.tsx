import { RouterProvider } from "react-router";
import { router } from "./app/routes";
import { applyTheme, loadPreferences } from "./app/settingsStore";
import { AuthProvider } from "./app/AuthContext";
import { DialogProvider } from "./app/components/ModalDialog";
import ToastContainer from "./app/components/Toast";

applyTheme(loadPreferences().theme);
if (typeof document !== "undefined") {
  document.title = "In Other Words";
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </DialogProvider>
    </AuthProvider>
  );
}
