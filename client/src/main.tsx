import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./auth";
import { UndoProvider } from "./undo";
import { ToastViewport, pushToast } from "./toast";
import "./styles/index.css";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Auth mutations show their error inline in AuthScreen instead of a toast.
      if (mutation.options.meta?.silent) return;
      pushToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    },
  }),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UndoProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <ToastViewport />
        </UndoProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
