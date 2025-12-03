const { ethers } = require("ethers");
const logger = require("../utils/logger");
const { ValidationError } = require("../utils/errorHandler");

/**
 * Network configurations for different blockchain networks
 */
const { NETWORK_CONFIGS } = require("../config/constants");

/**
 * Get provider for a specific network
 * @param {string} network - Network name (mainnet, sepolia, goerli, polygon, mumbai)
 * @returns {ethers.providers.JsonRpcProvider} Provider instance
 */
const getProvider = (network) => {
  const networkConfig = NETWORK_CONFIGS[network];
  if (!networkConfig) {
    throw new ValidationError(
      `Invalid network: ${network}. Supported networks: ${Object.keys(NETWORK_CONFIGS).join(", ")}`
    );
  }

  try {
    return new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
  } catch (error) {
    logger.error(`Failed to create provider for ${network}:`, error);
    throw new Error(`Failed to connect to ${networkConfig.name}`);
  }
};

/**
 * Fetch transaction details from blockchain
 * @param {string} transactionHash - Transaction hash
 * @param {string} network - Network name
 * @returns {Promise<Object>} Transaction details
 */
const fetchTransactionDetails = async (transactionHash, network) => {
  try {
    // Validate transaction hash format (ethers v5 compatible)
    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      throw new ValidationError(
        "Invalid transaction hash format. Must be a 32-byte hex string."
      );
    }

    const provider = getProvider(network);

    // Fetch transaction
    logger.info(
      `Fetching transaction ${transactionHash} from ${network} network`
    );
    const transaction = await provider.getTransaction(transactionHash);

    if (!transaction) {
      throw new ValidationError(
        `Transaction ${transactionHash} not found on ${network} network`
      );
    }

    // Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!receipt) {
      throw new ValidationError(
        `Transaction ${transactionHash} has not been mined yet. Please wait for confirmation.`
      );
    }

    // Verify transaction was successful
    if (receipt.status === 0) {
      throw new ValidationError(
        `Transaction ${transactionHash} failed on the blockchain`
      );
    }

    // Get current block number for confirmations
    const currentBlockNumber = await provider.getBlockNumber();
    const confirmations = currentBlockNumber - receipt.blockNumber;

    // Calculate transaction fee (gasUsed * gasPrice)
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice || transaction.gasPrice;
    const transactionFeeWei = gasUsed.mul(effectiveGasPrice);
    const transactionFee = ethers.utils.formatEther(transactionFeeWei);

    // Extract relevant details
    const transactionDetails = {
      transactionHash: transaction.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: transaction.from,
      to: transaction.to,
      value: ethers.utils.formatEther(transaction.value), // Convert wei to ether
      valueInWei: transaction.value.toString(),
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: transaction.gasPrice.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice
        ? receipt.effectiveGasPrice.toString()
        : transaction.gasPrice.toString(),
      transactionFee: transactionFee, // Transaction fee in ETH/MATIC
      transactionFeeWei: transactionFeeWei.toString(),
      contractAddress: receipt.contractAddress || transaction.to,
      timestamp: null, // Will be fetched from block
      confirmations: confirmations,
    };

    // Fetch block to get timestamp
    try {
      const block = await provider.getBlock(receipt.blockNumber);
      if (block) {
        const txTime = new Date(block.timestamp * 1000);
        
        // Format timestamp as "Dec-02-2025 08:31:12 AM UTC"
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[txTime.getUTCMonth()];
        const day = String(txTime.getUTCDate()).padStart(2, '0');
        const year = txTime.getUTCFullYear();
        const hours = txTime.getUTCHours();
        const minutes = String(txTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(txTime.getUTCSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        transactionDetails.timestamp = `${month}-${day}-${year} ${String(displayHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm} UTC`;
        transactionDetails.timestampDate = txTime;
      }
    } catch (error) {
      logger.warn(
        `Could not fetch block timestamp for transaction ${transactionHash}:`,
        error
      );
    }

    logger.info(
      `Successfully fetched transaction details for ${transactionHash} on ${network}`
    );

    return transactionDetails;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error(
      `Error fetching transaction ${transactionHash} from ${network}:`,
      error
    );
    throw new Error(
      `Failed to fetch transaction details: ${error.message || "Unknown error"}`
    );
  }
};

/**
 * Verify transaction amount matches expected price
 * @param {string} transactionHash - Transaction hash
 * @param {string} network - Network name
 * @param {number} expectedPrice - Expected price in currency unit (ETH/MATIC)
 * @param {number} tolerance - Tolerance percentage (default 0.01 = 1%)
 * @returns {Promise<boolean>} True if amount matches
 */
const verifyTransactionAmount = async (
  transactionHash,
  network,
  expectedPrice,
  tolerance = 0.01
) => {
  try {
    const details = await fetchTransactionDetails(transactionHash, network);
    const actualPrice = parseFloat(details.value);
    const difference = Math.abs(actualPrice - expectedPrice);
    const maxDifference = expectedPrice * tolerance;

    logger.info(
      `Verifying transaction amount: expected=${expectedPrice}, actual=${actualPrice}, difference=${difference}, maxDifference=${maxDifference}`
    );

    return difference <= maxDifference;
  } catch (error) {
    logger.error(
      `Error verifying transaction amount for ${transactionHash}:`,
      error
    );
    throw error;
  }
};

/**
 * Get current gas price for a network
 * @param {string} network - Network name
 * @returns {Promise<Object>} Gas price information
 */
const getGasPrice = async (network) => {
  try {
    const provider = getProvider(network);
    const gasPrice = await provider.getGasPrice();

    return {
      gasPrice: gasPrice.toString(),
      // Note: EIP-1559 fields may not be available on all networks
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
    };
  } catch (error) {
    logger.error(`Error fetching gas price for ${network}:`, error);
    throw new Error(`Failed to fetch gas price: ${error.message}`);
  }
};

/**
 * Get current block number for a network
 * @param {string} network - Network name
 * @returns {Promise<number>} Current block number
 */
const getCurrentBlockNumber = async (network) => {
  try {
    const provider = getProvider(network);
    return await provider.getBlockNumber();
  } catch (error) {
    logger.error(`Error fetching block number for ${network}:`, error);
    throw new Error(`Failed to fetch block number: ${error.message}`);
  }
};

/**
 * Check if a transaction exists on the blockchain
 * @param {string} transactionHash - Transaction hash
 * @param {string} network - Network name
 * @returns {Promise<boolean>} True if transaction exists
 */
const transactionExists = async (transactionHash, network) => {
  try {
    const provider = getProvider(network);
    const transaction = await provider.getTransaction(transactionHash);
    return !!transaction;
  } catch (error) {
    logger.error(
      `Error checking transaction existence for ${transactionHash}:`,
      error
    );
    return false;
  }
};

module.exports = {
  fetchTransactionDetails,
  verifyTransactionAmount,
  getGasPrice,
  getCurrentBlockNumber,
  transactionExists,
  getProvider,
  NETWORK_CONFIGS,
};
