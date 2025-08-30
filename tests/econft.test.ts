import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface NFT {
  owner: string;
  metadata: string;
  royaltyRecipient: string;
  minted: boolean;
}

interface TokenUri {
  uri: string;
}

interface ContractState {
  owner: string;
  paused: boolean;
  lastTokenId: number;
  fundingDistributor: string;
  nfts: Map<number, NFT>;
  tokenUris: Map<number, TokenUri>;
}

class EcoNFTMock {
  private state: ContractState = {
    owner: "deployer",
    paused: false,
    lastTokenId: 0,
    fundingDistributor: "SP1XPG9QFX5M95G36SGN9R8YJ4KJ0JB7ZXNH892N6.funding-distributor",
    nfts: new Map(),
    tokenUris: new Map(),
  };

  private ERR_UNAUTHORIZED = 100;
  private ERR_PAUSED = 101;
  private ERR_INVALID_AMOUNT = 102;
  private ERR_INVALID_TOKEN_ID = 103;
  private ERR_ALREADY_MINTED = 104;
  private ERR_NOT_OWNER = 105;
  private ERR_INVALID_METADATA = 106;
  private ERR_INVALID_RECIPIENT = 107;
  private ROYALTY_PERCENTAGE = 500; // 5%
  private MAX_NFT_SUPPLY = 1000;

  // Mock transfer and contract-call functions
  private stxTransfer(amount: number, sender: string, recipient: string): ClarityResponse<boolean> {
    return { ok: true, value: true };
  }

  private initiateDistribution(amount: number, assetType: string): ClarityResponse<number> {
    return { ok: true, value: 1 };
  }

  getLastTokenId(): ClarityResponse<number> {
    return { ok: true, value: this.state.lastTokenId };
  }

  getTokenUri(tokenId: number): ClarityResponse<string | null> {
    const uri = this.state.tokenUris.get(tokenId);
    return { ok: true, value: uri ? uri.uri : null };
  }

  getOwner(tokenId: number): ClarityResponse<string | null> {
    const nft = this.state.nfts.get(tokenId);
    if (!nft) return { ok: false, value: this.ERR_INVALID_TOKEN_ID };
    return { ok: true, value: nft.owner };
  }

  transfer(tokenId: number, sender: string, recipient: string): ClarityResponse<boolean> {
    if (this.state.paused) return { ok: false, value: this.ERR_PAUSED };
    const nft = this.state.nfts.get(tokenId);
    if (!nft) return { ok: false, value: this.ERR_INVALID_TOKEN_ID };
    if (sender !== nft.owner) return { ok: false, value: this.ERR_NOT_OWNER };
    if (recipient === "SP000000000000000000002Q6VF78") return { ok: false, value: this.ERR_INVALID_RECIPIENT };

    nft.owner = recipient;
    this.state.nfts.set(tokenId, nft);
    return { ok: true, value: true };
  }

  mint(recipient: string, metadata: string, uri: string, price: number, caller: string): ClarityResponse<number> {
    if (caller !== this.state.owner) return { ok: false, value: this.ERR_UNAUTHORIZED };
    if (this.state.paused) return { ok: false, value: this.ERR_PAUSED };
    const tokenId = this.state.lastTokenId + 1;
    if (tokenId > this.MAX_NFT_SUPPLY) return { ok: false, value: this.ERR_INVALID_AMOUNT };
    if (metadata.length === 0) return { ok: false, value: this.ERR_INVALID_METADATA };
    if (recipient === "SP000000000000000000002Q6VF78") return { ok: false, value: this.ERR_INVALID_RECIPIENT };

    this.state.nfts.set(tokenId, {
      owner: recipient,
      metadata,
      royaltyRecipient: recipient,
      minted: true,
    });
    this.state.tokenUris.set(tokenId, { uri });
    this.state.lastTokenId = tokenId;

    this.stxTransfer(price, caller, "contract");
    this.initiateDistribution(price, "STX");
    return { ok: true, value: tokenId };
  }

  updateRoyaltyRecipient(tokenId: number, newRecipient: string, caller: string): ClarityResponse<boolean> {
    if (this.state.paused) return { ok: false, value: this.ERR_PAUSED };
    const nft = this.state.nfts.get(tokenId);
    if (!nft) return { ok: false, value: this.ERR_INVALID_TOKEN_ID };
    if (caller !== nft.owner) return { ok: false, value: this.ERR_UNAUTHORIZED };
    if (newRecipient === "SP000000000000000000002Q6VF78") return { ok: false, value: this.ERR_INVALID_RECIPIENT };

    nft.royaltyRecipient = newRecipient;
    this.state.nfts.set(tokenId, nft);
    return { ok: true, value: true };
  }

