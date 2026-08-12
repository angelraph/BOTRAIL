// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";

contract AssetRegistryTest is Test {
    AssetRegistry registry;
    address attester = makeAddr("attester");
    address assetOwner = makeAddr("assetOwner");
    address stranger = makeAddr("stranger");

    function setUp() public {
        registry = new AssetRegistry(attester);
    }

    function test_registerAsset_setsActiveStatusAndIncrementsIds() public {
        vm.prank(attester);
        uint256 id1 = registry.registerAsset(assetOwner, "ipfs://asset-1");
        assertEq(id1, 1);

        vm.prank(attester);
        uint256 id2 = registry.registerAsset(assetOwner, "ipfs://asset-2");
        assertEq(id2, 2);

        assertTrue(registry.isActive(id1));
        assertEq(uint8(registry.getStatus(id1)), uint8(AssetRegistry.Status.ACTIVE));
    }

    function test_registerAsset_revertsForNonAttester() public {
        vm.prank(stranger);
        vm.expectRevert(AssetRegistry.NotAttester.selector);
        registry.registerAsset(assetOwner, "ipfs://asset-1");
    }

    function test_recordEvidence_updatesStatusAndAppendsHistory() public {
        vm.prank(attester);
        uint256 id = registry.registerAsset(assetOwner, "ipfs://asset-1");

        vm.prank(attester);
        registry.recordEvidence(id, keccak256("insurance-doc"), "insurance_expired", AssetRegistry.Status.RESTRICTED);

        assertFalse(registry.isActive(id));
        assertEq(uint8(registry.getStatus(id)), uint8(AssetRegistry.Status.RESTRICTED));

        AssetRegistry.EvidenceRecord[] memory history = registry.getEvidenceHistory(id);
        assertEq(history.length, 1);
        assertEq(history[0].verdict, "insurance_expired");
    }

    function test_recordEvidence_revertsForNonAttester() public {
        vm.prank(attester);
        uint256 id = registry.registerAsset(assetOwner, "ipfs://asset-1");

        vm.prank(stranger);
        vm.expectRevert(AssetRegistry.NotAttester.selector);
        registry.recordEvidence(id, keccak256("doc"), "ok", AssetRegistry.Status.ACTIVE);
    }

    function test_recordEvidence_revertsForNonexistentAsset() public {
        vm.prank(attester);
        vm.expectRevert(AssetRegistry.AssetDoesNotExist.selector);
        registry.recordEvidence(999, keccak256("doc"), "ok", AssetRegistry.Status.ACTIVE);
    }

    function test_isActive_falseForNonexistentAsset() public view {
        assertFalse(registry.isActive(999));
    }

    function test_setAttester_onlyOwner() public {
        address newAttester = makeAddr("newAttester");

        vm.prank(stranger);
        vm.expectRevert(AssetRegistry.NotOwner.selector);
        registry.setAttester(newAttester);

        // deployer (this test contract) is the owner
        registry.setAttester(newAttester);
        assertEq(registry.attester(), newAttester);
    }
}
