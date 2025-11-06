// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SwapHelper
 * @notice Wrapper contract for Uniswap V3 swaps
 * Integrates with Uniswap Router to enable token swaps
 */
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract SwapHelper is Ownable {
    ISwapRouter public constant swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    
    // Common fee tiers for Uniswap V3
    uint24 public constant FEE_LOW = 500;   // 0.05%
    uint24 public constant FEE_MEDIUM = 3000; // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%

    event SwapExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor() Ownable(msg.sender) {}

    // Wrapped MATIC address on Polygon (WMATIC)
    address public constant WMATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    
    /**
     * @notice Execute a swap using Uniswap V3
     * @param tokenIn Address of input token (use address(0) for native MATIC, which will be wrapped to WMATIC)
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param amountOutMinimum Minimum amount of output tokens (slippage protection)
     * @param fee Fee tier (500, 3000, or 10000)
     * @param recipient Address to receive output tokens
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee,
        address recipient
    ) external payable returns (uint256 amountOut) {
        require(recipient != address(0), "Invalid recipient");
        require(amountIn > 0, "Zero amount");
        
        address actualTokenIn = tokenIn;
        
        // If native token, we need to wrap it first or use WMATIC
        // For Polygon, Uniswap V3 Router expects WMATIC for native swaps
        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "Value mismatch");
            actualTokenIn = WMATIC; // Use WMATIC for Uniswap
            // Wrap native MATIC to WMATIC
            IWETH(WMATIC).deposit{value: amountIn}();
            IERC20(WMATIC).approve(address(swapRouter), amountIn);
        } else {
            require(msg.value == 0, "No native value needed");
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenIn).approve(address(swapRouter), amountIn);
        }

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: actualTokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300, // 5 minutes
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
    

    /**
     * @notice Estimate swap output (view function - needs off-chain calculation)
     * @dev This is a placeholder - actual estimation should be done off-chain using Uniswap SDK
     */
    function estimateSwapOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external pure returns (uint256) {
        // Placeholder - actual estimation requires Uniswap SDK
        // This would need to query the pool contract for current reserves
        return 0;
    }

    receive() external payable {
        // Allow receiving native MATIC
    }
}
