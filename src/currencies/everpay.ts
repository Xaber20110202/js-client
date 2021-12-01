import Arweave from "arweave";
//import { arweave } from "../bundlr";
import crypto from "crypto";
import Everpay from "everpay"
import BigNumber from "bignumber.js";
import base64url from "base64url";
import { currencies } from "./index";
import { ArweaveSigner } from "arbundles/build/signing";


interface CreateEverpayParams {
  account: string,
  arJWK: any
}

async function createEverpay(params?: CreateEverpayParams) {
  return new Everpay(params)
}

export async function everpayGetTx(everHash) {
    const everpay = await createEverpay();
    const tx = await everpay.txByHash(everHash);
  
    return {
        from: tx.from,
        to: tx.to,
        amount: new BigNumber(tx.amount),
        pending: tx.status === "confirmed",
        confirmed: tx.status === "packaged"
    }
}

export function everpayOwnerToAddress(owner) {
    return Arweave.utils.bufferTob64Url(crypto
        .createHash("sha256")
        .update((Arweave.utils.b64UrlToBuffer((Buffer.isBuffer(owner) ? base64url(owner) : owner))))
        .digest()
    );

}

// TODO:
export async function everpayGetId(item) {
    return base64url.encode(Buffer.from(await Arweave.crypto.hash(await item.rawSignature())));
}

export async function everpaySign(data) {
  // TODO:
    return Arweave.crypto.sign(currencies["arweave"].account.key, data);
}

export function everpayGetSigner() {
  // TODO:
    return new ArweaveSigner(currencies["arweave"].account.key);
}

export async function everpayVerify(pub, data, sig) {
  // TODO:
    return Arweave.crypto.verify(pub, data, sig);
}

export async function everpayGetCurrentHeight() {
    const everpay = await createEverpay();
    const txs = await everpay.txs({})
    return txs[0].timestamp
}

export async function everpayGetFee(amount, to) {
    return new BigNumber(0)
}

// TODO:
export async function everpaySendTx(tx) {
    return tx
}

export async function everpayCreateTx(amount, to, fee) {
  const key = currencies["everpay"].account.key;
  const everpay = await createEverpay({ account: currencies["everpay"].account.address, arJWK: key  });
  const tx = await everpay.transfer({ amount: amount.toString(), to: to, symbol: "AR" })
    return { txId: tx.everHash, tx };
}

export function everpayGetPublicKey() {
    return currencies["everpay"].account.key.n
}
