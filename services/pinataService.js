const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream');
const { getConfig } = require('../config/environment');

/**
 * Initialize Pinata SDK Client (Legacy SDK v2.x)
 */
let pinataClient = null;

function getPinataClient() {
  if (pinataClient) return pinataClient;
  
  const config = getConfig();
  
  if (!config.pinata.jwt) {
    throw new Error('PINATA_JWT is not configured in environment variables');
  }
  
  // Legacy SDK v2.x uses JWT directly
  pinataClient = new pinataSDK({ pinataJWTKey: config.pinata.jwt });
  
  return pinataClient;
}

/**
 * Upload a file to Pinata (IPFS) using Legacy SDK v2.x
 * @param {Buffer} file - File buffer from multer
 * @param {string} filename - Name of the file
 * @param {object} metadata - Optional metadata
 * @returns {Promise<object>} Upload result with IpfsHash, PinSize, Timestamp
 */
async function uploadFile(file, filename, metadata = {}) {
  try {
    const pinata = getPinataClient();
    
    if (!Buffer.isBuffer(file)) {
      throw new Error('File must be a Buffer');
    }
    
    console.log('Uploading to Pinata:', { 
      filename, 
      size: file.length,
      mimeType: metadata.mimeType 
    });
    
    // Convert Buffer to Readable Stream for legacy SDK
    const stream = Readable.from(file);
    
    const options = {
      pinataMetadata: {
        name: filename
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    
    // Upload using legacy SDK's pinFileToIPFS
    const result = await pinata.pinFileToIPFS(stream, options);
    
    console.log('Pinata upload successful:', result);
    
    // Build gateway URLs
    const config = getConfig();
    const gateway = config.pinata.gateway.replace(/^https?:\/\//i, '');
    const dedicatedUrl = `https://${gateway}/ipfs/${result.IpfsHash}`;
    
    return {
      success: true,
      ipfsHash: result.IpfsHash,
      cid: result.IpfsHash,
      pinSize: result.PinSize,
      timestamp: result.Timestamp,
      name: filename,
      size: file.length,
      mimeType: metadata.mimeType,
      url: dedicatedUrl
    };
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw new Error(`Failed to upload to Pinata: ${error.message}`);
  }
}

/**
 * Upload JSON metadata to Pinata using Legacy SDK v2.x
 * @param {object} jsonData - JSON object to upload
 * @param {string} name - Name for the JSON file
 * @returns {Promise<object>} Upload result
 */
async function uploadJSON(jsonData, name = 'metadata.json') {
  try {
    const pinata = getPinataClient();
    
    const options = {
      pinataMetadata: {
        name: name
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    
    // Upload JSON using legacy SDK's pinJSONToIPFS
    const result = await pinata.pinJSONToIPFS(jsonData, options);
    
    console.log('Pinata JSON upload successful:', result);
    
    // Build gateway URL
    const config = getConfig();
    const gateway = config.pinata.gateway.replace(/^https?:\/\//i, '');
    const url = `https://${gateway}/ipfs/${result.IpfsHash}`;

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      cid: result.IpfsHash,
      pinSize: result.PinSize,
      timestamp: result.Timestamp,
      name: name,
      url
    };
  } catch (error) {
    console.error('Pinata JSON upload error:', error);
    throw new Error(`Failed to upload JSON to Pinata: ${error.message}`);
  }
}

/**
 * Get file from Pinata by IPFS hash (CID)
 * @param {string} cid - IPFS CID/hash
 * @returns {Promise<any>} File data from IPFS
 */
async function getFile(cid) {
  try {
    const pinata = getPinataClient();
    const data = await pinata.gateways.get(cid);
    return data;
  } catch (error) {
    console.error('Pinata get file error:', error);
    throw new Error(`Failed to get file from Pinata: ${error.message}`);
  }
}

/**
 * Get file URL from IPFS hash (CID)
 * @param {string} cid - IPFS CID/hash
 * @param {boolean} usePublicGateway - Use public IPFS gateway instead of dedicated
 * @returns {string} Gateway URL
 */
function getFileUrl(cid, usePublicGateway = false) {
  const config = getConfig();
  
  if (usePublicGateway) {
    // Use public IPFS gateway as fallback
    return `https://ipfs.io/ipfs/${cid}`;
  }
  
  const gateway = config.pinata.gateway.replace(/^https?:\/\//i, '');
  return `https://${gateway}/ipfs/${cid}`;
}

/**
 * Get multiple gateway URLs for a CID (dedicated + public fallbacks)
 * @param {string} cid - IPFS CID/hash
 * @returns {object} Object with different gateway URLs
 */
function getGatewayUrls(cid) {
  const config = getConfig();
  const dedicatedGateway = config.pinata.gateway.replace(/^https?:\/\//i, '');
  
  return {
    dedicated: `https://${dedicatedGateway}/ipfs/${cid}`,
    publicIpfs: `https://ipfs.io/ipfs/${cid}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${cid}`,
    dweb: `https://dweb.link/ipfs/${cid}`
  };
}

/**
 * Convert CID to gateway URL using Pinata's convert method
 * @param {string} cid - IPFS CID/hash
 * @returns {Promise<string>} Gateway URL
 */
async function convertCidToUrl(cid) {
  try {
    const pinata = getPinataClient();
    const url = await pinata.gateways.convert(cid);
    return url;
  } catch (error) {
    console.error('Pinata convert CID error:', error);
    throw new Error(`Failed to convert CID: ${error.message}`);
  }
}

/**
 * List all pinned files (with pagination) using Legacy SDK v2.x
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} List of pinned files
 */
async function listFiles(filters = {}) {
  try {
    const pinata = getPinataClient();
    const result = await pinata.pinList(filters);
    return result;
  } catch (error) {
    console.error('Pinata list error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Unpin a file from Pinata using Legacy SDK v2.x
 * @param {string} ipfsHash - IPFS hash (CID) to unpin
 * @returns {Promise<object>} Unpin result
 */
async function unpinFile(ipfsHash) {
  try {
    const pinata = getPinataClient();
    await pinata.unpin(ipfsHash);
    return { success: true, ipfsHash };
  } catch (error) {
    console.error('Pinata unpin error:', error);
    throw new Error(`Failed to unpin file: ${error.message}`);
  }
}

module.exports = {
  getPinataClient,
  uploadFile,
  uploadJSON,
  getFileUrl,
  getGatewayUrls,
  listFiles,
  unpinFile
};
