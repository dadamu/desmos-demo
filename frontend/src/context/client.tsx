import { DesmosClient, GasPrice } from "@desmoslabs/desmjs";
import { createContext, useEffect, useContext, useState } from "react";
import { useSignerContext } from "./signer";

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
  const { signer, connect, disconnect } = useSignerContext();
  const [ currentStatus, setCurrentStatus] = useState(signer?.status)

  useEffect(() => {
    if(currentStatus === signer?.status){
      return;
    }
    
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

        setCurrentStatus(signer.status);
      } else {
        const client = await DesmosClient.connect("https://rpc.morpheus.desmos.network:443");
        setDesmosClient(old => {
          if (old !== undefined) {
            old.disconnect();
          }
          return client;
        });
      }
    })()
  }, [signer, connect, disconnect])


  return <ClientContext.Provider value={{ client }}>
    {children}
  </ClientContext.Provider>
};

export function useClientContext(): ClientContext {
  return useContext(ClientContext);
}
