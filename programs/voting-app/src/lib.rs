use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

pub use instructions::*;

declare_id!("AbuZJBTkpUggSsX7ttWngEdiYBCVHY4fzz9BDdSA7RYe");

#[program]
pub mod voting_app {
    use super::*;

    pub fn init_poll(
        ctx: Context<InitPoll>,
        poll_id: u64,
        start: u64,
        end: u64,
        name: String,
        description: String,
    ) -> Result<()> {
        init_poll::handler(ctx, poll_id, start, end, name, description)
    }

    pub fn init_candidate(
        ctx: Context<InitializeCandidate>,
        poll_id: u64,
        candidate: String,
    ) -> Result<()> {
        init_candidate::handler(ctx, poll_id, candidate)
    }

    pub fn vote(ctx: Context<Vote>, poll_id: u64, candidate: String) -> Result<()> {
        vote::handler(ctx, poll_id, candidate)
    }
}
