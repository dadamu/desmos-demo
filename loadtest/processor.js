const bip39 = require("bip39");
const {
    SigningMode,
    OfflineSignerAdapter,
} = require("@desmoslabs/desmjs");

async function generateAddress(requestParams, ctx, ee, next) {
    const mnemonic = bip39.generateMnemonic();
    const signer = await OfflineSignerAdapter.fromMnemonic(SigningMode.DIRECT, mnemonic);
    const [signerAccount] = await signer.getAccounts();
    ctx.vars["address"] = signerAccount.address;
    return next();
  }
   
  module.exports = {
    generateAddress,
  };