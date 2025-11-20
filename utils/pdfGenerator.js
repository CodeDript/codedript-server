const PDFDocument = require('pdfkit');

/**
 * PDF Generator Utility
 * Generates PDF documents for contracts and agreements
 */

class PDFGenerator {
  /**
   * Generate contract PDF
   * @param {object} agreementData - Agreement data object
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateContractPDF(agreementData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc, agreementData);

        // Agreement Details
        this.addAgreementDetails(doc, agreementData);

        // Parties Information
        this.addPartiesInfo(doc, agreementData);

        // Project Details
        this.addProjectDetails(doc, agreementData);

        // Financial Terms
        this.addFinancialTerms(doc, agreementData);

        // Milestones
        this.addMilestones(doc, agreementData);

        // Terms and Conditions
        this.addTermsAndConditions(doc, agreementData);

        // Signatures Section
        this.addSignatureSection(doc, agreementData);

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   */
  static addHeader(doc, data) {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('SERVICE AGREEMENT', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Agreement ID: ${data.agreementId}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' })
      .moveDown(1);

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);
  }

  /**
   * Add agreement details section
   */
  static addAgreementDetails(doc, data) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('AGREEMENT DETAILS')
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Status: ${data.status.toUpperCase()}`)
      .text(`Created: ${new Date(data.createdAt).toLocaleDateString()}`)
      .text(`Start Date: ${new Date(data.project.startDate).toLocaleDateString()}`)
      .text(`Expected End Date: ${new Date(data.project.expectedEndDate).toLocaleDateString()}`)
      .moveDown(1);
  }

  /**
   * Add parties information
   */
  static addPartiesInfo(doc, data) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PARTIES INVOLVED')
      .moveDown(0.5);

    // Client Info
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Client:')
      .fontSize(10)
      .font('Helvetica')
      .text(`Name: ${data.client.profile?.name || 'N/A'}`)
      .text(`Email: ${data.client.email}`)
      .text(`Wallet Address: ${data.client.walletAddress}`)
      .moveDown(0.5);

    // Developer Info
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Developer:')
      .fontSize(10)
      .font('Helvetica')
      .text(`Name: ${data.developer.profile?.name || 'N/A'}`)
      .text(`Email: ${data.developer.email}`)
      .text(`Wallet Address: ${data.developer.walletAddress}`)
      .moveDown(1);
  }

  /**
   * Add project details
   */
  static addProjectDetails(doc, data) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PROJECT DETAILS')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Project Name: ${data.project.name}`)
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Description:', { continued: false })
      .text(data.project.description, {
        align: 'justify',
        width: 495
      })
      .moveDown(0.5);

    if (data.project.deliverables && data.project.deliverables.length > 0) {
      doc
        .font('Helvetica-Bold')
        .text('Deliverables:')
        .font('Helvetica');

      data.project.deliverables.forEach((deliverable, index) => {
        doc.text(`${index + 1}. ${deliverable}`);
      });
    }

    doc.moveDown(1);
  }

  /**
   * Add financial terms
   */
  static addFinancialTerms(doc, data) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('FINANCIAL TERMS')
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Total Contract Value: ${data.financials.totalValue} ${data.financials.currency}`)
      .text(`Platform Fee (${data.financials.platformFee.percentage}%): ${data.financials.platformFee.amount} ${data.financials.currency}`)
      .text(`Payment Type: Milestone-based Escrow`)
      .moveDown(1);
  }

  /**
   * Add milestones section
   */
  static addMilestones(doc, data) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PROJECT MILESTONES')
      .moveDown(0.5);

    if (data.milestones && data.milestones.length > 0) {
      data.milestones.forEach((milestone, index) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`Milestone ${index + 1}: ${milestone.title}`)
          .fontSize(10)
          .font('Helvetica')
          .text(`Description: ${milestone.description}`)
          .text(`Value: ${milestone.financials.value} ${milestone.financials.currency}`)
          .text(`Due Date: ${new Date(milestone.timeline.dueDate).toLocaleDateString()}`)
          .text(`Status: ${milestone.status}`)
          .moveDown(0.5);
      });
    }

    doc.moveDown(0.5);
  }

  /**
   * Add terms and conditions
   */
  static addTermsAndConditions(doc, data) {
    // Add new page if needed
    if (doc.y > 650) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('TERMS AND CONDITIONS')
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica');

    if (data.terms?.paymentTerms) {
      doc
        .font('Helvetica-Bold')
        .text('Payment Terms:')
        .font('Helvetica')
        .text(data.terms.paymentTerms, { align: 'justify' })
        .moveDown(0.5);
    }

    if (data.terms?.cancellationPolicy) {
      doc
        .font('Helvetica-Bold')
        .text('Cancellation Policy:')
        .font('Helvetica')
        .text(data.terms.cancellationPolicy, { align: 'justify' })
        .moveDown(0.5);
    }

    // Default terms
    doc
      .font('Helvetica-Bold')
      .text('General Terms:')
      .font('Helvetica')
      .text('1. This agreement is facilitated through the CodeDript platform.')
      .text('2. All payments are processed through smart contracts on the Ethereum blockchain.')
      .text('3. Funds are held in escrow until milestone completion and approval.')
      .text('4. Both parties agree to communicate in good faith throughout the project.')
      .text('5. Any disputes will be handled through the platform\'s dispute resolution process.')
      .moveDown(1);
  }

  /**
   * Add signature section
   */
  static addSignatureSection(doc, data) {
    // Add new page if needed
    if (doc.y > 600) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('DIGITAL SIGNATURES')
      .moveDown(1);

    const leftX = 80;
    const rightX = 320;
    const signatureY = doc.y;

    // Client signature
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Client:', leftX, signatureY)
      .font('Helvetica')
      .text(data.client.profile?.name || 'N/A', leftX, signatureY + 15)
      .text(data.client.walletAddress, leftX, signatureY + 30, { width: 200 })
      .text(
        data.signatures?.client?.signed
          ? `Signed: ${new Date(data.signatures.client.signedAt).toLocaleString()}`
          : 'Status: Pending',
        leftX,
        signatureY + 50
      );

    // Developer signature
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Developer:', rightX, signatureY)
      .font('Helvetica')
      .text(data.developer.profile?.name || 'N/A', rightX, signatureY + 15)
      .text(data.developer.walletAddress, rightX, signatureY + 30, { width: 200 })
      .text(
        data.signatures?.developer?.signed
          ? `Signed: ${new Date(data.signatures.developer.signedAt).toLocaleString()}`
          : 'Status: Pending',
        rightX,
        signatureY + 50
      );

    doc.moveDown(4);
  }

  /**
   * Add footer to PDF
   */
  static addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          `CodeDript Platform | Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
    }
  }
}

module.exports = PDFGenerator;
