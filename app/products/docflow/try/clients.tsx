"use client";

// Plugs the in-browser mock into each service's UI package. Each package defines the client it
// needs from its own API; once a service is built, the client here becomes a call to the gateway
// (/api/{service}/v1) and the components do not change.

import { createContext, useContext, type ReactNode } from "react";
import { createClientContext } from "@01scale/ui-core";
import { DeliveryClientProvider } from "@01scale/ui-delivery";
import { ExtractionClientProvider } from "@01scale/ui-extraction";
import { IdentityClientProvider } from "@01scale/ui-identity";
import { PaymentClientProvider } from "@01scale/ui-payment";
import { ReviewClientProvider } from "@01scale/ui-review";
import { UploadClientProvider } from "@01scale/ui-upload";
import type { Platform } from "./mock-platform";

// DocFlow's own API, for DocFlow's own pages and sections.
const docflowContext = createClientContext<Platform["docflow"]>("DocFlow");
export const useDocflow = docflowContext.useClient;
export const DocflowClientProvider = docflowContext.Provider;

// The outside pages' stand-ins (Cognito, Stripe) reach the mock directly: they are not ours.
const PlatformContext = createContext<Platform | null>(null);
export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("usePlatform needs ServiceClients.");
  return platform;
}

export function ServiceClients({ platform, children }: { platform: Platform; children: ReactNode }) {
  return (
    <PlatformContext.Provider value={platform}>
      <docflowContext.Provider client={platform.docflow}>
        <IdentityClientProvider
          client={{
            getSession: platform.identity.me,
            signOut: platform.identity.signOut,
            loginUrl: (returnTo) => `/api/identity/v1/auth/login?return_to=${encodeURIComponent(returnTo)}`,
            // The prototype's shell shows the Cognito stand-in itself; nothing navigates away.
            navigate: () => {},
          }}
        >
          <UploadClientProvider client={{ putToStorage: platform.upload.putToStorage }}>
            <ExtractionClientProvider
              client={{
                getJob: platform.extraction.getJob,
                getFields: (jobId, flagged) => platform.extraction.getFields("browser", jobId, flagged),
              }}
            >
              <ReviewClientProvider client={{ getTask: platform.review.getTask, decide: platform.review.decide }}>
                <PaymentClientProvider client={{ getOrder: platform.payment.getOrder }}>
                  <DeliveryClientProvider client={{ getMessage: platform.delivery.getMessage }}>{children}</DeliveryClientProvider>
                </PaymentClientProvider>
              </ReviewClientProvider>
            </ExtractionClientProvider>
          </UploadClientProvider>
        </IdentityClientProvider>
      </docflowContext.Provider>
    </PlatformContext.Provider>
  );
}
