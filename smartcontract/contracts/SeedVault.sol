// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IAave.sol";

contract SeedVault is
    Ownable,
    ReentrancyGuard,
    Pausable
{
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    // Token contracts
    IERC20 public immutable cUSD;
    IAToken public immutable acUSD;

    // Protocol integrations
    IPool public immutable aavePool;

    // Vault accounting (share-based system)
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    // User data
    mapping(address => UserProfile) public users;
    mapping(address => StrategyType) public userStrategy;

    // Strategy configurations
    mapping(StrategyType => Strategy) public strategies;

    // Limits and config
    uint256 public constant MIN_DEPOSIT = 1e18; // 1 cUSD
    uint256 public constant MAX_DEPOSIT = 10_000e18;
    uint256 public constant MAX_TVL = 100_000e18;
    uint256 public constant RESERVE_RATIO = 10;

    // Admin addresses
    address public aiAgent;
    address public treasury;

    // Statistics
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public lastRebalance;

    /* ========== STRUCTS & ENUMS ========== */

    struct UserProfile {
        bool isVerified;
        uint256 verifiedAt;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 lastActionTime;
        uint256 userIdentifier; // From Self Protocol
    }

    enum StrategyType {
        CONSERVATIVE,
        BALANCED,
        GROWTH
    }

    struct Strategy {
        string name;
        uint8 aaveAllocation;
        uint8 reserveAllocation;
        uint16 targetAPY;
        uint8 riskLevel;
        bool isActive;
    }

    /* ========== EVENTS ========== */

    event UserVerified(
        address indexed user,
        uint256 userIdentifier,
        uint256 timestamp
    );
    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 assets, uint256 shares);
    event StrategyChanged(
        address indexed user,
        StrategyType oldStrategy,
        StrategyType newStrategy
    );
    event DeployedToAave(uint256 amount, uint256 timestamp);
    event WithdrawnFromAave(uint256 amount, uint256 timestamp);
    event Rebalanced(
        uint256 aaveBalance,
        uint256 reserveBalance,
        uint256 timestamp
    );

    /* ========== ERRORS ========== */

    error NotVerified();
    error InvalidAmount();
    error ExceedsMaxDeposit();
    error ExceedsMaxTVL();
    error InsufficientShares();
    error InsufficientLiquidity();
    error ZeroAddress();

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _cUSD,
        address _acUSD,
        address _aavePool
    ) Ownable(msg.sender) {
        if (
            _cUSD == address(0) ||
            _acUSD == address(0) ||
            _aavePool == address(0)
        ) {
            revert ZeroAddress();
        }

        cUSD = IERC20(_cUSD);
        acUSD = IAToken(_acUSD);
        aavePool = IPool(_aavePool);
        treasury = msg.sender;

        _initializeStrategies();

        // Note: cUSD approval will be done on first deposit to avoid constructor issues
    }

    /* ========== VERIFICATION ========== */

    /**
     * @notice Simple verification function - marks user as verified
     * @dev This is a simplified approach for testing
     */
    function verifySelfProof(bytes memory, bytes memory) external {
        users[msg.sender].isVerified = true;
        users[msg.sender].verifiedAt = block.timestamp;
        users[msg.sender].userIdentifier = uint256(uint160(msg.sender)); // Use address as identifier
        
        // Set default strategy
        userStrategy[msg.sender] = StrategyType.CONSERVATIVE;
        
        emit UserVerified(msg.sender, users[msg.sender].userIdentifier, block.timestamp);
    }

    /**
     * @notice Check if user is verified
     */
    function isVerified(address user) external view returns (bool) {
        return users[user].isVerified;
    }

    function _initializeStrategies() internal {
        strategies[StrategyType.CONSERVATIVE] = Strategy({
            name: "Conservative",
            aaveAllocation: 100,
            reserveAllocation: 0,
            targetAPY: 350,
            riskLevel: 1,
            isActive: true
        });

        strategies[StrategyType.BALANCED] = Strategy({
            name: "Balanced",
            aaveAllocation: 90,
            reserveAllocation: 10,
            targetAPY: 350,
            riskLevel: 3,
            isActive: true
        });

        strategies[StrategyType.GROWTH] = Strategy({
            name: "Growth",
            aaveAllocation: 80,
            reserveAllocation: 20,
            targetAPY: 350,
            riskLevel: 5,
            isActive: true
        });
    }

    /* ========== MODIFIERS ========== */

    modifier onlyVerified() {
        if (!users[msg.sender].isVerified) revert NotVerified();
        _;
    }

    /* ========== IDENTITY VERIFICATION ========== */

    /* ========== CORE FUNCTIONS: DEPOSIT ========== */

    function deposit(
        uint256 assets
    )
        external
        nonReentrant
        whenNotPaused
        onlyVerified
        returns (uint256 sharesIssued)
    {
        if (assets < MIN_DEPOSIT) revert InvalidAmount();
        if (assets > MAX_DEPOSIT) revert ExceedsMaxDeposit();
        if (totalAssets() + assets > MAX_TVL) revert ExceedsMaxTVL();

        sharesIssued = _convertToShares(assets);

        shares[msg.sender] += sharesIssued;
        totalShares += sharesIssued;
        users[msg.sender].totalDeposited += assets;
        users[msg.sender].lastActionTime = block.timestamp;
        totalDeposited += assets;

        cUSD.safeTransferFrom(msg.sender, address(this), assets);
        _deployToAave(assets);

        emit Deposited(msg.sender, assets, sharesIssued);
    }

    function _deployToAave(uint256 amount) internal {
        uint256 reserveAmount = (amount * RESERVE_RATIO) / 100;
        uint256 deployAmount = amount - reserveAmount;

        if (deployAmount > 0) {
            // Ensure Aave has approval (safer incremental approval)
            uint256 currentAllowance = cUSD.allowance(
                address(this),
                address(aavePool)
            );
            if (currentAllowance < deployAmount) {
                // Use incremental approval instead of unlimited
                uint256 neededAllowance = deployAmount - currentAllowance;
                cUSD.approve(address(aavePool), currentAllowance + neededAllowance);
            }

            // Supply to Aave (receives acUSD in return)
            aavePool.supply(
                address(cUSD),
                deployAmount,
                address(this),
                0 // No referral code
            );

            emit DeployedToAave(deployAmount, block.timestamp);
        }
    }

    /* ========== CORE FUNCTIONS: WITHDRAW ========== */

    function withdraw(
        uint256 assets
    ) external nonReentrant returns (uint256 sharesBurned) {
        sharesBurned = _convertToShares(assets);

        if (shares[msg.sender] < sharesBurned) revert InsufficientShares();

        shares[msg.sender] -= sharesBurned;
        totalShares -= sharesBurned;
        users[msg.sender].totalWithdrawn += assets;
        users[msg.sender].lastActionTime = block.timestamp;
        totalWithdrawn += assets;

        uint256 reserveBalance = cUSD.balanceOf(address(this));

        if (reserveBalance < assets) {
            uint256 shortfall = assets - reserveBalance;
            _withdrawFromAave(shortfall);
        }

        cUSD.safeTransfer(msg.sender, assets);

        emit Withdrawn(msg.sender, assets, sharesBurned);
    }

    function _withdrawFromAave(uint256 amount) internal {
        // Withdraw from Aave (burns acUSD, returns cUSD)
        uint256 withdrawn = aavePool.withdraw(
            address(cUSD),
            amount,
            address(this)
        );

        emit WithdrawnFromAave(withdrawn, block.timestamp);
    }

    /* ========== VIEW FUNCTIONS ========== */

    function totalAssets() public view returns (uint256) {
        uint256 reserveBalance = cUSD.balanceOf(address(this));
        (uint256 aaveBalance,,,,,) = aavePool.getUserAccountData(address(this)); // Get total collateral from Aave
        return reserveBalance + aaveBalance;
    }

    function balanceOf(address user) external view returns (uint256) {
        return _convertToAssets(shares[user]);
    }

    function getEarnings(address user) external view returns (uint256) {
        uint256 currentBalance = _convertToAssets(shares[user]);
        uint256 deposited = users[user].totalDeposited;
        uint256 withdrawn = users[user].totalWithdrawn;

        if (currentBalance + withdrawn > deposited) {
            return (currentBalance + withdrawn) - deposited;
        }
        return 0;
    }

    function getVaultStats()
        external
        view
        returns (
            uint256 _totalAssets,
            uint256 _totalShares,
            uint256 reserveBalance,
            uint256 aaveBalance,
            uint256 _totalDeposited,
            uint256 _totalWithdrawn
        )
    {
        (uint256 aaveBalance,,,,,) = aavePool.getUserAccountData(address(this));
        return (
            totalAssets(),
            totalShares,
            cUSD.balanceOf(address(this)),
            aaveBalance, // Get total collateral from Aave
            totalDeposited,
            totalWithdrawn
        );
    }

    function getCurrentAPY() external view returns (uint256) {
        return 350;
    }

    /* ========== SHARE CONVERSION ========== */

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (totalShares == 0 || _totalAssets == 0) return assets;
        return (assets * totalShares) / _totalAssets;
    }

    function _convertToAssets(uint256 _shares) internal view returns (uint256) {
        if (totalShares == 0) return 0;
        return (_shares * totalAssets()) / totalShares;
    }

    /* ========== STRATEGY MANAGEMENT ========== */

    function changeStrategy(StrategyType newStrategy) external onlyVerified {
        require(strategies[newStrategy].isActive, "Invalid strategy");

        StrategyType oldStrategy = userStrategy[msg.sender];
        userStrategy[msg.sender] = newStrategy;

        emit StrategyChanged(msg.sender, oldStrategy, newStrategy);
    }

    /* ========== ADMIN FUNCTIONS ========== */

    function rebalance() external {
        require(msg.sender == owner() || msg.sender == aiAgent, "Unauthorized");

        uint256 _totalAssets = totalAssets();
        uint256 targetReserve = (_totalAssets * RESERVE_RATIO) / 100;
        uint256 currentReserve = cUSD.balanceOf(address(this));

        if (currentReserve < targetReserve) {
            uint256 needed = targetReserve - currentReserve;
            _withdrawFromAave(needed);
        } else if (currentReserve > targetReserve * 2) {
            uint256 excess = currentReserve - targetReserve;
            _deployToAave(excess);
        }

        lastRebalance = block.timestamp;
        emit Rebalanced(
            acUSD.balanceOf(address(this)),
            cUSD.balanceOf(address(this)),
            block.timestamp
        );
    }

    function setAIAgent(address _aiAgent) external onlyOwner {
        if (_aiAgent == address(0)) revert ZeroAddress();
        aiAgent = _aiAgent;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        require(paused(), "Not paused");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
