import { DesmosClient, GasPrice } from "@desmoslabs/desmjs";
import { createContext, useEffect, useContext, useState } from "react";
import { useSignerContext } from "./signer";
import useSignerStatus from "../hooks/useSignerStatus";


export interface ClientContext {
  client?: DesmosClient
}

// @ts-ignore
const ClientContext = createContext<ClientContext>({})

interface Props {
  children?: React.ReactNode
}

export const ClientContextProvider: React.FC<Props> = ({ children }) => {
  const [client, setDesmosClient] = useState<DesmosClient>();
  const { signer } = useSignerContext();
  const signerStatus = useSignerStatus();

   useEffect(() => {
    (async () => {
      if (signer !== undefined) {
        const client = await DesmosClient.connectWithSigner("https://rpc.morpheus.desmos.network:443", signer, {
          gasPrice: GasPrice.fromString("0.2udaric"),
        });
        setDesmosClient(old => {
          if (old !== undefined) {
            old.disconnect();
          }
          return client;
        })
      } else {
        const client = await DesmosClient.connect("https://rpc.morpheus.desmos.network:443");
        setDesmosClient(old => {
          if (old !== undefined) {
            old.disconnect();
          }
          return client;
        });
      }
    })();
  }, [signerStatus])


  return <ClientContext.Provider value={{ client }}>
    {children}
  </ClientContext.Provider>
};

export function useClientContext(): ClientContext {
  return useContext(ClientContext);
}
