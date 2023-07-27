import {Signer, SigningMode, PrivateKeySigner} from "@desmoslabs/desmjs";
import {OpenloginAdapter} from "@web3auth/openlogin-adapter";
import React, {createContext, useCallback, useContext, useState} from "react";
import {web3AuthSigner} from "../utils/keyprovider";

export interface SignerContext {
  signer?: Signer
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

// @ts-ignore
const SignerContext = createContext<SignerContext>({})

interface Props {
  children?: React.ReactNode
}

export const SignerContextProvider: React.FC<Props> = ({children}) => {
  const keyInStorage = typeof window !== "undefined" ? window.sessionStorage.getItem("key") : null;
  const defaultSigner = !keyInStorage ? undefined: PrivateKeySigner.fromSecp256k1(keyInStorage, SigningMode.DIRECT, { prefix: "desmos" });
  const [signer, setSigner] = useState<Signer | undefined >(defaultSigner)

  if (defaultSigner){
    defaultSigner.connect().then(()=> setSigner(defaultSigner));
  }

  const connect = useCallback(async () => {
    const openloginAdapter = new OpenloginAdapter({
      adapterSettings: {
        network: "cyan",
        uxMode: "popup",
        whiteLabel: {
          name: "Desmos DApp example",
          defaultLanguage: "en",
          dark: true, // whether to enable dark mode. defaultValue: false
        },
      },
    });

    const signer = web3AuthSigner(SigningMode.DIRECT, {
      authMode: "DAPP",
      clientId: process.env.NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID!,
      chainConfig: {
        chainNamespace: "other",
        blockExplorer: "https://morpheus.desmos.network",
        displayName: "Desmos",
        chainId: "morpheus-apollo-3",
        ticker: "DSM",
        tickerName: "Desmos",
        rpcTarget: "https://rpc.morpheus.desmos.network",
      }
    }, {
       adapters: [openloginAdapter]
    });

    setSigner(signer);

    return signer.connect().then(() => sessionStorage.setItem("key", Buffer.from(signer.privateKey.key).toString("hex")));
  }, []);

  const disconnect = useCallback(async () => {
    if (signer !== undefined) {
      sessionStorage.removeItem("key");
      setSigner(undefined);
      await signer.disconnect()
    }
  }, [signer]);

  return <SignerContext.Provider value={{
    signer,
    connect,
    disconnect
  }}
  >
    {children}
  </SignerContext.Provider>
}

export function useSignerContext(): SignerContext {
  return useContext(SignerContext);
}
