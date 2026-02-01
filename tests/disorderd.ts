import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Disorderd } from "../target/types/disorderd";
import * as fs from "fs";
import { BN } from "bn.js";

describe("disorderd", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Disorderd as Program<Disorderd>;

  it("Executes On-Chain Encryption", async () => {
    console.log("--- Test 1: Encryption Simulation ---");

    const key = [new BN(0xdeadbeef), new BN(0xcafebabe)];
    const iv = [new BN(0x11112222), new BN(0x33334444)];
    const plaintext = [new BN(100), new BN(200)];

    const tx = await program.methods
      .encryptSim(key, iv, plaintext)
      .accounts({})
      .rpc();

    console.log("Encryption Sig:", tx);
  });

  it("VerifiesTrace On-Chain", async () => {
    console.log("--- Test 2: Verification ---");

    const proofPath = "proof.bin";
    if (!fs.existsSync(proofPath)) {
      console.log("Skipping: proof.bin not found. Run Rust generator first.");
      return;
    }

    const proofBuffer = fs.readFileSync(proofPath);

    const tx = await program.methods
      .verifyProof(proofBuffer)
      .accounts({})
      .preInstructions([
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
      ])
      .rpc();

    console.log("ZK-disorder Proof Verified! Signature:", tx);
  });

  it("Symmetric Round-Trip: Encrypt -> Decrypt", async () => {
    console.log("--- Test 3: Round-Trip ---");

    const key = [new BN(0xdeadbeef), new BN(0xcafebabe)];
    const iv = [new BN(0x11112222), new BN(0x33334444)];
    const originalPlaintext = [new BN(1337), new BN(42)];

    // 1. Encrypt via View (Simulates and extracts return value directly)
    const ciphertext = await program.methods
      .encryptSim(key, iv, originalPlaintext)
      .view();

    // Check if ciphertext is an array (it should be [BN, BN])
    // Note: .view() returns the data directly, not wrapped in an object
    const cipherArr = ciphertext as [BN, BN];
    console.log(
      "Captured Ciphertext:",
      cipherArr.map((c) => c.toString())
    );

    // 2. Decrypt via View using the captured ciphertext
    const recoveredPlaintext = await program.methods
      .decryptSim(key, iv, cipherArr)
      .view();

    const recoveredArr = recoveredPlaintext as [BN, BN];
    console.log(
      "Recovered Plaintext:",
      recoveredArr.map((p) => p.toString())
    );

    // 3. Validation
    const isMatch =
      recoveredArr[0].eq(originalPlaintext[0]) &&
      recoveredArr[1].eq(originalPlaintext[1]);

    if (isMatch) {
      console.log("Success: Hyperchaotic Round-Trip matches perfectly.");
    } else {
      throw new Error(" Failure: Plaintext mismatch in chaos reconstruction.");
    }
  });
});
