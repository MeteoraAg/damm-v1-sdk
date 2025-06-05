import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import BN from "bn.js";
import { Wallet, AnchorProvider, Program } from '@coral-xyz/anchor';
import AmmImpl from '../amm';
import { Amm as AmmIdl, IDL as AmmIDL } from '../amm/idl';
import { DEFAULT_SLIPPAGE, PROGRAM_ID } from "../amm/constants";

const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const mockWallet = new Wallet(new Keypair());
const provider = new AnchorProvider(mainnetConnection, mockWallet, {
  commitment: 'confirmed',
});
const METAV_SOL_POOL = 'EH8xLzfq2YARgQC846NWP6EfRK9gfcjDJMxcHhxFLruv'

async function swapIn(poolAddress: PublicKey, receiveAmount: BN, swapAtoB: boolean) {
  const ammProgram = new Program<AmmIdl>(AmmIDL, PROGRAM_ID, provider);
  const poolState = await ammProgram.account.pool.fetch(poolAddress);
  const pool = await AmmImpl.create(provider.connection, poolAddress);
  const [inTokenMint, outToken] = swapAtoB
      ? [poolState.tokenAMint, poolState.tokenBMint]
      : [poolState.tokenBMint, poolState.tokenAMint];
  const swap = pool.getSwapBase(outToken, receiveAmount, DEFAULT_SLIPPAGE);
  console.log("🚀 ~ swapBase:", swap);
  console.log("Give %s %s", swap.swapInAmount.toString(), inTokenMint.toString());
  console.log("Receive at least %s %s", swap.minSwapOutAmount.toString(), outToken.toString());
}

async function main() {
  // Give METAV to receive 1 SOL
  await swapIn(new PublicKey(
    METAV_SOL_POOL
  ), new BN(1_000_000_000), true);
}


main()
