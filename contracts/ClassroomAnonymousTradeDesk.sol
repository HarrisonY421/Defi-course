// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISemaphoreLike {
    struct SemaphoreProof {
        uint256 merkleTreeDepth;
        uint256 merkleTreeRoot;
        uint256 nullifier;
        uint256 message;
        uint256 scope;
        uint256[8] points;
    }

    function createGroup(address admin) external returns (uint256);
    function addMember(uint256 groupId, uint256 identityCommitment) external;
    function validateProof(uint256 groupId, SemaphoreProof calldata proof) external;
}

contract ClassroomAnonymousTradeDesk {
    error OnlyOwner();
    error InvalidRecipient();
    error InvalidScope();
    error InvalidSignal();
    error NullifierAlreadyUsed();
    error InventoryTooLow();
    error TransferFailed();

    address public owner;

    IERC20Minimal public immutable quoteToken;
    IERC20Minimal public immutable tradeToken;
    ISemaphoreLike public immutable semaphore;

    uint256 public immutable groupId;
    uint256 public immutable tradeScope;

    uint256 public constant FIXED_INPUT = 2 * 10**18;   // 2 USTUSD
    uint256 public constant FIXED_OUTPUT = 1 * 10**15;  // 0.001 USTETH

    mapping(uint256 => bool) public nullifierUsed;

    event MemberAdded(uint256 indexed identityCommitment);
    event InventoryFunded(uint256 amount);
    event PublicTrade(address indexed trader, uint256 amountIn, uint256 amountOut);
    event AnonymousTrade(address indexed recipient, uint256 indexed nullifier, uint256 amountOut);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address semaphoreAddress,
        address quoteTokenAddress,
        address tradeTokenAddress,
        uint256 tradeScopeValue
    ) {
        owner = msg.sender;
        semaphore = ISemaphoreLike(semaphoreAddress);
        quoteToken = IERC20Minimal(quoteTokenAddress);
        tradeToken = IERC20Minimal(tradeTokenAddress);
        groupId = semaphore.createGroup(address(this));
        tradeScope = tradeScopeValue;
    }

    function addMember(uint256 identityCommitment) external onlyOwner {
        semaphore.addMember(groupId, identityCommitment);
        emit MemberAdded(identityCommitment);
    }

    function fundInventory(uint256 amount) external onlyOwner {
        if (!tradeToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit InventoryFunded(amount);
    }

    function publicTrade() external {
        if (tradeToken.balanceOf(address(this)) < FIXED_OUTPUT) revert InventoryTooLow();
        if (!quoteToken.transferFrom(msg.sender, address(this), FIXED_INPUT)) revert TransferFailed();
        if (!tradeToken.transfer(msg.sender, FIXED_OUTPUT)) revert TransferFailed();

        emit PublicTrade(msg.sender, FIXED_INPUT, FIXED_OUTPUT);
    }

    function anonymousTrade(address recipient, ISemaphoreLike.SemaphoreProof calldata proof) external {
        if (recipient == address(0)) revert InvalidRecipient();
        if (proof.scope != tradeScope) revert InvalidScope();
        if (proof.message != uint256(uint160(recipient))) revert InvalidSignal();
        if (nullifierUsed[proof.nullifier]) revert NullifierAlreadyUsed();
        if (tradeToken.balanceOf(address(this)) < FIXED_OUTPUT) revert InventoryTooLow();

        semaphore.validateProof(groupId, proof);
        nullifierUsed[proof.nullifier] = true;

        if (!tradeToken.transfer(recipient, FIXED_OUTPUT)) revert TransferFailed();

        emit AnonymousTrade(recipient, proof.nullifier, FIXED_OUTPUT);
    }

    function inventory() external view returns (uint256) {
        return tradeToken.balanceOf(address(this));
    }

    function previewTrade() external pure returns (uint256 amountIn, uint256 amountOut) {
        return (FIXED_INPUT, FIXED_OUTPUT);
    }
}
