import {useSignerContext} from "../context/signer";
import {useEffect, useState} from "react";
import {SignerStatus} from "@desmoslabs/desmjs";

export default function useSignerStatus() {
  const {signer} = useSignerContext();
  const [signerStatus, setSignerStatus] = useState(!signer ? SignerStatus.NotConnected : signer.status);

  useEffect(() => {
    if (signer?.status === signerStatus) {
      return;
    }

    if (signer === undefined ) {
      setSignerStatus(SignerStatus.NotConnected);
      return undefined;
    } else {
      setSignerStatus(signer.status);
      signer.addStatusListener(setSignerStatus);
      return () => {
        signer.removeStatusListener(setSignerStatus);
      }
    }
  }, [signer]);

  return signerStatus;
}
