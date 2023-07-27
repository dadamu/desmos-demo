import React, { useCallback, useEffect, useState } from "react";
import { AppBar, Button, Toolbar, Typography, } from "@mui/material";
import { useSignerContext } from "../context/signer";
import useSignerStatus from "../hooks/useSignerStatus";
import { SignerStatus } from "@desmoslabs/desmjs";
import { useRouter } from 'next/router'

export default function Header(): JSX.Element {
  const { connect, disconnect, signer } = useSignerContext();
  const signerStatus = useSignerStatus();
  const [address, setAddress] = useState("");
  const router = useRouter();

  const onThreads = () => {router.push('/threads');};

  const onConnect = useCallback(() => {
    if (signerStatus === SignerStatus.Connected) {
      disconnect();
    } else if (signerStatus === SignerStatus.NotConnected) {
      connect();
    }
    router.push('/profile');
  }, [connect, disconnect, signerStatus, router]);

  useEffect(() => {
    if (signer !== undefined && signerStatus === SignerStatus.Connected) {
      signer.getAccounts().then(async(accounts) => {
        setAddress(accounts[0].address);
        
        await fetch(process.env.NEXT_PUBLIC_APP_GRANT_SERVER_HOST! + "/grant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user: accounts[0].address })
        }).catch((e: any) => console.error(e) )
      })
    } else {
      setAddress("");
    }
  }, [signerStatus, signer, router])

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
      <Button color="inherit" onClick={onConnect} disabled={signerStatus !== SignerStatus.Connected && signerStatus !== SignerStatus.NotConnected}>
        {signerStatus === SignerStatus.Connected ? "Disconnect" : "Connect"}
      </Button>
    </Toolbar>
  </AppBar>
}
