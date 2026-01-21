<?php
/**
 * Vinco MAM Configuration
 *
 * This file contains hardcoded configuration values specific to the Vinco deployment.
 * These values are set during installation and should not be changed via the admin UI.
 *
 * @package Vinco_MAM
 * @since 1.4.0
 */

defined('ABSPATH') || exit;

class Vinco_MAM_Config {

    /**
     * AWS Configuration
     * These values are set after CDK deployment and should not be changed via admin UI
     */

    // AWS Region - must match CDK deployment region
    const AWS_REGION = 'eu-west-1';

    // API Gateway REST endpoint - from VincoStack CDK deployment
    const API_ENDPOINT = 'https://o7s6ycao96.execute-api.eu-west-1.amazonaws.com/prod';

    // WebSocket endpoint for real-time updates - from VincoStack CDK deployment
    // Note: WebSocket API exists but stage not yet deployed
    const WEBSOCKET_ENDPOINT = 'wss://fh4kprq4vf.execute-api.eu-west-1.amazonaws.com/prod';

    // S3 Bucket names (must match CDK stack)
    const S3_UPLOADS_BUCKET = 'vinco-uploads';
    const S3_IMAGES_BUCKET = 'vinco-images';
    const S3_EXPORTS_BUCKET = 'vinco-exports';
    const S3_PLATFORM_BUCKET = 'vinco-platform-storage';

    // DynamoDB table names (must match CDK stack)
    const DYNAMODB_IMAGES_TABLE = 'vinco-images';
    const DYNAMODB_EDIT_VERSIONS_TABLE = 'vinco-edit-versions';
    const DYNAMODB_VALIDATION_TABLE = 'vinco-validation-queue';
    const DYNAMODB_ALBUMS_TABLE = 'vinco-albums';
    const DYNAMODB_CONNECTIONS_TABLE = 'vinco-websocket-connections';
    const DYNAMODB_EXPORT_PRESETS_TABLE = 'vinco-export-presets';

    // AWS Rekognition collection ID
    const REKOGNITION_COLLECTION_ID = 'vinco-athletes';

    /**
     * FileMage FTP Configuration
     */
    const FILEMAGE_API_URL = 'https://ftp.vincosport.com/api';

    /**
     * Default thresholds (can be overridden in settings)
     */
    const DEFAULT_AUTO_APPROVE_THRESHOLD = 85;
    const DEFAULT_REVIEW_THRESHOLD = 50;
    const DEFAULT_EDIT_VERSION_RETENTION_DAYS = 90;

    /**
     * Plugin defaults
     */
    const PLUGIN_VERSION = '1.5.5';

    /**
     * JWT Secret for authentication between WordPress and AWS
     * This is hardcoded for this deployment - must match the secret configured in AWS Lambda
     */
    const JWT_SECRET = 'cmJEI38/SORAD+6iPYoeZzWUiDPN3JZelLbC8FjKukpHZwGg4soYhd+guppYpgG4';

    /**
     * Get all configuration as array
     *
     * @return array Configuration values
     */
    public static function get_all() {
        return [
            'aws_region' => self::AWS_REGION,
            'api_endpoint' => self::API_ENDPOINT,
            'websocket_endpoint' => self::WEBSOCKET_ENDPOINT,
            's3_buckets' => [
                'uploads' => self::S3_UPLOADS_BUCKET,
                'images' => self::S3_IMAGES_BUCKET,
                'exports' => self::S3_EXPORTS_BUCKET,
                'platform' => self::S3_PLATFORM_BUCKET,
            ],
            'dynamodb_tables' => [
                'images' => self::DYNAMODB_IMAGES_TABLE,
                'edit_versions' => self::DYNAMODB_EDIT_VERSIONS_TABLE,
                'validation' => self::DYNAMODB_VALIDATION_TABLE,
                'albums' => self::DYNAMODB_ALBUMS_TABLE,
                'connections' => self::DYNAMODB_CONNECTIONS_TABLE,
                'export_presets' => self::DYNAMODB_EXPORT_PRESETS_TABLE,
            ],
            'rekognition_collection_id' => self::REKOGNITION_COLLECTION_ID,
            'filemage_api_url' => self::FILEMAGE_API_URL,
        ];
    }

    /**
     * Get API endpoint
     *
     * @return string API endpoint URL
     */
    public static function get_api_endpoint() {
        return self::API_ENDPOINT;
    }

    /**
     * Get WebSocket endpoint
     *
     * @return string WebSocket endpoint URL
     */
    public static function get_websocket_endpoint() {
        return self::WEBSOCKET_ENDPOINT;
    }

    /**
     * Get AWS region
     *
     * @return string AWS region
     */
    public static function get_aws_region() {
        return self::AWS_REGION;
    }

    /**
     * Get JWT secret
     * Uses hardcoded constant, with fallback to wp-config.php constant
     *
     * @return string JWT secret
     */
    public static function get_jwt_secret() {
        // Use hardcoded constant (primary)
        if (!empty(self::JWT_SECRET)) {
            return self::JWT_SECRET;
        }

        // Fallback to wp-config.php constant
        if (defined('VINCO_JWT_SECRET')) {
            return VINCO_JWT_SECRET;
        }

        // Last resort fallback to database (for backwards compatibility)
        $settings = get_option('vinco_mam_settings', []);
        return $settings['jwt_secret'] ?? '';
    }
}
