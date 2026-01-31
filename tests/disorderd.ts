import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Disorderd } from "../target/types/disorderd";
import * as fs from "fs";
import { BN } from "bn.js";

describe("disorderd", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Disorderd as Program<Disorderd>;

  it("my eye hurts", async () => {
    console.log("--- Test 1: Simulation ---");

    // FIX: Define variables inside the test scope
    const key = [new BN(0xDEADBEEF), new BN(0xCAFEBABE)];
    const iv = [new BN(0x11112222), new BN(0x33334444)];
    const plaintext = [new BN(100), new BN(200)];

    const tx = await program.methods
      .encryptSim(key, iv, plaintext)
      .accounts({})
      .rpc();

    console.log("Encryption Sig:", tx);
  });

  it("Verifies ", async () => {
    console.log("--- Test 2: ZK Verification ---");

    const proofPath = "proof.bin";
    
    if (!fs.existsSync(proofPath)) {
      console.log("kipping: proof.bin not found. Run Rust generator first.");
      return;
    }

    const proofBuffer = fs.readFileSync(proofPath);

    const tx = await program.methods
      .verifyProof(proofBuffer)
      .accounts({})
      // FIX: Request more Compute Units (Standard for ZK/Heavy compute)
      .preInstructions([
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 })
      ])
      .rpc();

    console.log("roof Verified! Signature:", tx);
  });
});
