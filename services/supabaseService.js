const supabaseConfig = require('../config/supabase');
const { generateFileName } = require('../middlewares/upload');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Supabase Service
 * Handles all file operations with Supabase Storage
 */

class SupabaseService {
  /**
   * Upload contract PDF to Supabase
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} agreementId - Agreement ID for file naming
   * @param {object} metadata - Additional metadata
   */
  async uploadContractPDF(pdfBuffer, agreementId, metadata = {}) {
    try {
      const fileName = `contract-${agreementId}-${Date.now()}.pdf`;
      const folder = 'contracts';

      const result = await supabaseConfig.uploadFile(
        pdfBuffer,
        fileName,
        folder,
        'application/pdf'
      );

      return {
        success: true,
        url: result.publicUrl,
        filePath: result.filePath,
        supabaseId: result.supabaseId,
        metadata: {
          agreementId,
          ...metadata,
          uploadedAt: result.uploadedAt
        }
      };
    } catch (error) {
      console.error('Error uploading contract PDF:', error);
      throw new AppError('Failed to upload contract PDF', 500);
    }
  }

  /**
   * Upload milestone file to Supabase
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} milestoneId - Milestone ID
   * @param {string} agreementId - Agreement ID
   */
  async uploadMilestoneFile(fileBuffer, fileName, milestoneId, agreementId) {
    try {
      const sanitizedFileName = generateFileName(fileName, `milestone-${milestoneId}`);
      const folder = `milestones/${agreementId}`;

      const result = await supabaseConfig.uploadFile(
        fileBuffer,
        sanitizedFileName,
        folder,
        this.getMimeType(fileName)
      );

      return {
        success: true,
        name: fileName,
        url: result.publicUrl,
        filePath: result.filePath,
        supabaseId: result.supabaseId,
        uploadedAt: result.uploadedAt
      };
    } catch (error) {
      console.error('Error uploading milestone file:', error);
      throw new AppError('Failed to upload milestone file', 500);
    }
  }

  /**
   * Upload gig image to Supabase
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} fileName - Original file name
   * @param {string} gigId - Gig ID
   */
  async uploadGigImage(imageBuffer, fileName, gigId) {
    try {
      const sanitizedFileName = generateFileName(fileName, `gig-${gigId}`);
      const folder = 'gigs';

      const result = await supabaseConfig.uploadFile(
        imageBuffer,
        sanitizedFileName,
        folder,
        this.getMimeType(fileName)
      );

      return {
        success: true,
        url: result.publicUrl,
        publicId: result.supabaseId
      };
    } catch (error) {
      console.error('Error uploading gig image:', error);
      throw new AppError('Failed to upload gig image', 500);
    }
  }

  /**
   * Upload user avatar to Supabase
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} fileName - Original file name
   * @param {string} userId - User ID
   */
  async uploadUserAvatar(imageBuffer, fileName, userId) {
    try {
      const sanitizedFileName = generateFileName(fileName, `avatar-${userId}`);
      const folder = 'avatars';

      const result = await supabaseConfig.uploadFile(
        imageBuffer,
        sanitizedFileName,
        folder,
        this.getMimeType(fileName)
      );

      return {
        success: true,
        url: result.publicUrl,
        filePath: result.filePath
      };
    } catch (error) {
      console.error('Error uploading user avatar:', error);
      throw new AppError('Failed to upload avatar', 500);
    }
  }

  /**
   * Get contract PDF from Supabase
   * @param {string} filePath - File path in storage
   */
  async getContractPDF(filePath) {
    try {
      const result = await supabaseConfig.downloadFile(filePath);

      return {
        success: true,
        blob: result.blob,
        data: result.data
      };
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
      throw new AppError('Failed to download contract PDF', 500);
    }
  }

  /**
   * Get signed URL for contract viewing
   * @param {string} filePath - File path in storage
   * @param {number} expiresIn - Expiration time in seconds
   */
  async getSignedContractUrl(filePath, expiresIn = 3600) {
    try {
      const result = await supabaseConfig.getSignedUrl(filePath, expiresIn);

      return {
        success: true,
        signedUrl: result.signedUrl,
        expiresAt: result.expiresAt
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new AppError('Failed to generate signed URL', 500);
    }
  }

  /**
   * Delete file from Supabase
   * @param {string} filePath - File path in storage
   */
  async deleteFile(filePath) {
    try {
      const result = await supabaseConfig.deleteFile(filePath);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  /**
   * Delete multiple files from Supabase
   * @param {Array<string>} filePaths - Array of file paths
   */
  async deleteMultipleFiles(filePaths) {
    try {
      const deletePromises = filePaths.map(path => 
        supabaseConfig.deleteFile(path)
      );

      await Promise.all(deletePromises);

      return {
        success: true,
        message: `${filePaths.length} files deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new AppError('Failed to delete files', 500);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   */
  async listFilesInFolder(folder) {
    try {
      const result = await supabaseConfig.listFiles(folder);

      return {
        success: true,
        files: result.files,
        count: result.count
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new AppError('Failed to list files', 500);
    }
  }

  /**
   * Get file metadata
   * @param {string} filePath - File path in storage
   */
  async getFileMetadata(filePath) {
    try {
      const result = await supabaseConfig.getFileMetadata(filePath);

      return {
        success: true,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new AppError('Failed to get file metadata', 500);
    }
  }

  /**
   * Get MIME type from file name
   * @param {string} fileName - File name
   */
  getMimeType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'zip': 'application/zip'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Health check for Supabase service
   */
  async healthCheck() {
    try {
      return await supabaseConfig.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

module.exports = new SupabaseService();
