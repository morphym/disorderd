**Proof Generation & Transport Documentation: ZK-Disorder**

**Overview**

`tests/disorderd.ts`

The reference test suite utilizes `proof.bin` as a serialization convenience for local development. In production deployments, proofs are generated in-memory, transmitted over network sockets, or passed directly via Cross-Program Invocation (CPI) without ever touching the filesystem. This document specifies the API surfaces and transport patterns for programmatic proof handling.

---


**Core API Surface**

The public API exposes exactly three operations: generation, verification, and serialization. All Merkle tree logic (`build_full_tree`, `generate_merkle_path`, `compute_merkle_root`, `derive_indices`) is internal and not exposed publicly.

```rust
use zk_disorder::{FractCipher, ZKProof, StateSnapshot};
use borsh::{to_vec, from_slice};

// Generation - Returns full proof structure
let proof = ZKProof::prove(key: [u64; 2], iv: [u64; 2]);

// Verification - Returns bool
let is_valid: bool = proof.verify();

// Serialization (for transport)
let bytes: Vec<u8> = to_vec(&proof).unwrap();
let recovered: ZKProof = from_slice(&bytes).unwrap();
```

**Proof Structure Reference**

```rust
pub struct ZKProof {
    pub merkle_root: [u8; 32],                                    // 32 bytes
    pub revealed_steps: Vec<(u32, StateSnapshot, StateSnapshot)>, // ~4 × (4 + 32 + 32) bytes
    pub merkle_proofs: Vec<Vec<[u8; 32]>>,                       // ~4 × 5 × 32 bytes (depth 5)
}

pub struct StateSnapshot {
    pub s: [u64; 4], // [rate_0, rate_1, capacity_0, capacity_1]
}
```


Total serialized size: **968 bytes** (with default 4 revealed steps).

---

**Transport Pattern 1: In-Memory Passing (No File I/O)**

Replace `proof.bin` w direct buffer handling:

```rust
// Generator (Client-side)
fn create_proof_buffer(key: [u64; 2], iv: [u64; 2]) -> Vec<u8> {
    let proof = ZKProof::prove(key, iv);
    to_vec(&proof).expect("serialize")
}

// Verifier (On-chain program or service)
fn verify_from_buffer(buf: &[u8]) -> bool {
    match from_slice::<ZKProof>(buf) {
        Ok(proof) => proof.verify(),
        Err(_) => false,
    }
}
```

**TypeScript/Anchor Integration** (replacing `fs.readFileSync`):

```typescript
import { BN } from "bn.js";
import * as borsh from "@project-serum/borsh";

// Define Borsh schema matching Rust struct
const stateSnapshotSchema = borsh.struct([
  borsh.array(borsh.u64(), 4, "s")
]);

const proofSchema = borsh.struct([
  borsh.array(borsh.u8(), 32, "merkle_root"),
  borsh.vec(
    borsh.tuple([
      borsh.u32(),
      stateSnapshotSchema,
      stateSnapshotSchema
    ]), 
    "revealed_steps"
  ),
  borsh.vec(borsh.array(borsh.u8(), 32), "merkle_proofs")
]);

// Generate client-side (requires Rust WASM binding or external service)
async function generateProof(key: BN[], iv: BN[]): Promise<Buffer> {
  // If using WASM: return wasm.generate_proof(key, iv);
  // If using HTTP API:
  const res = await fetch('/prove', {
    method: 'POST',
    body: JSON.stringify({ key, iv })
  });
  return Buffer.from(await res.arrayBuffer());
}

// Direct verification without filesystem
const proofBuffer = await generateProof(key, iv);
const tx = await program.methods
  .verifyProof(proofBuffer)
  .preInstructions([
    anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 })
  ])
  .rpc();
```

---

**Transport Pattern 2: TCP Stream (Raw Bytes)**

