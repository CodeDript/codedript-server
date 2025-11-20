const PDFGenerator = require('../utils/pdfGenerator');
const supabaseService = require('./supabaseService');
const Agreement = require('../models/Agreement');
const { AppError } = require('../utils/responseHandler');

/**
 * PDF Service
 * Handles PDF generation and management for contracts
 */

class PDFService {
  /**
   * Generate and upload contract PDF
   * @param {string} agreementId - Agreement ID
   */
  async generateAndUploadContract(agreementId) {
    try {
      // Fetch agreement with populated data
      const agreement = await Agreement.findOne({ agreementId })
        .populate('client', 'email profile walletAddress')
        .populate('developer', 'email profile walletAddress')
        .populate('milestones')
        .populate('gig', 'title');

      if (!agreement) {
        throw new AppError('Agreement not found', 404);
      }

      // Generate PDF
      const pdfBuffer = await PDFGenerator.generateContractPDF(agreement);

      // Upload to Supabase
      const uploadResult = await supabaseService.uploadContractPDF(
        pdfBuffer,
        agreementId,
        {
          clientEmail: agreement.client.email,
          developerEmail: agreement.developer.email,
          projectName: agreement.project.name
        }
      );

      // Update agreement with PDF details
      agreement.documents.contractPdf = {
        url: uploadResult.url,
        supabaseId: uploadResult.supabaseId,
        uploadedAt: new Date()
      };

      await agreement.save();

      return {
        success: true,
        message: 'Contract PDF generated and uploaded successfully',
        pdf: {
          url: uploadResult.url,
          filePath: uploadResult.filePath,
          agreementId
        }
      };
    } catch (error) {
      console.error('Error generating and uploading contract:', error);
      throw new AppError('Failed to generate contract PDF', 500);
    }
  }

  /**
   * Regenerate contract PDF (for modifications)
   * @param {string} agreementId - Agreement ID
   */
  async regenerateContract(agreementId) {
    try {
      // Fetch agreement
      const agreement = await Agreement.findOne({ agreementId })
        .populate('client', 'email profile walletAddress')
        .populate('developer', 'email profile walletAddress')
        .populate('milestones')
        .populate('gig', 'title');

      if (!agreement) {
        throw new AppError('Agreement not found', 404);
      }

      // Delete old PDF if exists
      if (agreement.documents.contractPdf?.filePath) {
        await supabaseService.deleteFile(agreement.documents.contractPdf.filePath);
      }

      // Generate new PDF
      const pdfBuffer = await PDFGenerator.generateContractPDF(agreement);

      // Upload new PDF
      const uploadResult = await supabaseService.uploadContractPDF(
        pdfBuffer,
        agreementId,
        {
          clientEmail: agreement.client.email,
          developerEmail: agreement.developer.email,
          projectName: agreement.project.name,
          version: 'updated'
        }
      );

      // Update agreement
      agreement.documents.contractPdf = {
        url: uploadResult.url,
        supabaseId: uploadResult.supabaseId,
        uploadedAt: new Date()
      };

      await agreement.save();

      return {
        success: true,
        message: 'Contract PDF regenerated successfully',
        pdf: {
          url: uploadResult.url,
          filePath: uploadResult.filePath,
          agreementId
        }
      };
    } catch (error) {
      console.error('Error regenerating contract:', error);
      throw new AppError('Failed to regenerate contract PDF', 500);
    }
  }

  /**
   * Get contract PDF download URL
   * @param {string} agreementId - Agreement ID
   * @param {number} expiresIn - Expiration time in seconds
   */
  async getContractDownloadUrl(agreementId, expiresIn = 3600) {
    try {
      const agreement = await Agreement.findOne({ agreementId });

      if (!agreement) {
        throw new AppError('Agreement not found', 404);
      }

      if (!agreement.documents.contractPdf?.filePath) {
        throw new AppError('Contract PDF not found', 404);
      }

      const result = await supabaseService.getSignedContractUrl(
        agreement.documents.contractPdf.filePath,
        expiresIn
      );

      return {
        success: true,
        signedUrl: result.signedUrl,
        expiresAt: result.expiresAt,
        agreementId
      };
    } catch (error) {
      console.error('Error getting contract download URL:', error);
      throw error;
    }
  }

  /**
   * Download contract PDF as buffer
   * @param {string} agreementId - Agreement ID
   */
  async downloadContractPDF(agreementId) {
    try {
      const agreement = await Agreement.findOne({ agreementId });

      if (!agreement) {
        throw new AppError('Agreement not found', 404);
      }

      if (!agreement.documents.contractPdf?.filePath) {
        throw new AppError('Contract PDF not found', 404);
      }

      const result = await supabaseService.getContractPDF(
        agreement.documents.contractPdf.filePath
      );

      return {
        success: true,
        blob: result.blob,
        fileName: `Contract-${agreementId}.pdf`
      };
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
      throw error;
    }
  }

  /**
   * Delete contract PDF
   * @param {string} agreementId - Agreement ID
   */
  async deleteContractPDF(agreementId) {
    try {
      const agreement = await Agreement.findOne({ agreementId });

      if (!agreement) {
        throw new AppError('Agreement not found', 404);
      }

      if (!agreement.documents.contractPdf?.filePath) {
        throw new AppError('Contract PDF not found', 404);
      }

      await supabaseService.deleteFile(agreement.documents.contractPdf.filePath);

      // Clear PDF reference in agreement
      agreement.documents.contractPdf = {};
      await agreement.save();

      return {
        success: true,
        message: 'Contract PDF deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting contract PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF preview (without saving)
   * @param {object} agreementData - Agreement data object
   */
  async generatePreview(agreementData) {
    try {
      const pdfBuffer = await PDFGenerator.generateContractPDF(agreementData);

      return {
        success: true,
        buffer: pdfBuffer,
        size: pdfBuffer.length
      };
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      throw new AppError('Failed to generate PDF preview', 500);
    }
  }
}

module.exports = new PDFService();
