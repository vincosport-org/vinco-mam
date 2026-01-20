<?php
// includes/class-vinco-webhooks.php

class Vinco_MAM_Webhooks {
    
    public function __construct() {
        add_action('rest_api_init', [$this, 'register_webhook_routes']);
    }
    
    public function register_webhook_routes() {
        // Webhook endpoint for AWS Lambda to notify WordPress of updates
        register_rest_route('vinco-mam/v1', '/webhook', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_webhook'],
            'permission_callback' => [$this, 'verify_webhook_signature'],
        ]);
    }
    
    public function verify_webhook_signature($request) {
        // Verify webhook signature from AWS
        // In production, use proper signature verification
        $settings = get_option('vinco_mam_settings');
        $secret = $settings['webhook_secret'] ?? '';
        
        // Basic verification - enhance in production
        $signature = $request->get_header('X-Webhook-Signature');
        $payload = $request->get_body();
        
        $expected_signature = hash_hmac('sha256', $payload, $secret);
        
        return hash_equals($expected_signature, $signature);
    }
    
    public function handle_webhook($request) {
        $event_type = $request->get_param('event');
        $data = $request->get_json_params();
        
        switch ($event_type) {
            case 'image.processed':
                $this->handle_image_processed($data);
                break;
            case 'recognition.complete':
                $this->handle_recognition_complete($data);
                break;
            case 'export.complete':
                $this->handle_export_complete($data);
                break;
            default:
                return new WP_Error('unknown_event', 'Unknown event type', ['status' => 400]);
        }
        
        return new WP_REST_Response(['success' => true], 200);
    }
    
    private function handle_image_processed($data) {
        // Handle image processed event from Lambda
        // Update WordPress database, clear caches, etc.
        do_action('vinco_image_processed', $data);
    }
    
    private function handle_recognition_complete($data) {
        // Handle recognition complete event
        // Update athlete associations, notify users, etc.
        do_action('vinco_recognition_complete', $data);
    }
    
    private function handle_export_complete($data) {
        // Handle export complete event
        // Notify user, update download links, etc.
        do_action('vinco_export_complete', $data);
    }
}
