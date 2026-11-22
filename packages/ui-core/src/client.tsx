"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Makes the provider and hook through which a service's UI package reaches its own API.
 * The app supplies the client: a mock before the service is built, the gateway once it is live.
 * This keeps each package free of fetch details and lets it never call another service.
 */
export function createClientContext<Client>(service: string) {
  const Context = createContext<Client | null>(null);
  function Provider({ client, children }: { client: Client; children: ReactNode }) {
    return <Context.Provider value={client}>{children}</Context.Provider>;
  }
  function useClient(): Client {
    const client = useContext(Context);
    if (!client) throw new Error(`${service} components need a <${service}ClientProvider>.`);
    return client;
  }
  return { Provider, useClient };
}
