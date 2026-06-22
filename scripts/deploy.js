import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting deployment to Avalanche Fuji...");

  const Registry = await hre.ethers.getContractFactory("ERC8004Registry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ ERC8004Registry deployed to: ${registryAddress}`);

  const PaymentProcessor = await hre.ethers.getContractFactory("X402PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy();
  await paymentProcessor.waitForDeployment();
  const paymentAddress = await paymentProcessor.getAddress();
  console.log(`✅ X402PaymentProcessor deployed to: ${paymentAddress}`);

  const envPath = path.join(__dirname, "../backend/.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  
  envContent = envContent.replace(
    /ERC8004_REGISTRY_ADDRESS=.*/,
    `ERC8004_REGISTRY_ADDRESS=${registryAddress}`
  );
  envContent = envContent.replace(
    /X402_PAYMENT_PROCESSOR_ADDRESS=.*/,
    `X402_PAYMENT_PROCESSOR_ADDRESS=${paymentAddress}`
  );

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Updated backend/.env with new contract addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
