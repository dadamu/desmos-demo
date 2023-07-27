import React, { useState } from "react";
import { useQuery } from 'react-query'
import List from "@mui/material/List";
import Grid2 from "@mui/material/Unstable_Grid2";
import TextField from "@mui/material/TextField";
import CreateIcon from "@mui/icons-material/Create";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { SignerStatus } from "@desmoslabs/desmjs";
import { ReplySetting } from "@desmoslabs/desmjs-types/desmos/posts/v3/models";
import { Posts } from "@desmoslabs/desmjs";
import { useRouter } from 'next/router'
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { calculateFee } from "@cosmjs/stargate";
import { GasPrice } from "@desmoslabs/desmjs";

import { useClientContext } from "../../context/client";
import { Post } from "../../components/Post";
import { useSignerContext } from "../../context/signer";
import useSignerStatus from "../../hooks/useSignerStatus";

import Long from "long";
import { LoadingButton } from "@mui/lab";

export default function Threads(): JSX.Element {
  const signerStatus = useSignerStatus();
  const { client } = useClientContext();
  const { signer } = useSignerContext();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

  const { data, isLoading, isError, isSuccess } = useQuery(
    "posts",
    async () => {
      return await client!.querier.postsV3.subspacePosts(Long.fromValue(15), {
        key: new Uint8Array(),
        limit: Long.fromValue(20),
        offset: Long.fromValue(0),
        reverse: true,
        countTotal: false
      });
    },
    {
      enabled: !!client,
    }
  )

  const createPost = async () => {
    const accounts = await signer!.getAccounts();
    const creator = accounts[0].address;
    setCreatingPost(true);
    try {
      const msg = {
        typeUrl: Posts.v3.MsgCreatePostTypeUrl,
        value: {
          subspaceId: Long.fromValue(15),
          sectionId: 0,
          externalId: "",
          text: content,
          tags: [],
          attachments: [],
          author: creator,
          conversationId: Long.fromValue(0),
          replySettings: ReplySetting.REPLY_SETTING_MUTUAL,
          referencedPosts: [],
        }
      } as Posts.v3.MsgCreatePostEncodeObject;

      const gasEstimation = await client!.simulate(creator, [msg], "");
      const fee = calculateFee(Math.round(gasEstimation * 2), GasPrice.fromString("0.2udaric"));
      const tx = await client!.signTx(creator, [msg], {
        fee,
        feeGranter: "desmos16x504az4yyp20ptwmxn59qzxhwqyuekcrxy4qy",
      });
      const txBytes = TxRaw.encode(tx.txRaw).finish();
      const response = await client!.broadcastTx(txBytes, client!.broadcastTimeoutMs, client!.broadcastPollIntervalMs);
      alert(`Post created:\nhttps://testnet.bigdipper.live/desmos/transactions/${response.transactionHash}`)
      router.reload()
    } catch (e) {
      alert(e);
    } finally {
      setCreatingPost(false)
    }
  };

  return <Grid2
    sx={{ m: 2 }}
    container
    direction={"column"}
    alignItems={"center"}
  >
    <List sx={{ minWidth: "70%", bgcolor: "background.paper", alignItems: "center" }}>
      {signerStatus === SignerStatus.Connected &&
        <TextField
          multiline sx={{ m: 1 }}
          fullWidth label="create post"
          onChange={(v) => setContent(v.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton edge="end" color="primary" onClick={createPost}>
                  <LoadingButton loading={creatingPost}>
                    Create<CreateIcon />
                  </LoadingButton>
                </IconButton>
              </InputAdornment>)
          }}
        />
      }
      {isLoading && <div>Loading...</div>}
      {isError && <div>Fetching error</div>}
      {isSuccess && data === undefined && <div>Empty</div>}
      {isSuccess && data !== undefined && data.posts.map((post, key) => {
        return <Post key={key} user={post.author} content={post.text} />
      })
      }
    </List>
  </Grid2>
}