const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase Configuration
 * Handles file upload, retrieval, and management in Supabase Storage
 */

class SupabaseConfig {
  constructor() {
    this.client = null;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'codedript-files';
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.lastError = null;
    this.initialize();
  }

  /**
   * Initialize Supabase client with enhanced configuration
   */
  initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Prefer service role key for server-side operations if provided.
    // The service role key has elevated privileges and MUST NOT be exposed to clients.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials missing');
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'x-application-name': 'codedript-server'
          }
        },
        db: {
          schema: 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      console.log('✅ Supabase client initialized');
      this.isConnected = true;
    } catch (error) {
      console.error(`❌ Supabase initialization failed: ${error.message}`);
      this.lastError = error.message;
      this.isConnected = false;
    }
  }

  /**
   * Retry wrapper for Supabase operations
   */
  async withRetry(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⚠️  Supabase operation failed, retrying in ${delay/1000}s... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Ensure bucket exists, create if not
   */
  async ensureBucket() {
    try {
      return await this.withRetry(async () => {
        const { data: buckets, error: listError } = await this.client.storage.listBuckets();

        if (listError) {
          throw listError;
        }

        const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);

        if (!bucketExists) {
          const { data, error } = await this.client.storage.createBucket(this.bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: [
              'application/pdf',
              'image/jpeg',
              'image/png',
              'image/gif',
              'text/plain'
            ]
          });

          if (error) {
            throw error;
          }

          console.log(`✅ Supabase bucket '${this.bucketName}' created`);
        }

        return true;
      });
    } catch (error) {
      console.error(`❌ Failed to ensure bucket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload file to Supabase Storage with retry logic
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

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty');
      }

      await this.ensureBucket();

      // Generate unique file path
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${folder}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;

      // Upload file with retry
      const uploadResult = await this.withRetry(async () => {
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

        return data;
      });

      // Get public URL
      const { data: urlData } = this.client.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        filePath: uploadResult.path,
        publicUrl: urlData.publicUrl,
        supabaseId: uploadResult.id,
        fileName: sanitizedFileName,
        folder,
        size: fileBuffer.length,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error(`❌ File upload failed: ${error.message}`);
      this.lastError = error.message;
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
      throw error;
    }
  }

  /**
   * Health check for Supabase connection with timeout
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return {
          status: 'unhealthy',
          message: 'Supabase client not initialized',
          lastError: this.lastError
        };
      }

      // Try to list buckets as a health check with timeout
      const checkPromise = this.client.storage.listBuckets();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout after 5s')), 5000)
      );
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]);

      if (error) {
        throw error;
      }

      const bucketExists = data.some(bucket => bucket.name === this.bucketName);

      return {
        status: 'healthy',
        message: 'Supabase connection is healthy',
        details: {
          buckets: data.length,
          targetBucket: this.bucketName,
          bucketExists,
          isConnected: this.isConnected
        }
      };
    } catch (error) {
      this.lastError = error.message;
      this.isConnected = false;
      return {
        status: 'unhealthy',
        message: error.message,
        lastError: this.lastError
      };
    }
  }
}

// Export singleton instance
const supabaseConfig = new SupabaseConfig();

module.exports = supabaseConfig;
