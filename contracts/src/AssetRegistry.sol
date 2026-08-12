// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AssetRegistry
/// @notice On-chain passport for a real-world asset (BOTRAIL: construction
/// equipment vertical). Holds the asset's current verification status and
/// an append-only history of AI-produced evidence verdicts anchored by
/// hash. The registry never stores raw evidence or AI output text on
/// chain — only a hash of the evidence and a short machine verdict label.
///
/// Design boundary: this contract, and SettlementEscrow which reads it,
/// are the only things that can change an asset's on-chain status. The AI
/// layer (off-chain) only ever *proposes* a verdict; the `attester`
/// address below is the sole account allowed to write it on-chain, and it
/// is expected to be a backend service wallet that submits exactly what
/// the deterministic condition engine decided — never a raw LLM output.
contract AssetRegistry {
    enum Status {
        ACTIVE,
        RESTRICTED
    }

    struct Asset {
        address owner;
        string metadataURI; // off-chain pointer describing the asset (app URL, IPFS URI, etc.)
        Status status;
        uint64 registeredAt;
        uint32 evidenceCount;
    }

    struct EvidenceRecord {
        bytes32 evidenceHash; // sha256 of the raw evidence file(s) evaluated
        string verdict; // short machine label, e.g. "insurance_expired"
        Status newStatus;
        uint64 timestamp;
    }

    /// @notice Backend service wallet allowed to register assets and record evidence.
    address public attester;
    /// @notice Contract admin, can rotate the attester.
    address public owner;

    uint256 public nextAssetId = 1;
    mapping(uint256 => Asset) public assets;
    mapping(uint256 => EvidenceRecord[]) private evidenceHistory;

    event AssetRegistered(uint256 indexed assetId, address indexed assetOwner, string metadataURI);
    event EvidenceRecorded(
        uint256 indexed assetId, bytes32 evidenceHash, string verdict, Status newStatus, uint64 timestamp
    );
    event AttesterUpdated(address indexed oldAttester, address indexed newAttester);

    error NotOwner();
    error NotAttester();
    error AssetDoesNotExist();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAttester() {
        if (msg.sender != attester) revert NotAttester();
        _;
    }

    modifier assetExists(uint256 assetId) {
        if (assets[assetId].registeredAt == 0) revert AssetDoesNotExist();
        _;
    }

    constructor(address _attester) {
        owner = msg.sender;
        attester = _attester;
    }

    function setAttester(address newAttester) external onlyOwner {
        emit AttesterUpdated(attester, newAttester);
        attester = newAttester;
    }

    /// @notice Registers a new asset, starting in ACTIVE status.
    /// Called by the backend on behalf of the asset owner after the
    /// initial document set (ownership, insurance, inspection, photo)
    /// has been AI-verified.
    function registerAsset(address assetOwner, string calldata metadataURI)
        external
        onlyAttester
        returns (uint256 assetId)
    {
        assetId = nextAssetId++;
        assets[assetId] = Asset({
            owner: assetOwner,
            metadataURI: metadataURI,
            status: Status.ACTIVE,
            registeredAt: uint64(block.timestamp),
            evidenceCount: 0
        });
        emit AssetRegistered(assetId, assetOwner, metadataURI);
    }

    /// @notice Anchors a new piece of evidence and updates asset status
    /// accordingly. This is called for every AI evaluation, not just ones
    /// tied to a payment — e.g. an insurance document expiring updates
    /// status here even with no agreement in flight.
    function recordEvidence(uint256 assetId, bytes32 evidenceHash, string calldata verdict, Status newStatus)
        external
        onlyAttester
        assetExists(assetId)
    {
        Asset storage a = assets[assetId];
        a.status = newStatus;
        a.evidenceCount += 1;
        evidenceHistory[assetId].push(
            EvidenceRecord({
                evidenceHash: evidenceHash,
                verdict: verdict,
                newStatus: newStatus,
                timestamp: uint64(block.timestamp)
            })
        );
        emit EvidenceRecorded(assetId, evidenceHash, verdict, newStatus, uint64(block.timestamp));
    }

    function getStatus(uint256 assetId) external view assetExists(assetId) returns (Status) {
        return assets[assetId].status;
    }

    function getEvidenceHistory(uint256 assetId) external view returns (EvidenceRecord[] memory) {
        return evidenceHistory[assetId];
    }

    /// @notice Convenience check used by SettlementEscrow: true only if
    /// the asset exists and its current status is ACTIVE.
    function isActive(uint256 assetId) external view returns (bool) {
        return assets[assetId].registeredAt != 0 && assets[assetId].status == Status.ACTIVE;
    }
}
