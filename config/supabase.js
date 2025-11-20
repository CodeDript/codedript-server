const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Configuration
 * Handles file upload, retrieval, and management in Supabase Storage
 */

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'codedript-files';
    this.initialize();
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found in environment variables');
      console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY');
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false
        }
      });
      console.log('✅ Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Supabase client:', error.message);
      throw error;
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  async ensureBucket() {
    try {
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();

      if (listError) {
        throw listError;
      }

      const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { data, error } = await this.client.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        });

        if (error) {
          throw error;
        }

        console.log(`✅ Bucket '${this.bucketName}' created successfully`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error ensuring bucket exists:', error.message);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Name of the file
   * @param {string} folder - Folder path (e.g., 'contracts', 'milestones')
   * @param {string} contentType - MIME type of the file
   */
  async uploadFile(fileBuffer, fileName, folder = 'general', contentType = 'application/pdf') {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      await this.ensureBucket();

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folder}/${timestamp}-${sanitizedFileName}`;

      // Upload file
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.client.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        filePath: data.path,
        publicUrl: urlData.publicUrl,
        supabaseId: data.id,
        fileName: sanitizedFileName,
        folder,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error uploading file to Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Download file from Supabase Storage
   * @param {string} filePath - Path to the file in storage
   */
  async downloadFile(filePath) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data,
        blob: data
      };
    } catch (error) {
      console.error('❌ Error downloading file from Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Get signed URL for private file access
   * @param {string} filePath - Path to the file in storage
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
    } catch (error) {
      console.error('❌ Error generating signed URL:', error.message);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - Path to the file in storage
   */
  async deleteFile(filePath) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'File deleted successfully',
        deletedFiles: data
      };
    } catch (error) {
      console.error('❌ Error deleting file from Supabase:', error.message);
      throw error;
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   */
  async listFiles(folder = '') {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
        files: data,
        count: data.length
      };
    } catch (error) {
      console.error('❌ Error listing files from Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} filePath - Path to the file in storage
   */
  async getFileMetadata(filePath) {
    try {
      if (!this.client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
        metadata: data[0] || null
      };
    } catch (error) {
      console.error('❌ Error getting file metadata:', error.message);
      throw error;
    }
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return {
          status: 'unhealthy',
          message: 'Supabase client not initialized'
        };
      }

      // Try to list buckets as a health check
      const { data, error } = await this.client.storage.listBuckets();

      if (error) {
        throw error;
      }

      return {
        status: 'healthy',
        message: 'Supabase connection is healthy',
        buckets: data.length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Export singleton instance
const supabaseConfig = new SupabaseConfig();

module.exports = supabaseConfig;
