"use client";

import { store } from "./store/store";


import { Provider as ReduxProvider } from "react-redux"; // or your store provider
import  ContextProvider  from "./contextProvider";      // your auth context

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <ContextProvider>
        {children}
      </ContextProvider>
    </ReduxProvider>
  );
}