use anchor_lang::prelude::*;

declare_id!("AbuZJBTkpUggSsX7ttWngEdiYBCVHY4fzz9BDdSA7RYe");

#[program]
pub mod voting_app {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    #[max_len(32)]
    pub poll_name: String,
    #[max_len(280)]
    pub poll_description: String,
}
