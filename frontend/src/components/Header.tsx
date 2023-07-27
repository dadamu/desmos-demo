import React, { useCallback, useEffect, useState } from "react";
import { AppBar, Button, Toolbar, Typography, } from "@mui/material";
import { useSignerContext } from "../context/signer";
import { SignerStatus } from "@desmoslabs/desmjs";
import { useRouter } from 'next/router'
import useSignerStatus from "../hooks/useSignerStatus";

export default function Header(): JSX.Element {
  const { connect, disconnect, signer } = useSignerContext();
  const [address, setAddress] = useState("");
  const router = useRouter();
  const signerStatus = useSignerStatus();

  const onThreads = () => { router.push('/threads'); };

  const onConnect = useCallback(() => {
    if (signer?.status === SignerStatus.Connected) {
      disconnect();
    } else {
      connect();
    }
    router.push('/profile');
  }, [signerStatus]);

  useEffect(() => {
    if (signerStatus === SignerStatus.Connected) {
      signer!.getAccounts().then(async (accounts) => {
        setAddress(accounts[0].address);
      })
    } else {
      setAddress("");
    }
  }, [signerStatus])

  useEffect(() => {
    if (signerStatus !== SignerStatus.Connected) {
      return;
    }
    
    signer!.getAccounts().then(async (accounts) => {
      setAddress(accounts[0].address);
      await fetch(process.env.NEXT_PUBLIC_APP_GRANT_SERVER_HOST! + "/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: accounts[0].address })
      }).catch((e: any) => console.error(e))
    })
  }, [signerStatus])

  return <AppBar position="static">
    <Toolbar>
      <Button color="inherit" onClick={onThreads}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          Demo Threads
        </Typography>
      </Button>
      <Typography
        variant="caption"
        component="div"
        sx={{ flexGrow: 1, textAlign: "end" }}
      >
        {address}
      </Typography>
      <Button color="inherit" onClick={onConnect} disabled={signerStatus === SignerStatus.Connecting || signerStatus === SignerStatus.Disconnecting}>
        {signerStatus === SignerStatus.Connected ? "Disconnect" : "Connect"}
      </Button>
    </Toolbar>
  </AppBar>
}
