use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate: String)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll_account: Account<'info, PollAccount>,

    #[account(
        init,
        payer = signer,
        space = 8 + CandidateAccount::INIT_SPACE,
        seeds = [
            b"candidate",
            poll_id.to_le_bytes().as_ref(),
            candidate.as_ref()
        ],
        bump
    )]
    pub candidate_account: Account<'info, CandidateAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeCandidate>, _poll_id: u64, candidate: String) -> Result<()> {
    let candidate_account = &mut ctx.accounts.candidate_account;
    let poll_account = &mut ctx.accounts.poll_account;

    candidate_account.candidate_name = candidate;
    candidate_account.candidate_votes = 0;

    poll_account.poll_option_index += 1;

    Ok(())
}
