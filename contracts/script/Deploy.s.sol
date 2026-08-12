// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {SettlementEscrow} from "../src/SettlementEscrow.sol";

/// @notice Deploys AssetRegistry + SettlementEscrow. The deploying wallet
/// (from ATTESTER_PRIVATE_KEY) is set as both contracts' `attester` — for
/// the hackathon demo, one backend service wallet does everything:
/// deploys, and later signs every registerAsset/recordEvidence/
/// createAgreement/attemptRelease call. Works unchanged against a local
/// Anvil chain (--rpc-url http://127.0.0.1:8545) or BOT Chain mainnet
/// (chain ID 677) once a funded key is provided.
///
/// Usage:
///   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
contract DeployScript is Script {
    function run() external {
        uint256 attesterKey = vm.envUint("ATTESTER_PRIVATE_KEY");
        address attester = vm.addr(attesterKey);

        vm.startBroadcast(attesterKey);

        AssetRegistry registry = new AssetRegistry(attester);
        SettlementEscrow escrow = new SettlementEscrow(address(registry), attester);

        vm.stopBroadcast();

        console.log("Attester wallet:      ", attester);
        console.log("AssetRegistry:        ", address(registry));
        console.log("SettlementEscrow:     ", address(escrow));
        console.log("");
        console.log("Set these in .env:");
        console.log("ASSET_REGISTRY_ADDRESS=", address(registry));
        console.log("SETTLEMENT_ESCROW_ADDRESS=", address(escrow));
    }
}
