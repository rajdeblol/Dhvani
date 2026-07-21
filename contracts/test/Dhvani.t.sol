// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Dhvani.sol";

// Mock the Ritual Wallet
contract MockRitualWallet is IRitualWallet {
    uint256 public totalDeposits;
    function deposit(uint256 lockDuration) external payable {
        totalDeposits += msg.value;
    }
}

// Mock the Ed25519 precompile (which normally lives at 0x09)
contract MockEd25519 {
    fallback() external {
        // Return 1 (true) for testing purposes
        bytes memory result = abi.encode(uint256(1));
        assembly {
            return(add(result, 32), mload(result))
        }
    }
}

contract DhvaniTest is Test {
    Dhvani public dhvani;
    MockRitualWallet public mockWallet;

    function setUp() public {
        dhvani = new Dhvani();
        mockWallet = new MockRitualWallet();
        
        vm.etch(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948, address(mockWallet).code);
        
        // Mock the Ed25519 precompile (which normally lives at 0x09)
        vm.mockCall(
            0x0000000000000000000000000000000000000009,
            abi.encodeWithSelector(bytes4(0)), // we just mock all calls to it
            abi.encode(uint256(1))
        );
    }

    function testDeposit() public {
        dhvani.depositForFees{value: 1 ether}();
        // Since we etched, we can't easily check totalDeposits on the etched address without casting
        MockRitualWallet etchedWallet = MockRitualWallet(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948);
        assertEq(etchedWallet.totalDeposits(), 1 ether);
    }

    function testStoreAndVerifyNote() public {
        bytes32 contentHash = keccak256("test audio");
        bytes memory encryptedData = hex"deadbeef";
        bytes memory metadata = hex"1234";
        bytes32 ed25519PubKey = keccak256("pubkey");

        dhvani.storeNote(contentHash, encryptedData, metadata, ed25519PubKey);
        
        (bytes32 storedHash, bytes memory storedEncrypted, bytes memory storedMeta, bytes32 storedPubKey) = dhvani.notes(address(this));
        
        assertEq(storedHash, contentHash);
        assertEq(storedEncrypted, encryptedData);
        assertEq(storedMeta, metadata);
        assertEq(storedPubKey, ed25519PubKey);

        bytes memory signature = hex"abcd";
        
        // This will call the etched MockEd25519, which returns 1
        dhvani.verifyNote(contentHash, signature);
    }
}
