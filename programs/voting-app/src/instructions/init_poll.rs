use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitPoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll_account: Account<'info, PollAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitPoll>,
    _poll_id: u64,
    start: u64,
    end: u64,
    name: String,
    description: String,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;

    poll.poll_description = description;
    poll.poll_name = name;
    poll.poll_voting_start = start;
    poll.poll_voting_end = end;

    Ok(())
}
