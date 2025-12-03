const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream');
const { getConfig } = require('../config/environment');
const logger = require('../utils/logger');
const { retry } = require('../utils/helpers');

/**
 * Pinata Service
 * Enhanced IPFS file upload service with better error handling and logging
 */

class PinataService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Pinata SDK Client
   */
  getClient() {
    if (this.client) return this.client;
    
    const config = getConfig();
    
    if (!config.pinata?.jwt) {
      throw new Error('PINATA_JWT is not configured in environment variables');
    }
    
    try {
      this.client = new pinataSDK({ pinataJWTKey: config.pinata.jwt });
      this.isInitialized = true;
      logger.info('Pinata client initialized successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Pinata client', { error: error.message });
      throw error;
    }
  }

  /**
   * Upload a file to Pinata (IPFS)
   */
  async uploadFile(file, filename, metadata = {}) {
    try {
      const pinata = this.getClient();
      
      if (!Buffer.isBuffer(file)) {
        throw new Error('File must be a Buffer');
      }
      
      logger.info('Uploading file to Pinata', { 
        filename, 
        size: file.length,
        mimeType: metadata.mimeType 
      });
      
      // Convert Buffer to Readable Stream
      const stream = Readable.from(file);
      
      const options = {
        pinataMetadata: {
          name: filename,
          ...(metadata.keyvalues && { keyvalues: metadata.keyvalues })
        },
        pinataOptions: {
          cidVersion: 1
        }
      };
      
      // Upload with retry logic
      const result = await retry(
        () => pinata.pinFileToIPFS(stream, options),
        3,
        2000
      );
      
      logger.info('File uploaded to Pinata successfully', { 
        ipfsHash: result.IpfsHash,
        filename 
      });
      
      // Build gateway URL
      const config = getConfig();
      const gateway = "ipfs.io";
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
      logger.error('Pinata file upload failed', { 
        filename, 
        error: error.message 
      });
      throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
  }

  /**
   * Upload JSON metadata to Pinata
   */
  async uploadJSON(jsonData, name = 'metadata.json') {
    try {
      const pinata = this.getClient();
      
      logger.info('Uploading JSON to Pinata', { name });
      
      const options = {
        pinataMetadata: {
          name: name
        },
        pinataOptions: {
          cidVersion: 1
        }
      };
      
      // Upload with retry logic
      const result = await retry(
        () => pinata.pinJSONToIPFS(jsonData, options),
        3,
        2000
      );
      
      logger.info('JSON uploaded to Pinata successfully', { 
        ipfsHash: result.IpfsHash,
        name 
      });
      
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
      logger.error('Pinata JSON upload failed', { 
        name, 
        error: error.message 
      });
      throw new Error(`Failed to upload JSON to Pinata: ${error.message}`);
    }
  }

  /**
   * Get file URL from IPFS hash (CID)
   */
  getFileUrl(cid, usePublicGateway = false) {
    const config = getConfig();
    
    if (usePublicGateway) {
      return `https://ipfs.io/ipfs/${cid}`;
    }
    
    const gateway = config.pinata.gateway.replace(/^https?:\/\//i, '');
    return `https://${gateway}/ipfs/${cid}`;
  }

  /**
   * Get multiple gateway URLs for a CID
   */
  getGatewayUrls(cid) {
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
   * List all pinned files
   */
  async listFiles(filters = {}) {
    try {
      const pinata = this.getClient();
      
      logger.debug('Listing pinned files', { filters });
      
      const result = await pinata.pinList(filters);
      
      logger.info('Retrieved pinned files list', { 
        count: result.rows?.length || 0 
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to list pinned files', { error: error.message });
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Unpin a file from Pinata
   */
  async unpinFile(ipfsHash) {
    try {
      const pinata = this.getClient();
      
      logger.info('Unpinning file from Pinata', { ipfsHash });
      
      await pinata.unpin(ipfsHash);
      
      logger.info('File unpinned successfully', { ipfsHash });
      
      return { success: true, ipfsHash };
    } catch (error) {
      logger.error('Failed to unpin file', { 
        ipfsHash, 
        error: error.message 
      });
      throw new Error(`Failed to unpin file: ${error.message}`);
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection() {
    try {
      const pinata = this.getClient();
      await pinata.testAuthentication();
      logger.info('Pinata connection test successful');
      return true;
    } catch (error) {
      logger.error('Pinata connection test failed', { error: error.message });
      return false;
    }
  }
}

// Export singleton instance
module.exports = new PinataService();

