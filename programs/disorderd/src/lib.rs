use anchor_lang::prelude::*;

declare_id!("6DuNTwcRS1qdR1Y5TsfAkcXqYZWTPiUBQjDNAqyuYxUE");

#[program]
pub mod disorderd {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("achutya kesvam", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
