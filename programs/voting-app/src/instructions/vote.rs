use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate: String)]
pub struct Vote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll_account: Account<'info, PollAccount>,

    #[account(
        mut,
        seeds = [
            b"candidate",
            poll_id.to_le_bytes().as_ref(),
            candidate.as_ref()
        ],
        bump
    )]
    pub candidate_account: Account<'info, CandidateAccount>,
}

pub fn handler(ctx: Context<Vote>, _poll_id: u64, _candidate: String) -> Result<()> {
    let poll_account = &ctx.accounts.poll_account;
    let candidate_account = &mut ctx.accounts.candidate_account;

    let current_time = Clock::get()?.unix_timestamp;

    if current_time <= poll_account.poll_voting_start as i64 {
        return Err(ErrorCode::VotingNotStarted.into());
    }

    if current_time > poll_account.poll_voting_end as i64 {
        return Err(ErrorCode::VotingEnded.into());
    }

    candidate_account.candidate_votes += 1;

    Ok(())
}
