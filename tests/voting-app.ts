import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingApp } from "../target/types/voting_app";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("voting-app", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.VotingApp as Program<VotingApp>;
  const provider = program.provider as anchor.AnchorProvider;

  let pollAccount: PublicKey;
  let candidate1Account: PublicKey;
  let candidate2Account: PublicKey;

  const pollId = new anchor.BN(1);
  const candidate1Name = "Alice";
  const candidate2Name = "Bob";

  before(async () => {
    // Derive PDAs
    [pollAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), pollId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [candidate1Account] = PublicKey.findProgramAddressSync(
      [pollId.toArrayLike(Buffer, "le", 8), Buffer.from(candidate1Name)],
      program.programId
    );

    [candidate2Account] = PublicKey.findProgramAddressSync(
      [pollId.toArrayLike(Buffer, "le", 8), Buffer.from(candidate2Name)],
      program.programId
    );
  });

  it("Initializes a poll", async () => {
    const start = new anchor.BN(0); // Unix timestamp, set to 0 for simplicity
    const end = new anchor.BN(2000000000); // Far future
    const name = "Test Poll";
    const description = "A test voting poll";

    await program.methods
      .initPoll(pollId, start, end, name, description)
      .accounts({
        pollAccount,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch the account and verify
    const pollData = await program.account.pollAccount.fetch(pollAccount);
    expect(pollData.pollName).to.equal(name);
    expect(pollData.pollDescription).to.equal(description);
    expect(pollData.pollVotingStart.toNumber()).to.equal(start.toNumber());
    expect(pollData.pollVotingEnd.toNumber()).to.equal(end.toNumber());
    expect(pollData.pollOptionIndex.toNumber()).to.equal(0);
  });

  it("Initializes candidates", async () => {
    // Add candidate 1
    await program.methods
      .initCandidate(pollId, candidate1Name)
      .accounts({
        pollAccount,
        candidateAccount: candidate1Account,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    let pollData = await program.account.pollAccount.fetch(pollAccount);
    expect(pollData.pollOptionIndex.toNumber()).to.equal(1);

    // Add candidate 2
    await program.methods
      .initCandidate(pollId, candidate2Name)
      .accounts({
        pollAccount,
        candidateAccount: candidate2Account,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    pollData = await program.account.pollAccount.fetch(pollAccount);
    expect(pollData.pollOptionIndex.toNumber()).to.equal(2);

    // Verify candidates
    const candidate1Data = await program.account.candidateAccount.fetch(candidate1Account);
    expect(candidate1Data.candidateName).to.equal(candidate1Name);
    expect(candidate1Data.candidateVotes.toNumber()).to.equal(0);

    const candidate2Data = await program.account.candidateAccount.fetch(candidate2Account);
    expect(candidate2Data.candidateName).to.equal(candidate2Name);
    expect(candidate2Data.candidateVotes.toNumber()).to.equal(0);
  });

  it("Votes for a candidate", async () => {
    await program.methods
      .vote(pollId, candidate1Name)
      .accounts({
        pollAccount,
        candidateAccount: candidate1Account,
        signer: provider.wallet.publicKey,
      })
      .rpc();

    const candidate1Data = await program.account.candidateAccount.fetch(candidate1Account);
    expect(candidate1Data.candidateVotes.toNumber()).to.equal(1);

    // Vote again
    await program.methods
      .vote(pollId, candidate1Name)
      .accounts({
        pollAccount,
        candidateAccount: candidate1Account,
        signer: provider.wallet.publicKey,
      })
      .rpc();

    const updatedCandidate1Data = await program.account.candidateAccount.fetch(candidate1Account);
    expect(updatedCandidate1Data.candidateVotes.toNumber()).to.equal(2);
  });

  it("Fails to vote before voting starts", async () => {
    // Create a new poll that hasn't started
    const futurePollId = new anchor.BN(2);
    const start = new anchor.BN(Date.now() / 1000 + 3600); // 1 hour from now
    const end = new anchor.BN(Date.now() / 1000 + 7200);
    const name = "Future Poll";
    const description = "A poll that hasn't started";

    const [futurePollAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), futurePollId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .initPoll(futurePollId, start, end, name, description)
      .accounts({
        pollAccount: futurePollAccount,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const [futureCandidateAccount] = PublicKey.findProgramAddressSync(
      [futurePollId.toArrayLike(Buffer, "le", 8), Buffer.from(candidate1Name)],
      program.programId
    );

    await program.methods
      .initCandidate(futurePollId, candidate1Name)
      .accounts({
        pollAccount: futurePollAccount,
        candidateAccount: futureCandidateAccount,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .vote(futurePollId, candidate1Name)
        .accounts({
          pollAccount: futurePollAccount,
          candidateAccount: futureCandidateAccount,
          signer: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected VotingNotStarted error");
    } catch (err) {
      expect(err.message).to.include("VotingNotStarted");
    }
  });

  it("Fails to vote after voting ends", async () => {
    // Create a poll that has ended
    const pastPollId = new anchor.BN(3);
    const start = new anchor.BN(0);
    const end = new anchor.BN(1); // Already ended
    const name = "Past Poll";
    const description = "A poll that has ended";

    const [pastPollAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), pastPollId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .initPoll(pastPollId, start, end, name, description)
      .accounts({
        pollAccount: pastPollAccount,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const [pastCandidateAccount] = PublicKey.findProgramAddressSync(
      [pastPollId.toArrayLike(Buffer, "le", 8), Buffer.from(candidate1Name)],
      program.programId
    );

    await program.methods
      .initCandidate(pastPollId, candidate1Name)
      .accounts({
        pollAccount: pastPollAccount,
        candidateAccount: pastCandidateAccount,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .vote(pastPollId, candidate1Name)
        .accounts({
          pollAccount: pastPollAccount,
          candidateAccount: pastCandidateAccount,
          signer: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected VotingEnded error");
    } catch (err) {
      expect(err.message).to.include("VotingEnded");
    }
  });
});
