import * as web3 from "@solana/web3.js";
import { currencies, Tx } from "./index";
import SolanaSigner from "arbundles/build/signing/chains/SolanaSigner"
import "bs58";
import nacl from "tweetnacl";

import BigNumber from "bignumber.js";
import bs58 from "bs58";

async function createConnection() {
    return new web3.Connection(
        web3.clusterApiUrl(currencies["solana"].provider as web3.Cluster), "confirmed"
    );
}

function getKeyPair(): web3.Keypair {
    return web3.Keypair.fromSecretKey(bs58.decode(currencies["solana"].account.key));
}

// where data is tx.serialiseMessage() 
export async function solanaSign(data: any) {
    // const keyp = getKeyPair();
    // const keypb = Buffer.concat([keyp.publicKey.toBuffer(), keyp.secretKey])
    // const signer = new SolanaSigner(keypb.toString());
    return await (await solanaGetSigner()).sign(data)
}

export async function solanaVerify(pub, data, sig) {
    return SolanaSigner.verify(pub, data, sig)
}

// assuming "owner" is the pubkey
export function solanaOwnerToAddress(owner: Uint8Array): string {
    // const key = web3.Keypair.fromSecretKey(owner);
    // return key.publicKey.toBase58();
    return owner.toString();
}

export function solanaGetPublicKey(): Buffer {
    // derive from privkey to ensure it's correct.
    const key = web3.Keypair.fromSecretKey(bs58.decode(currencies["solana"].account.key));
    return Buffer.from(key.publicKey.toBase58())
}

export async function solanaGetCurrentHeight(): Promise<BigNumber> {
    const connection = await createConnection();
    return new BigNumber((await connection.getEpochInfo()).blockHeight)
}

//this function gives the fee for a *single* signature
export async function solanaGetFee(_amount: BigNumber | number, _to?: string): Promise<BigNumber> {
    const connection = await createConnection();
    const block = await connection.getRecentBlockhash();
    const feeCalc = await connection.getFeeCalculatorForBlockhash(block.blockhash);
    return new BigNumber(feeCalc.value.lamportsPerSignature);
}

export async function solanaSendTx(tx: web3.Transaction): Promise<any> {
    const connection = await createConnection();
    // if it's already been signed...
    if (tx.signature) {
        return web3.sendAndConfirmRawTransaction(connection, tx.serialize());
    }
    return web3.sendAndConfirmTransaction(connection, tx, [getKeyPair()]);
}

export async function solanaCreateTx(amount, to, _fee?): Promise<{ txId: string, tx: any }> {
    const connection = await createConnection();
    // TODO: figure out how to manually set fees?
    // TODO: figure out how to get the txId at creation time
    //const key = currencies["solana"].account.key;
    const keys = await getKeyPair();

    const transaction = new web3.Transaction({
        recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
        feePayer: keys.publicKey
    });

    transaction.add(web3.SystemProgram.transfer({
        fromPubkey: keys.publicKey,
        toPubkey: new web3.PublicKey(to),
        lamports: amount,
    }));

    const transactionBuffer = transaction.serializeMessage();
    const signature = nacl.sign.detached(transactionBuffer, keys.secretKey);
    transaction.addSignature(keys.publicKey, Buffer.from(signature));
    return { tx: transaction, txId: bs58.encode(signature) };

}

export async function solanaGetTx(txid: string): Promise<Tx> {
    const connection = await createConnection();
    const stx = await connection.getTransaction(txid, { commitment: "confirmed" });
    // why is this so convoluted ;-;
    const confirmed = !((await connection.getTransaction(txid)) === null)
    const amount = new BigNumber(stx.meta.postBalances[1]).minus(new BigNumber(stx.meta.preBalances[1]));
    const tx: Tx = {
        from: stx.transaction.message.accountKeys[0].toBase58(),
        to: stx.transaction.message.accountKeys[1].toBase58(),
        amount: amount,
        pending: false,
        confirmed
    }
    return tx;
}

export async function solanaGetSigner() {
    const keyp = getKeyPair();
    const keypb = Buffer.concat([keyp.publicKey.toBuffer(), keyp.secretKey])
    return new SolanaSigner(keypb.toString());
}