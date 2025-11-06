// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MultiversePrediction (Dike)
 * @notice Conditional prediction system with undercollateralized loans
 * - Users post collateral for Prediction A
 * - Receive loan based on collateral value
 * - Loan funds Prediction B, which can fund Prediction C, etc.
 * - If parent fails, entire subtree liquidates
 * - If parent succeeds, amplified ROI
 */
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract MultiversePrediction is Ownable {
    // Constants
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150% (1.5x)
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120% (1.2x)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_LEVERAGE_BPS = 8000; // 80% max leverage
    
    // State
    IERC20 public collateralToken; // address(0) for native MATIC
    uint256 public predictionIdCounter;
    
    struct Prediction {
        uint256 id;
        address creator;
        uint256 parentId; // 0 if root
        uint256 collateralAmount;
        uint256 loanAmount;
        address priceFeed;
        uint256 priceTarget;
        uint256 deadline;
        bool resolved;
        bool outcome; // true if price >= target
        uint256 collateralizationRatio; // in basis points
        bool liquidated;
    }
    
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => uint256[]) public children; // parentId => childIds[]
    mapping(address => uint256[]) public userPredictions;
    
    // Events
    event PredictionCreated(
        uint256 indexed predictionId,
        address indexed creator,
        uint256 indexed parentId,
        uint256 collateral,
        uint256 loan
    );
    event PredictionResolved(uint256 indexed predictionId, bool outcome);
    event Liquidation(uint256 indexed predictionId, address indexed liquidator);
    event CollateralLocked(uint256 indexed predictionId, uint256 amount);
    event LoanIssued(uint256 indexed predictionId, uint256 amount);
    
    constructor(address _collateralToken) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
    }
    
    /**
     * @notice Create a root prediction (no parent)
     */
    function createRootPrediction(
        address priceFeed,
        uint256 priceTarget,
        uint256 deadline,
        uint256 leverageBPS
    ) external payable returns (uint256) {
        require(leverageBPS <= MAX_LEVERAGE_BPS, "leverage too high");
        require(deadline > block.timestamp, "invalid deadline");
        
        uint256 collateral = msg.value; // For native MATIC
        require(collateral > 0, "zero collateral");
        
        // Calculate loan amount based on leverage
        uint256 loan = (collateral * leverageBPS) / BASIS_POINTS;
        uint256 collateralRatio = ((collateral + loan) * BASIS_POINTS) / collateral;
        
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "insufficient collateral");
        
        return _createPrediction(0, priceFeed, priceTarget, deadline, collateral, loan, collateralRatio);
    }
    
    /**
     * @notice Create a child prediction using loan from parent
     */
    function createChildPrediction(
        uint256 parentId,
        address priceFeed,
        uint256 priceTarget,
        uint256 deadline,
        uint256 leverageBPS
    ) external returns (uint256) {
        Prediction storage parent = predictions[parentId];
        require(parent.id != 0, "parent not found");
        require(parent.creator == msg.sender, "not parent creator");
        require(!parent.resolved, "parent resolved");
        require(block.timestamp < parent.deadline, "parent deadline passed");
        require(leverageBPS <= MAX_LEVERAGE_BPS, "leverage too high");
        
        // Check if parent has available loan
        require(parent.loanAmount > 0, "no loan available");
        
        // Use parent's loan as collateral for child
        uint256 childCollateral = parent.loanAmount;
        uint256 childLoan = (childCollateral * leverageBPS) / BASIS_POINTS;
        uint256 collateralRatio = ((childCollateral + childLoan) * BASIS_POINTS) / childCollateral;
        
        // Mark parent loan as used
        parent.loanAmount = 0;
        
        // Create child
        uint256 childId = _createPrediction(
            parentId,
            priceFeed,
            priceTarget,
            deadline,
            childCollateral,
            childLoan,
            collateralRatio
        );
        
        children[parentId].push(childId);
        return childId;
    }
    
    function _createPrediction(
        uint256 parentId,
        address priceFeed,
        uint256 priceTarget,
        uint256 deadline,
        uint256 collateral,
        uint256 loan,
        uint256 collateralRatio
    ) internal returns (uint256) {
        predictionIdCounter++;
        uint256 id = predictionIdCounter;
        
        predictions[id] = Prediction({
            id: id,
            creator: msg.sender,
            parentId: parentId,
            collateralAmount: collateral,
            loanAmount: loan,
            priceFeed: priceFeed,
            priceTarget: priceTarget,
            deadline: deadline,
            resolved: false,
            outcome: false,
            collateralizationRatio: collateralRatio,
            liquidated: false
        });
        
        userPredictions[msg.sender].push(id);
        
        emit PredictionCreated(id, msg.sender, parentId, collateral, loan);
        emit CollateralLocked(id, collateral);
        if (loan > 0) {
            emit LoanIssued(id, loan);
        }
        
        return id;
    }
    
    /**
     * @notice Resolve a prediction based on oracle price
     */
    function resolvePrediction(uint256 predictionId) external {
        Prediction storage pred = predictions[predictionId];
        require(pred.id != 0, "prediction not found");
        require(!pred.resolved, "already resolved");
        require(block.timestamp >= pred.deadline, "too early");
        
        // Get price from oracle
        AggregatorV3Interface oracle = AggregatorV3Interface(pred.priceFeed);
        (, int256 price, , uint256 updatedAt, ) = oracle.latestRoundData();
        require(updatedAt > 0, "invalid oracle");
        
        pred.outcome = uint256(price) >= pred.priceTarget;
        pred.resolved = true;
        
        emit PredictionResolved(predictionId, pred.outcome);
        
        // If prediction failed, liquidate entire subtree
        if (!pred.outcome) {
            _liquidateSubtree(predictionId);
        }
    }
    
    /**
     * @notice Liquidate a prediction and its entire subtree
     */
    function _liquidateSubtree(uint256 predictionId) internal {
        Prediction storage pred = predictions[predictionId];
        if (pred.liquidated) return;
        
        pred.liquidated = true;
        emit Liquidation(predictionId, address(0));
        
        // Liquidate all children recursively
        for (uint256 i = 0; i < children[predictionId].length; i++) {
            _liquidateSubtree(children[predictionId][i]);
        }
    }
    
    /**
     * @notice Claim winnings from a successful prediction
     */
    function claim(uint256 predictionId) external {
        Prediction storage pred = predictions[predictionId];
        require(pred.id != 0, "prediction not found");
        require(pred.resolved, "not resolved");
        require(pred.outcome, "prediction failed");
        require(!pred.liquidated, "liquidated");
        require(pred.creator == msg.sender, "not creator");
        
        // Check parent chain is successful
        require(_isParentChainSuccessful(predictionId), "parent chain failed");
        
        // Calculate payout: 2x for winning
        uint256 payout = pred.collateralAmount * 2;
        
        // Transfer payout
        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "transfer failed");
        
        pred.collateralAmount = 0; // Mark as claimed
    }
    
    /**
     * @notice Check if entire parent chain is successful
     */
    function _isParentChainSuccessful(uint256 predictionId) internal view returns (bool) {
        Prediction storage pred = predictions[predictionId];
        
        // If root, just check if it's successful
        if (pred.parentId == 0) {
            return pred.outcome;
        }
        
        // Check parent chain
        Prediction storage parent = predictions[pred.parentId];
        return parent.outcome && _isParentChainSuccessful(pred.parentId);
    }
    
    /**
     * @notice Get chain health for a prediction
     */
    function getChainHealth(uint256 predictionId) external view returns (bool healthy, uint256 ratio) {
        Prediction storage pred = predictions[predictionId];
        if (pred.liquidated) return (false, 0);
        
        ratio = pred.collateralizationRatio;
        healthy = ratio >= LIQUIDATION_THRESHOLD;
    }
    
    /**
     * @notice Get user's predictions
     */
    function getUserPredictions(address user) external view returns (uint256[] memory) {
        return userPredictions[user];
    }
    
    /**
     * @notice Get children of a prediction
     */
    function getChildren(uint256 parentId) external view returns (uint256[] memory) {
        return children[parentId];
    }
    
    receive() external payable {
        // Allow receiving native MATIC
    }
}
