const {
    DesmosClient,
    SigningMode,
    OfflineSignerAdapter,
    assertIsDeliverTxSuccess,
    GasPrice
} = require("@desmoslabs/desmjs");
const Long = require("long");

require('dotenv').config();

const mnemonic = process.env.MNEMONIC_PHRASE;
const tokenAmount = process.env.TOKEN_AMOUNT;

async function* getTestnetPostIterator() {
    const client = await DesmosClient.connect("https://rpc.morpheus.desmos.network");

    let key = new Uint8Array();
    let posts = [];

    do {
        const response = await client.querier.postsV3.subspacePosts(Long.fromNumber(15), {
            key: !!key ? key : new Uint8Array(),
            limit: Long.fromNumber(20),
            offset: Long.fromNumber(0),
            reverse: true,
            countTotal: false,
        });

        key = response.pagination.nextKey;
        posts = response.posts;

        while (posts.length) {
            yield posts.pop();
        }

    } while (posts.length || key.length);
}

function splitIntoGroups(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
    }

  return result;
}

async function main() {
    // Define signer
    const signer = await OfflineSignerAdapter.fromMnemonic(SigningMode.DIRECT, mnemonic);
    const [signerAccount] = await signer.getAccounts();
    const client = await DesmosClient.connectWithSigner("https://rpc.mainnet.desmos.network", signer, {
        gasPrice: GasPrice.fromString("0.02udsm"),
      });

    // Get post authors on testnet
    const authors = [];
    let iterator = getTestnetPostIterator()
    for (let post = (await iterator.next()).value; !!post; post = (await iterator.next()).value) {
        if (post.id >= 0) authors.push(post.author);
    }

    // Build msgs
    const filtered = [...new Set(authors)];
    const msgs = [];
    for (const recipient of filtered) {
        msgs.push({
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
                fromAddress: signerAccount.address,
                toAddress: recipient,
                amount: [{
                    denom: "udsm",
                    amount: tokenAmount,
                }],
            },
        });
    }

    // Send tokens for each groups
    let count = 0
    for (const groupMsgs of splitIntoGroups(msgs, 10)) {
        console.log(`Send tokens to ${++count} group`);
        const result = await client.signAndBroadcast(signerAccount.address, groupMsgs, "auto");
        assertIsDeliverTxSuccess(result);
    }

}

main().then(() => console.log("finished"));