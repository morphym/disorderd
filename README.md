**ZK-DISORDER: On-Chain Verifiable Hyperchaotic Encryption**

This repo only contain information on the chain impl of zk-disorder on solana, docs, 

everything else including intensive information; performance; mathematical construction, secruity; quantum resistance.

can be known from

**Primary Source Repository**  
Implementation, cryptographic specifications, and security analysis  
https://github.com/morphym/zk-disorder

or a complete information you can read; 
<br/>
**Academic Documentation**  
Complete mathematical formalization, security proofs, and comparative analysis:  
https://pawit.co/whitepapes/zk-disorder.pdf

**

---

**Attested Performance Metrics**

ZK-Disorder:
| Property                    | zK-Disorder                                    | Groth16                 | PLONK                   | STARKs                 |
| --------------------------- | ---------------------------------------------- | ----------------------- | ----------------------- | ---------------------- |
| **Encryption Cost**         | **3,316 CU** (Verified)                    | N/A                     | N/A                     | N/A                    |
| **Verification Cost**       | **239,234 CU** (Verified)                  | ~50,000 CU              | ~25,000 CU              | >200,000 CU            |
| **Order of Magnitude**      | **10³ (Enc) / 10⁵ (Ver)**                      | 10⁴ CU                  | 10⁴ CU                  | 10⁵ CU                 |
| **Trusted Setup**           | No                                             | Yes (per-circuit)       | Yes (universal)         | No                     |
| **Proof Size**              | 968 bytes                                      | 192 bytes               | ~400 bytes              | ~50 KB                 |
| **Quantum Resistance**      | **Practical (NISQ)**                           | None (EC broken)        | None (EC broken)        | Hash-based             |
| **Native Solana**           | **Yes (u64 ALU)**                              | No (bn256 imports)      | No (FFT/pairings)       | No (heavy hash chains) |
| **Cryptographic Primitive** | Hyperchaotic Lattice                           | Elliptic Curve Pairings | Elliptic Curve Pairings | Merkle Trees + FRI     |

 Solana Devnet, Encryption (`EncryptSim`): 3,316 CU consumed. [Explorer](https://explorer.solana.com/tx/2mmQsU9JtY4UV95sj8JFmtauWqNfEd43L21CqLoazgXXcxmQGmsqqFNn9tCWnv8mbLbnDd5mVys8VGLBRJKR4frP?cluster=devnet#ix-1)
 
 <br/>
 
 
 Solana Devnet, Proof Verification (`VerifyProof`): 239,234 CU consumed. [Explorer](https://explorer.solana.com/tx/4cAFKBLee4MxMUGLCzp4w2sSXse5x2foQy98Rb87u6LiZt9fwG1A1fhKsgZy145UZxNefHguQUN2w7LrZVmXZ5AC?cluster=devnet#ix-2)


**Setup & Verification**


All performance and security assertions are reproducible.

To verify or deploy this anchor program

update program address, set your local cluster.

```
anchor keys sync ## sync keys first

anchor build # build

anchor deploy # deploy to the chain, cost 1.39 SOL (prefer devnet for testing)

anchor test --skip-deploy # it needs proof.bin, a demo proof is already present at root
```

exmple: on the solana devnet

```
$ anchor test --skip-deploy
disorderd
--- Test 1: Encryption Simulation ---
Encryption Sig: 2mmQsU9JtY4UV95sj8JFmtauWqNfEd43L21CqLoazgXXcxmQGmsqqFNn9tCWnv8mbLbnDd5mVys8VGLBRJKR4frP
  ✔ Executes On-Chain Encryption (1695ms)
--- Test 2: Verification ---
ZK-disorder Proof Verified! Signature: 4cAFKBLee4MxMUGLCzp4w2sSXse5x2foQy98Rb87u6LiZt9fwG1A1fhKsgZy145UZxNefHguQUN2w7LrZVmXZ5AC
  ✔ VerifiesTrace On-Chain (1551ms)
--- Test 3: Round-Trip ---
Captured Ciphertext: [ '286336795', '858997870' ]
Recovered Plaintext: [ '1337', '42' ]
Success: Hyperchaotic Round-Trip matches perfectly.
  ✔ Symmetric Round-Trip: Encrypt -> Decrypt (1016ms)


3 passing (4s)

Done in 4.91s.

```
There are many way to generate proof, also to verify,

Read docs on proof generation & verification here:

[proof-doc](https://github.com/morphym/disorderd/blob/main/docs/proof-doc.md)

better integration depend on your case, we used a file here to avoid a heavy code to transfer proof
or encoding proof inside `tests/disorderd.ts`.

For proofs generation & docs, check zk-disorder github repo;

This anchor project repo just only import zk-disorder then use it, it contain nothing more than it. as zk-disorder provide all verification and proof generations.

`lib.rs -> code size is only 67 lines literally`

so you can also easily create your own custom anchor program.

[zK-disorder](https://github.com/morphym/zk-disorder/)



check github repos for more information.

https://github.com/morphym/fract

https://github.com/morphym/zk-disorder/


---


The whitepaper provides complete mathematical derivations of Lyapunov spectra, Jacobian non-invertibility proofs establishing classical security margins exceeding $2^{192}$ operations, and formal analysis of quantum oracle decoherence under Grover amplitude amplification.



**References**

*   **FRACT Library**: The underlying hyperchaotic primitive.
*   Whitepaper: [FRACT: A Hyperchaotic, Quantum-Resistant Hash](https://pawit.co/whitepapers/fract)
*   **ZK-disorder**: [Whitepaper](https://pawit.co/whitepapers/zk-disorder.pdf)

* grokipedia page on *FRACT*: [Grokipedia](https://grokipedia.com/page/Fract_cryptographic_hash_function
)
