// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {SettlementEscrow} from "../src/SettlementEscrow.sol";

contract SettlementEscrowTest is Test {
    AssetRegistry registry;
    SettlementEscrow escrow;

    address attester = makeAddr("attester");
    address assetOwner = makeAddr("assetOwner");
    address payer = makeAddr("payer");
    address payable payee = payable(makeAddr("payee"));
    address stranger = makeAddr("stranger");

    uint256 assetId;
    uint256 constant RENT_AMOUNT = 8_000 ether; // BOT has 18 decimals like ETH

    function setUp() public {
        registry = new AssetRegistry(attester);
        escrow = new SettlementEscrow(address(registry), attester);

        vm.prank(attester);
        assetId = registry.registerAsset(assetOwner, "ipfs://excavator-2841");

        vm.deal(attester, 100_000 ether);
    }

    function _createAgreement() internal returns (uint256 agreementId) {
        vm.prank(attester);
        agreementId =
            escrow.createAgreement{value: RENT_AMOUNT}(assetId, payer, payee, keccak256("delivery+inspection"));
    }

    function test_happyPath_releasesFundsWhenConditionsMetAndAssetActive() public {
        uint256 agreementId = _createAgreement();
        assertEq(address(escrow).balance, RENT_AMOUNT);

        vm.prank(attester);
        bool released = escrow.attemptRelease(agreementId, keccak256("delivery-evidence"), true);

        assertTrue(released);
        assertEq(payee.balance, RENT_AMOUNT);
        assertEq(address(escrow).balance, 0);

        SettlementEscrow.Agreement memory ag = escrow.getAgreement(agreementId);
        assertEq(uint8(ag.status), uint8(SettlementEscrow.AgreementStatus.RELEASED));
    }

    function test_restrictedAsset_blocksRelease() public {
        uint256 agreementId = _createAgreement();

        // Insurance expired: attester records evidence that restricts the asset.
        vm.prank(attester);
        registry.recordEvidence(assetId, keccak256("expired-insurance"), "insurance_expired", AssetRegistry.Status.RESTRICTED);

        vm.prank(attester);
        bool released = escrow.attemptRelease(agreementId, keccak256("delivery-evidence"), true);

        assertFalse(released, "release must be refused once the asset is RESTRICTED");
        assertEq(payee.balance, 0);
        assertEq(address(escrow).balance, RENT_AMOUNT);

        SettlementEscrow.Agreement memory ag = escrow.getAgreement(agreementId);
        assertEq(uint8(ag.status), uint8(SettlementEscrow.AgreementStatus.FUNDED), "agreement stays FUNDED, not silently closed");
    }

    function test_conditionsNotMet_blocksRelease() public {
        uint256 agreementId = _createAgreement();

        vm.prank(attester);
        bool released = escrow.attemptRelease(agreementId, keccak256("delivery-evidence"), false);

        assertFalse(released);
        assertEq(payee.balance, 0);

        SettlementEscrow.Agreement memory ag = escrow.getAgreement(agreementId);
        assertEq(uint8(ag.status), uint8(SettlementEscrow.AgreementStatus.FUNDED));
    }

    function test_attemptRelease_revertsForNonAttester() public {
        uint256 agreementId = _createAgreement();

        vm.prank(stranger);
        vm.expectRevert(SettlementEscrow.NotAttester.selector);
        escrow.attemptRelease(agreementId, keccak256("evidence"), true);
    }

    function test_createAgreement_revertsForNonAttester() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(SettlementEscrow.NotAttester.selector);
        escrow.createAgreement{value: 1 ether}(assetId, payer, payee, keccak256("conditions"));
    }

    function test_createAgreement_revertsForZeroValue() public {
        vm.prank(attester);
        vm.expectRevert(SettlementEscrow.ZeroAmount.selector);
        escrow.createAgreement{value: 0}(assetId, payer, payee, keccak256("conditions"));
    }

    function test_refund_returnsFundsToPayer() public {
        uint256 agreementId = _createAgreement();

        vm.prank(attester);
        escrow.refund(agreementId);

        assertEq(payer.balance, RENT_AMOUNT);
        SettlementEscrow.Agreement memory ag = escrow.getAgreement(agreementId);
        assertEq(uint8(ag.status), uint8(SettlementEscrow.AgreementStatus.REFUNDED));
    }

    function test_attemptRelease_revertsIfAgreementNotFunded() public {
        uint256 agreementId = _createAgreement();

        vm.prank(attester);
        escrow.refund(agreementId);

        vm.prank(attester);
        vm.expectRevert(SettlementEscrow.AgreementNotFunded.selector);
        escrow.attemptRelease(agreementId, keccak256("evidence"), true);
    }
}