  payRoyalty(tokenId: number, salePrice: number, caller: string): ClarityResponse<boolean> {
    if (this.state.paused) return { ok: false, value: this.ERR_PAUSED };
    const nft = this.state.nfts.get(tokenId);
    if (!nft) return { ok: false, value: this.ERR_INVALID_TOKEN_ID };
    if (salePrice <= 0) return { ok: false, value: this.ERR_INVALID_AMOUNT };

    const royaltyAmount = Math.floor((salePrice * this.ROYALTY_PERCENTAGE) / 10000);
    this.stxTransfer(royaltyAmount, caller, nft.royaltyRecipient);
    this.initiateDistribution(salePrice - royaltyAmount, "STX");
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.owner) return { ok: false, value: this.ERR_UNAUTHORIZED };
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.owner) return { ok: false, value: this.ERR_UNAUTHORIZED };
    this.state.paused = false;
    return { ok: true, value: true };
  }

  setFundingDistributor(caller: string, newDistributor: string): ClarityResponse<boolean> {
    if (caller !== this.state.owner) return { ok: false, value: this.ERR_UNAUTHORIZED };
    this.state.fundingDistributor = newDistributor;
    return { ok: true, value: true };
  }

  getNftDetails(tokenId: number): ClarityResponse<NFT | null> {
    return { ok: true, value: this.state.nfts.get(tokenId) ?? null };
  }

  isContractPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  getFundingDistributor(): ClarityResponse<string> {
    return { ok: true, value: this.state.fundingDistributor };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  user1: "SP1XPG9QFX5M95G36SGN9R8YJ4KJ0JB7ZXNH892N6",
  user2: "SP2J6Y09JMFWWZCT4VJX0BA5W7DHM9M7B9TJZV3FE",
  invalidRecipient: "SP000000000000000000002Q6VF78",
};

describe("EcoNFT Contract", () => {
  let contract: EcoNFTMock;

  beforeEach(() => {
    contract = new EcoNFTMock();
    vi.resetAllMocks();
  });

  it("should mint a new NFT", () => {
    const mintResult = contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    expect(mintResult).toEqual({ ok: true, value: 1 });

    const details = contract.getNftDetails(1);
    expect(details).toEqual({
      ok: true,
      value: expect.objectContaining({
        owner: accounts.user1,
        metadata: "Amazon Reforestation",
        royaltyRecipient: accounts.user1,
        minted: true,
      }),
    });

    const uri = contract.getTokenUri(1);
    expect(uri).toEqual({ ok: true, value: "https://example.com/nft/1" });

    const lastId = contract.getLastTokenId();
    expect(lastId).toEqual({ ok: true, value: 1 });
  });

  it("should prevent non-owner from minting", () => {
    const mintResult = contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.user1);
    expect(mintResult).toEqual({ ok: false, value: 100 });
  });

  it("should prevent minting when paused", () => {
    contract.pauseContract(accounts.deployer);
    const mintResult = contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    expect(mintResult).toEqual({ ok: false, value: 101 });
  });

  it("should prevent minting with invalid metadata", () => {
    const mintResult = contract.mint(accounts.user1, "", "https://example.com/nft/1", 1000, accounts.deployer);
    expect(mintResult).toEqual({ ok: false, value: 106 });
  });

  it("should prevent minting to invalid recipient", () => {
    const mintResult = contract.mint(accounts.invalidRecipient, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    expect(mintResult).toEqual({ ok: false, value: 107 });
  });

  it("should transfer NFT", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const transferResult = contract.transfer(1, accounts.user1, accounts.user2);
    expect(transferResult).toEqual({ ok: true, value: true });

    const owner = contract.getOwner(1);
    expect(owner).toEqual({ ok: true, value: accounts.user2 });
  });

  it("should prevent transfer by non-owner", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const transferResult = contract.transfer(1, accounts.user2, accounts.user2);
    expect(transferResult).toEqual({ ok: false, value: 105 });
  });

  it("should prevent transfer to invalid recipient", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const transferResult = contract.transfer(1, accounts.user1, accounts.invalidRecipient);
    expect(transferResult).toEqual({ ok: false, value: 107 });
  });

  it("should update royalty recipient", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const updateResult = contract.updateRoyaltyRecipient(1, accounts.user2, accounts.user1);
    expect(updateResult).toEqual({ ok: true, value: true });

    const details = contract.getNftDetails(1);
    expect(details.value?.royaltyRecipient).toBe(accounts.user2);
  });

  it("should prevent non-owner from updating royalty recipient", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const updateResult = contract.updateRoyaltyRecipient(1, accounts.user2, accounts.user2);
    expect(updateResult).toEqual({ ok: false, value: 100 });
  });

  it("should pay royalty on secondary sale", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const salePrice = 10000;
    const royaltyResult = contract.payRoyalty(1, salePrice, accounts.user2);
    expect(royaltyResult).toEqual({ ok: true, value: true });

    const details = contract.getNftDetails(1);
    expect(details.value?.royaltyRecipient).toBe(accounts.user1);
  });

  it("should prevent royalty payment with zero sale price", () => {
    contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    const royaltyResult = contract.payRoyalty(1, 0, accounts.user2);
    expect(royaltyResult).toEqual({ ok: false, value: 102 });
  });

  it("should pause and unpause contract", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: true });

    const mintDuringPause = contract.mint(accounts.user1, "Amazon Reforestation", "https://example.com/nft/1", 1000, accounts.deployer);
    expect(mintDuringPause).toEqual({ ok: false, value: 101 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: false });
  });

  it("should allow owner to set new funding distributor", () => {
    const newDistributor = "SP4XPG9QFX5M95G36SGN9R8YJ4KJ0JB7ZXNH892N6.new-distributor";
    const setResult = contract.setFundingDistributor(accounts.deployer, newDistributor);
    expect(setResult).toEqual({ ok: true, value: true });
    expect(contract.getFundingDistributor()).toEqual({ ok: true, value: newDistributor });
  });

  it("should prevent non-owner from setting funding distributor", () => {
    const setResult = contract.setFundingDistributor(accounts.user1, "SP4XPG9QFX5M95G36SGN9R8YJ4KJ0JB7ZXNH892N6.new-distributor");
    expect(setResult).toEqual({ ok: false, value: 100 });
  });
});