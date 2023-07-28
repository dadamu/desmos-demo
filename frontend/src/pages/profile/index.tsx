import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Alert, Button, Skeleton, Snackbar, Typography} from "@mui/material";
import {Profiles, SignerStatus} from "@desmoslabs/desmjs";
import {Profile} from "@desmoslabs/desmjs-types/desmos/profiles/v3/models_profile";
import Grid2 from "@mui/material/Unstable_Grid2";
import {ProfileViewer} from "../../components/Profile";
import LoadingButton from "@mui/lab/LoadingButton";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { calculateFee } from "@cosmjs/stargate";
import { GasPrice } from "@desmoslabs/desmjs";

import {useSignerContext} from "../../context/signer";
import {useClientContext} from "../../context/client";
import useSignerStatus from "../../hooks/useSignerStatus";

enum ProfileStatus {
  None,
  Fetching,
  Error,
  Fetched,
}

interface ProfileNone {
  status: ProfileStatus.None
}

interface ProfileFetching {
  status: ProfileStatus.Fetching
}

interface ProfileFetchError {
  status: ProfileStatus.Error,
  error: string,
}

interface ProfileFetched {
  status: ProfileStatus.Fetched,
  profile: Profile | null,
}

type ProfileState = ProfileNone | ProfileFetching | ProfileFetchError | ProfileFetched;

export default function ProfileEdit(): JSX.Element {
  const {signer} = useSignerContext();
  const signerStatus = useSignerStatus();
  const {client} = useClientContext();
  const [profileState, setProfileState] = useState<ProfileState>({status: ProfileStatus.None});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | undefined>(undefined);
  const [showProfileSaved, setShowProfileSaved] = useState(false);

  useEffect(() => {
    if (signerStatus === SignerStatus.NotConnected) {
      setProfileState({status: ProfileStatus.None});
    }
  }, [signerStatus])

  useEffect(() => {
    if (client !== undefined && signerStatus === SignerStatus.Connected) {
      (async () => {
        try {
          setSaveProfileError(undefined);
          setProfileState({
            status: ProfileStatus.Fetching
          });
          const accounts = await signer!.getAccounts();
          const profile = await client.getProfile(accounts[0].address);
          setProfileState({
            status: ProfileStatus.Fetched,
            profile,
          });
          setProfile(profile);
        } catch (e: any) {
          setProfileState({
            status: ProfileStatus.Error,
            error: e.toString(),
          });
        }
      })()
    }
  }, [client, signerStatus])

  const saveProfile = useCallback(async () => {
    if (signer !== undefined && client !== undefined && profile !== null) {
      try {
        console.log("Saving profile...")
        setSavingProfile(true)
        setSaveProfileError(undefined);
        const accounts = await signer.getAccounts();
        const creator = accounts[0].address;

        const msg = {
          typeUrl: Profiles.v3.MsgSaveProfileTypeUrl,
          value: {
            dtag: profile.dtag,
            bio: profile.bio,
            nickname: profile.nickname,
            profilePicture: profile?.pictures?.profile ?? "",
            coverPicture: profile?.pictures?.cover ?? "",
            creator
          }
        } as Profiles.v3.MsgSaveProfileEncodeObject;

        const gasEstimation = await client!.simulate(creator, [msg], "");
        const fee = calculateFee(Math.round(gasEstimation * 2), GasPrice.fromString("0.2udaric"));
        const tx = await client.signTx(creator, [msg], {
          fee,
          feeGranter: "desmos16x504az4yyp20ptwmxn59qzxhwqyuekcrxy4qy"
        });
        const txBytes = TxRaw.encode(tx.txRaw).finish();
        const response = await client.broadcastTx(txBytes, client.broadcastTimeoutMs, client.broadcastPollIntervalMs);
        setShowProfileSaved(true);
        alert(`Profile saved:\nhttps://testnet.bigdipper.live/desmos/transactions/${response.transactionHash}`);
      } catch (e: any) {
        console.error("Profile save error", e);
        setSaveProfileError(e.message);
        alert(e);
      } finally {
        setSavingProfile(false)
        console.log("Profile save finished")
      }
    }
  }, [signer, client, profile]);

  const profileEditor = useMemo(() => {
    switch (profileState.status) {
      case ProfileStatus.None:
        return <>Please connect your wallet or refresh the page.</>

      case ProfileStatus.Fetching:
        return <>
          <Grid2>
            <Typography variant={"caption"}>Fetching profile...</Typography>
          </Grid2>
          <Grid2 sx={{height: 60, width: "30%"}}>
            <Skeleton sx={{height: "100%"}} animation="wave" variant="rectangular"/>
          </Grid2>
          <Grid2 sx={{height: 60, width: "30%"}}>
            <Skeleton sx={{height: "100%"}} animation="wave" variant="rectangular"/>
          </Grid2>
          <Grid2 sx={{height: 60, width: "30%"}}>
            <Skeleton sx={{height: "100%"}} animation="wave" variant="rectangular"/>
          </Grid2>
          <Grid2>
            <Button
              variant={"contained"}
              disabled={true}
            >
              Save profile
            </Button>
          </Grid2>
        </>
      case ProfileStatus.Fetched:
        return <>
          <ProfileViewer
            profile={profileState.profile}
            onChange={setProfile}
          />
          {saveProfileError !== undefined && !savingProfile && <Grid2>
              <Typography
                  variant="caption"
                  color={"red"}
              >
                {saveProfileError}
              </Typography>
          </Grid2>
          }
          <Grid2>
            <LoadingButton
              variant={"contained"}
              onClick={saveProfile}
              disabled={signerStatus !== SignerStatus.Connected}
              loading={savingProfile}
            >
              Save profile
            </LoadingButton>
          </Grid2>
        </>
      case ProfileStatus.Error:
        return <Typography
          variant="caption"
          color={"red"}
        >
          Fetch profile error {profileState.error}
        </Typography>
    }
  }, [signerStatus, profileState, saveProfile, savingProfile, saveProfileError])

  return <Grid2
    sx={{m: 2}}
    container
    direction={"column"}
    alignItems={"center"}
  >
    {profileEditor}
    <Snackbar
      anchorOrigin={{vertical: "bottom", horizontal: "right",}}
      open={showProfileSaved}
      autoHideDuration={6000}
      onClose={() => setShowProfileSaved(false)}
    >
      <Alert onClose={() => setShowProfileSaved(false)} severity="success" sx={{width: "100%"}}>
        Profile saved!
      </Alert>
    </Snackbar>
  </Grid2>
}
