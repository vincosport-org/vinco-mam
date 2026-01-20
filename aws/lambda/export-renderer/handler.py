import json
import boto3
import os
from render import apply_edits, apply_watermark, resize_to_constraints, convert_color_space, handle_metadata, save_with_format

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

IMAGES_BUCKET = os.environ.get('IMAGES_BUCKET')
EXPORTS_BUCKET = os.environ.get('EXPORTS_BUCKET')
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE')

def lambda_handler(event, context):
    image_id = event['imageId']
    export_settings = event['settings']
    edits = event.get('edits', {})
    user_id = event['userId']
    export_id = event['exportId']
    
    try:
        # Download proxy image (or original if no resize needed)
        source_key = event['sourceKey']
        local_path = '/tmp/source.jpg'
        s3.download_file(IMAGES_BUCKET, source_key, local_path)
        
        # Load image
        from PIL import Image
        img = Image.open(local_path)
        
        # Apply edits
        if edits:
            img = apply_edits(img, edits)
        
        # Resize to constraints
        img = resize_to_constraints(
            img,
            max_pixels=export_settings.get('maxPixels'),
            max_file_size_mb=export_settings.get('maxFileSizeMB'),
            quality=export_settings.get('quality', 90)
        )
        
        # Apply watermark if requested
        if export_settings.get('watermark'):
            img = apply_watermark(img, export_settings['watermark'])
        
        # Convert color space
        img = convert_color_space(img, export_settings.get('colorSpace', 'SRGB'))
        
        # Handle metadata
        metadata = handle_metadata(img, export_settings.get('metadata', 'ALL'))
        
        # Save to temp
        output_format = export_settings.get('format', 'JPEG')
        output_path = f'/tmp/export.{output_format.lower()}'
        save_with_format(img, output_path, output_format, export_settings.get('quality', 90), metadata)
        
        # Upload to exports bucket
        export_key = f'exports/{user_id}/{image_id}/{export_id}.{output_format.lower()}'
        s3.upload_file(output_path, EXPORTS_BUCKET, export_key)
        
        # Generate pre-signed URL
        download_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': EXPORTS_BUCKET, 'Key': export_key},
            ExpiresIn=3600
        )
        
        # Broadcast completion via WebSocket
        broadcast_export_complete(user_id, image_id, export_id, download_url)
        
        return {
            'statusCode': 200,
            'exportId': export_id,
            'downloadUrl': download_url
        }
    except Exception as e:
        print(f"Error processing export: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e)
        }

def broadcast_export_complete(user_id, image_id, export_id, download_url):
    # WebSocket broadcasting would be implemented here
    # For now, just log
    print(f"Export complete: {export_id} for user {user_id}")
