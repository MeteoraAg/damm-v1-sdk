import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import BN from "bn.js";
import { Wallet, AnchorProvider, Program } from '@coral-xyz/anchor';
import AmmImpl from '../amm';
import { Amm as AmmIdl } from '../amm/idl';
import AmmIDL from '../amm/idl.json';

const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const mockWallet = new Wallet(new Keypair());
const provider = new AnchorProvider(mainnetConnection, mockWallet, {
  commitment: 'confirmed',
});

async function swapQuote(poolAddress: PublicKey, swapAmount: BN, swapAtoB: boolean) {
  const ammProgram = new Program<AmmIdl>(AmmIDL as AmmIdl, provider);
  let poolState = await ammProgram.account.pool.fetch(poolAddress);
  const pool = await AmmImpl.create(provider.connection, poolAddress);
  let inTokenMint = swapAtoB ? poolState.tokenAMint : poolState.tokenBMint;
  let swapQuote = pool.getSwapQuote(inTokenMint, swapAmount, 100);
  console.log("🚀 ~ swapQuote:", swapQuote);
  console.log("SwapInAmount %s swapOutAmount %s", swapQuote.swapInAmount.toString(), swapQuote.swapOutAmount.toString());
}

async function main() {
  await swapQuote(new PublicKey(
    "5yuefgbJJpmFNK2iiYbLSpv1aZXq7F9AUKkZKErTYCvs"
  ), new BN(10_000_000_000), true);
}


main()