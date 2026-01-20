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

    // API Gateway REST endpoint - populated after CDK deployment
    // Format: https://{api-id}.execute-api.{region}.amazonaws.com/prod
    const API_ENDPOINT = 'https://vinco-api.execute-api.eu-west-1.amazonaws.com/prod';

    // WebSocket endpoint for real-time updates - populated after CDK deployment
    // Format: wss://{api-id}.execute-api.{region}.amazonaws.com/prod
    const WEBSOCKET_ENDPOINT = 'wss://vinco-ws.execute-api.eu-west-1.amazonaws.com/prod';

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
    const PLUGIN_VERSION = '1.4.0';

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
     * Get JWT secret from wp-config.php
     * Must be defined in wp-config.php as: define('VINCO_JWT_SECRET', 'your-secret-here');
     *
     * @return string|false JWT secret or false if not defined
     */
    public static function get_jwt_secret() {
        if (defined('VINCO_JWT_SECRET')) {
            return VINCO_JWT_SECRET;
        }

        // Fallback to database option (for backwards compatibility)
        $settings = get_option('vinco_mam_settings', []);
        return $settings['jwt_secret'] ?? false;
    }
}
