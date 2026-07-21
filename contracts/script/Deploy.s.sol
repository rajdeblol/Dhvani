// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Dhvani.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Dhvani dhvani = new Dhvani();
        console.log("Dhvani deployed at:", address(dhvani));

        vm.stopBroadcast();
    }
}
