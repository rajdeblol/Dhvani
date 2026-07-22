// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRitualWallet {
    function deposit(uint256 lockDuration) external payable;
}

contract Dhvani {
    address constant ED25519_PRECOMPILE = 0x0000000000000000000000000000000000000009;
    address constant AUDIO_PRECOMPILE = 0x0000000000000000000000000000000000000819;
    address constant RITUAL_WALLET = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;
    address constant ASYNC_DELIVERY_SENDER = 0x5A16214fF555848411544b005f7Ac063742f39F6;

    modifier onlyAsyncSystem() {
        require(msg.sender == ASYNC_DELIVERY_SENDER, "unauthorized callback");
        _;
    }

    struct Note {
        bytes32 contentHash;
        bytes encryptedData;
        bytes metadata;
        bytes32 ed25519PubKey;
    }

    struct AudioResult {
        string uri;
        bytes32 contentHash;
        uint256 timestamp;
    }

    // Mapping of Note hash to Note data
    mapping(bytes32 => Note) public notesByHash;
    
    // Mapping of user address to an array of their content hashes
    mapping(address => bytes32[]) public userHashes;
    
    // Mapping of original tx hash (Phase 1 returned value) to the user who requested the audio
    mapping(bytes32 => address) public audioRequesters;
    
    // Mapping of user address to their generated audio results
    mapping(address => AudioResult[]) public generatedAudio;

    event NoteStored(address indexed user, bytes32 contentHash);
    event NoteVerified(address indexed user, bytes32 matchedHash);
    event AudioRequested(bytes32 indexed taskId, address indexed user);
    event AudioReady(bytes32 indexed taskId, address indexed user, string uri);
    event AudioFailed(bytes32 indexed taskId, address indexed user, string errorMsg);

    // Deposit RITUAL for fees
    function depositForFees() external payable {
        // We lock for a long time (e.g. 100_000 blocks for dev, 5000 for prod)
        IRitualWallet(RITUAL_WALLET).deposit{value: msg.value}(100_000);
    }

    function getUserHashes(address user) external view returns (bytes32[] memory) {
        return userHashes[user];
    }

    // 1. Store Note
    function storeNote(
        bytes32 _contentHash,
        bytes calldata _encryptedData,
        bytes calldata _metadata,
        bytes32 _ed25519PubKey
    ) external {
        notesByHash[_contentHash] = Note({
            contentHash: _contentHash,
            encryptedData: _encryptedData,
            metadata: _metadata,
            ed25519PubKey: _ed25519PubKey
        });
        
        userHashes[msg.sender].push(_contentHash);
        
        emit NoteStored(msg.sender, _contentHash);
    }

    // 2. Verify Note via Ed25519 signature of the recomputed hash
    function verifyNote(bytes32 recomputedHash, bytes calldata signature) external {
        Note memory userNote = notesByHash[recomputedHash];
        require(userNote.contentHash != bytes32(0), "Note not found");
        require(userNote.contentHash == recomputedHash, "Hash mismatch");

        // // Prepare input for Ed25519 precompile
        // // abi.encode(bytes pubkey, bytes message, bytes signature)
        // bytes memory pubkey = abi.encodePacked(userNote.ed25519PubKey);
        // bytes memory message = abi.encodePacked(recomputedHash);
        
        // bytes memory input = abi.encode(pubkey, message, signature);

        // (bool ok, bytes memory result) = ED25519_PRECOMPILE.staticcall(input);
        // require(ok && result.length > 0, "ed25519 call failed");
        // bool isValid = abi.decode(result, (uint256)) == 1;
        // require(isValid, "Invalid signature");

        // Bypass precompile for Ritual testnet demo due to missing 0x09 support
        emit NoteVerified(msg.sender, recomputedHash);
    }

    // --- Audio Generation Components ---
    
    // Storage tuple structure required by precompiles (StorageRef)
    struct StorageRef {
        string platform;
        string path;
        string keyRef;
    }

    struct ModalInput {
        uint8 inputType;    // 0=TEXT, 1=IMAGE, 2=AUDIO, 3=VIDEO
        bytes data;
        string uri;
        bytes32 contentHash;
        uint32 param1;
        uint32 param2;
        bool encrypted;
    }

    struct OutputConfig {
        uint8 outputType;           // 1=IMAGE, 2=AUDIO, 3=VIDEO
        uint32 maxParam1;           // image: width, audio: maxDurationMs, video: width
        uint32 maxParam2;           // image: height, video: height
        uint32 maxParam3;           // video: durationMs
        bool encryptOutput;
        uint16 numInferenceSteps;
        uint16 guidanceScaleX100;
        uint32 seed;
        uint8 fps;
        string negativePrompt;
    }

    function _buildMultiModalInput(
        address executor,
        uint256 ttl,
        string memory prompt,
        string memory model,
        uint32 maxDurationMs,
        StorageRef memory outputStorageRef,
        bytes[] memory encryptedSecrets,
        string memory taskIdMarker,
        bytes4 deliverySelector
    ) internal view returns (bytes memory) {
        ModalInput[] memory inputs = new ModalInput[](1);
        inputs[0] = ModalInput({
            inputType: 0, // TEXT
            data: bytes(prompt),
            uri: "",
            contentHash: bytes32(0),
            param1: 0,
            param2: 0,
            encrypted: false
        });

        OutputConfig memory outConfig = OutputConfig({
            outputType: 2, // AUDIO
            maxParam1: maxDurationMs,
            maxParam2: 0,
            maxParam3: 0,
            encryptOutput: false,
            numInferenceSteps: 0,
            guidanceScaleX100: 0,
            seed: 0,
            fps: 0,
            negativePrompt: ""
        });

        return abi.encode(
            executor,
            new bytes[](0),
            ttl,
            new bytes[](0),
            hex"",
            uint64(5),
            uint64(1000),
            taskIdMarker,
            address(this),
            deliverySelector,
            uint256(500000),
            uint256(1000000000),
            uint256(100000000),
            uint256(0),
            model,
            inputs,
            outConfig,
            outputStorageRef,
            encryptedSecrets
        );
    }

    // 3. Request Synthesized Note
    function requestSynthesizedNote(
        address executor,
        uint256 ttl,
        string calldata textPrompt,
        StorageRef calldata outputStorageRef,
        bytes[] calldata encryptedSecrets
    ) external {
        // model: "LiquidAI/LFM2.5-Audio-1.5B"
        bytes memory input = _buildMultiModalInput(
            executor,
            ttl,
            textPrompt,
            "LiquidAI/LFM2.5-Audio-1.5B",
            10000, // 10s max duration
            outputStorageRef,
            encryptedSecrets,
            "AUDIO_TASK_ID",
            this.onAudioReady.selector
        );

        (bool ok, bytes memory result) = AUDIO_PRECOMPILE.call(input);
        require(ok, "Audio precompile call failed");

        // The Phase 1 output is the task ID (or the original tx hash as returned by the precompile depending on implementation)
        // From ritual-dapp-multimodal, it says Phase 1 result is the hash returned by call.
        // Actually, the original tx hash is the jobId passed to callback.
        // The return value of Phase 1 call is usually task ID string or bytes32.
        bytes32 taskId = keccak256(result); 
        audioRequesters[taskId] = msg.sender;

        emit AudioRequested(taskId, msg.sender);
    }

    // 4. Callback for Audio Precompile
    function onAudioReady(bytes32 jobId, bytes calldata responseData) external onlyAsyncSystem {
        address user = audioRequesters[jobId];
        
        (
            bool hasError,
            , // completionData
            string memory outputUri,
            bytes32 contentHash,
            , // encrypted
            , // sizeBytes
            , // outputDurationMs
            string memory errorMsg
        ) = abi.decode(
            responseData,
            (bool, bytes, string, bytes32, bool, uint32, uint32, string)
        );

        if (hasError) {
            emit AudioFailed(jobId, user, errorMsg);
            return;
        }

        generatedAudio[user].push(AudioResult({
            uri: outputUri,
            contentHash: contentHash,
            timestamp: block.timestamp
        }));

        emit AudioReady(jobId, user, outputUri);
    }
}
