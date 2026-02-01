use anchor_lang::prelude::*;
use zk_disorder::{FractCipher, ZKProof}; // The compiled crate

use :borsh::from_slice;

declare_id!("EobLVFgiqRPhvpV2jmNAxV17bjmaFXkEC7BSWNAAiob7");

#[program]
pub mod disorderd {
    use super::*;

    // --- 1. Global Verification API ---
    // Verifies a Hyperchaotic Cut-and-Choose Trace.
    // Can be called via CPI by other programs to gate-keep actions.
    pub fn verify_proof(_ctx: Context<Access>, proof_data: Vec<u8>) -> Result<()> {
        // A. Deserialize (Borsh)
        let proof: ZKProof = from_slice(&proof_data).map_err(|_| ErrorCode::InvalidData)?;

        // B. Verify (Calls the library)
        let is_valid = proof.verify();

        require!(is_valid, ErrorCode::ChaosVerificationFailed);

        msg!(
            "Nyxanic: zk-Disorder Proof Valid. Root: {:?}",
            proof.merkle_root
        );
        Ok(())
    }

    // --- 2. Global Encryption API (Simulation) ---
    // Deterministically runs the Hyperchaotic Sponge on-chain.
    // Useful for verifying state transitions or committing to ciphertexts via CPI.
    pub fn encrypt_sim(
        _ctx: Context<Access>,
        key: [u64; 2],
        iv: [u64; 2],
        plaintext: [u64; 2],
    ) -> Result<[u64; 2]> {
        // Initialize Sponge from Crate
        let mut cipher = FractCipher::new(key, iv);

        // Execute Chaos
        let ciphertext = cipher.encrypt(plaintext);

        msg!("Nyxanic: Disorder Encrypted Output :: {:?}", ciphertext);
        Ok(ciphertext)
    }

    pub fn decrypt_sim(
        _ctx: Context<Access>,
        key: [u64; 2],
        iv: [u64; 2],
        ciphertext: [u64; 2],
    ) -> Result<[u64; 2]> {
        let mut cipher = FractCipher::new(key, iv);
        let plaintext = cipher.decrypt(ciphertext);

        msg!("Disorder: Decrypted Output :: {:?}", plaintext);
        Ok(plaintext)
    }
}

// --- Contexts & Errors ---

#[derive(Accounts)]
pub struct Access {}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided data could not be deserialized.")]
    InvalidData,
    #[msg("Nyxanic: Hyperchaotic trace verification failed, ZK-Disorder proof is invalid.")]
    ChaosVerificationFailed,
}
