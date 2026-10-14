import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Wallet, AnchorProvider, Program } from '@coral-xyz/anchor';
import AmmImpl from '../amm';
import fs from 'fs';
import os from 'os';

function loadKeypairFromFile(filename: string): Keypair {
  const secret = JSON.parse(fs.readFileSync(filename.replace('~', os.homedir)).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}
const payerKP = loadKeypairFromFile('~/.config/solana/id.json');
const payerWallet = new Wallet(payerKP);
console.log('Wallet Address: %s \n', payerKP.publicKey);

const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const provider = new AnchorProvider(mainnetConnection, payerWallet, {
  commitment: 'confirmed',
});

async function getPoolInfo(poolAddress: PublicKey) {
  const pool = await AmmImpl.create(provider.connection, poolAddress);
  const poolInfo = pool.poolInfo;

  console.log('Pool Address: %s', poolAddress.toString());
  const poolTokenAddress = await pool.getPoolTokenMint();
  console.log('Pool LP Token Mint Address: %s', poolTokenAddress.toString());
  const LockedLpAmount = await pool.getLockedLpAmount();
  console.log('Locked Lp Amount: %s', LockedLpAmount.toNumber());
  const lpSupply = await pool.getLpSupply();
  console.log('Pool LP Supply: %s \n', lpSupply.toNumber() / Math.pow(10, pool.decimals));

  console.log(
    'tokenA %s Amount: %s ',
    pool.tokenAMint.address,
    poolInfo.tokenAAmount.toNumber() / Math.pow(10, pool.tokenAMint.decimals),
  );
  console.log(
    'tokenB %s Amount: %s',
    pool.tokenBMint.address,
    poolInfo.tokenBAmount.toNumber() / Math.pow(10, pool.tokenBMint.decimals),
  );
  console.log('virtualPrice: %s', poolInfo.virtualPrice);
  console.log('virtualPriceRaw to String: %s \n', poolInfo.virtualPriceRaw.toString());
}

async function main() {
  // mainnet-beta, SOL-USDC
  const poolAddress = '6SWtsTzXrurtVWZdEHvnQdE9oM8tTtyg8rfEo3b4nM93';
  await getPoolInfo(new PublicKey(poolAddress));
}

main();
