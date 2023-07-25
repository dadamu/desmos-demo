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

  const onForum = () => {router.push('/forum');};

  const onConnect = useCallback(() => {
    if (signerStatus === SignerStatus.Connected) {
      disconnect();
    } else if (signerStatus === SignerStatus.NotConnected) {
      connect();
    }
    router.push('/profile');
  }, [connect, disconnect, signerStatus]);

  useEffect(() => {
    if (signer !== undefined && signerStatus === SignerStatus.Connected) {
      signer.getAccounts().then(accounts => {
        setAddress(accounts[0].address);
      })
    } else {
      setAddress("");
    }
  }, [signerStatus, signer])

  return <AppBar position="static">
    <Toolbar>
      <Button color="inherit" onClick={onForum}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          Demo Forum
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
