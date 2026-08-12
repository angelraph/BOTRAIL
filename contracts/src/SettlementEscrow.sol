// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetRegistry} from "./AssetRegistry.sol";

/// @title SettlementEscrow
/// @notice Holds a payer's funds for a rental/service agreement tied to an
/// AssetRegistry asset, and releases them only when both are true:
///   1. the attester attests that the agreement's conditions were met
///      (an AI-produced verdict, run through a deterministic condition
///      engine off-chain), and
///   2. the linked asset is currently ACTIVE in AssetRegistry.
///
/// This is the "Prove before you pay" enforcement point. The AI never
/// calls this contract and never holds funds — it only ever feeds a
/// boolean into `attemptRelease` via the attester wallet. If an asset's
/// status was flipped to RESTRICTED (e.g. an expired insurance document
/// was evaluated) between agreement creation and a release attempt, the
/// release is refused here, on-chain, regardless of what the conditions
/// check says.
contract SettlementEscrow {
    enum AgreementStatus {
        FUNDED,
        RELEASED,
        REFUNDED
    }

    struct Agreement {
        uint256 assetId;
        address payer;
        address payable payee;
        uint256 amount;
        bytes32 conditionsHash; // hash of the human-readable condition set for this agreement
        AgreementStatus status;
        uint64 createdAt;
    }

    AssetRegistry public immutable registry;
    address public attester;
    address public owner;

    uint256 public nextAgreementId = 1;
    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed assetId,
        address payer,
        address payee,
        uint256 amount,
        bytes32 conditionsHash
    );
    event ReleaseAttempted(
        uint256 indexed agreementId, bytes32 evidenceHash, bool conditionsMet, bool assetActive, bool released
    );
    event AgreementRefunded(uint256 indexed agreementId);
    event AttesterUpdated(address indexed oldAttester, address indexed newAttester);

    error NotOwner();
    error NotAttester();
    error AgreementNotFunded();
    error ZeroAmount();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAttester() {
        if (msg.sender != attester) revert NotAttester();
        _;
    }

    constructor(address _registry, address _attester) {
        owner = msg.sender;
        registry = AssetRegistry(_registry);
        attester = _attester;
    }

    function setAttester(address newAttester) external onlyOwner {
        emit AttesterUpdated(attester, newAttester);
        attester = newAttester;
    }

    /// @notice Opens and funds a new agreement in one call. Called by the
    /// backend on behalf of the paying party (BOTRAIL is a custodial demo:
    /// the attester wallet funds escrow on the payer's behalf; `payer` and
    /// `payee` are recorded as distinct addresses for bookkeeping and are
    /// what the frontend displays, independent of who submits the tx).
    function createAgreement(uint256 assetId, address payer, address payable payee, bytes32 conditionsHash)
        external
        payable
        onlyAttester
        returns (uint256 agreementId)
    {
        if (msg.value == 0) revert ZeroAmount();
        agreementId = nextAgreementId++;
        agreements[agreementId] = Agreement({
            assetId: assetId,
            payer: payer,
            payee: payee,
            amount: msg.value,
            conditionsHash: conditionsHash,
            status: AgreementStatus.FUNDED,
            createdAt: uint64(block.timestamp)
        });
        emit AgreementCreated(agreementId, assetId, payer, payee, msg.value, conditionsHash);
    }

    /// @notice Attempts to release escrowed funds based on an attested
    /// evidence verdict. Funds move only if `conditionsMet` is true AND
    /// the linked asset is currently ACTIVE. Otherwise the agreement stays
    /// FUNDED (no revert) so a later re-attempt or a refund can follow.
    function attemptRelease(uint256 agreementId, bytes32 evidenceHash, bool conditionsMet)
        external
        onlyAttester
        returns (bool released)
    {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.FUNDED) revert AgreementNotFunded();

        bool assetActive = registry.isActive(ag.assetId);
        released = conditionsMet && assetActive;

        emit ReleaseAttempted(agreementId, evidenceHash, conditionsMet, assetActive, released);

        if (released) {
            ag.status = AgreementStatus.RELEASED;
            (bool ok,) = ag.payee.call{value: ag.amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    /// @notice Returns escrowed funds to the payer, e.g. when conditions
    /// are never met or the agreement is otherwise abandoned.
    function refund(uint256 agreementId) external onlyAttester {
        Agreement storage ag = agreements[agreementId];
        if (ag.status != AgreementStatus.FUNDED) revert AgreementNotFunded();
        ag.status = AgreementStatus.REFUNDED;
        (bool ok,) = payable(ag.payer).call{value: ag.amount}("");
        if (!ok) revert TransferFailed();
        emit AgreementRefunded(agreementId);
    }

    function getAgreement(uint256 agreementId) external view returns (Agreement memory) {
        return agreements[agreementId];
    }
}