```rust
use std::io::{Write, Read};
use std::net::TcpStream;

// Sender
fn send_proof(stream: &mut TcpStream, key: [u64; 2], iv: [u64; 2]) {
    let proof = ZKProof::prove(key, iv);
    let bytes = to_vec(&proof).unwrap();
    
    // Length-prefixed: [4 bytes LE length][968 bytes payload]
    stream.write_all(&(bytes.len() as u32).to_le_bytes()).unwrap();
    stream.write_all(&bytes).unwrap();
}

// Receiver  
fn receive_proof(stream: &mut TcpStream) -> Option<ZKProof> {
    let mut len_buf = [0u8; 4];
    stream.read_exact(&mut len_buf).ok()?;
    let len = u32::from_le_bytes(len_buf) as usize;
    
    let mut buf = vec![0u8; len];
    stream.read_exact(&mut buf).ok()?;
    
    from_slice(&buf).ok()
}
```

---

**Transport Pattern 3: HTTP/REST (Base64 Encoded)**

For JSON-safe transport:

```rust
// Server (Axum/Actix example)
async fn prove_handler(Json(req): Json<ProveRequest>) -> impl IntoResponse {
    let key = [req.key[0], req.key[1]];
    let iv = [req.iv[0], req.iv[1]];
    
    let proof = ZKProof::prove(key, iv);
    let bytes = to_vec(&proof).unwrap();
    
    Json(json!({
        "proof_b64": base64::encode(&bytes),
        "merkle_root": hex::encode(&proof.merkle_root)
    }))
}
```

```typescript
// Client
const response = await fetch('/prove', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    key: ["0xdeadbeef", "0xcafebabe"],
    iv: ["0x1111", "0x2222"]
  })
});

const { proof_b64 } = await response.json();
const proofBuffer = Buffer.from(proof_b64, 'base64');

// Submit to Solana
await program.methods.verifyProof(proofBuffer).accounts({}).rpc();
```

---

**Transport Pattern 4: WebSocket (Real-time)**

```javascript
const ws = new WebSocket('wss://prover.node');

ws.onopen = () => {
  ws.send(JSON.stringify({
    op: 'prove',
    key: [3735928559, 3405691582], // 0xdeadbeef, 0xcafebabe as decimals
    iv: [4369, 8738]
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // msg.proof is base64 encoded Borsh bytes
  const proofBytes = Buffer.from(msg.proof, 'base64');
  
  // Immediate on-chain submission
  program.methods.verifyProof(proofBytes).rpc().then(console.log);
};
```

---

**Transport Pattern 5: Cross-Program Invocation (CPI)**

When ZK-Disorder is invoked by another Solana program:

```rust
// Calling program (e.g., confidential token)
use anchor_lang::prelude::*;
use zk_disorder::ZKProof;
use borsh::from_slice;

#[derive(Accounts)]
pub struct ConfidentialTransfer<'info> {
    /// CHECK: ZK-Disorder program
    pub zk_program: AccountInfo<'info>,
}

pub fn handler(ctx: Context<ConfidentialTransfer>, proof_data: Vec<u8>) -> Result<()> {
    // Deserialize proof from instruction data
    let proof: ZKProof = from_slice(&proof_data)
        .map_err(|_| ErrorCode::InvalidProof)?;
    
    // Verify locally (no CPI needed if library linked)
    if !proof.verify() {
        return Err(ErrorCode::ProofRejected.into());
    }
    
    // Or invoke via CPI to dedicated verification program:
    let cpi_accounts = VerifyProof {
        signer: ctx.accounts.signer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.zk_program.to_account_info(), cpi_accounts);
    zk_disorder::cpi::verify_proof(cpi_ctx, proof_data)?;
    
    Ok(())
}
```

---

**Field Access for Debugging**

If you need to inspect proof components before transmission:

```rust
let proof = ZKProof::prove(key, iv);

println!("Root: {:?}", hex::encode(proof.merkle_root));
println!("Revealed {} transitions:", proof.revealed_steps.len());

for (idx, (step, pre, post)) in proof.revealed_steps.iter().enumerate() {
    println!("  Step {}: State {} -> {}", idx, step, step + 1);
    println!("    Pre:  {:?}", pre.s);
    println!("    Post: {:?}", post.s);
}

println!("Merkle paths depth: {} per step", proof.merkle_proofs[0].len());
```
