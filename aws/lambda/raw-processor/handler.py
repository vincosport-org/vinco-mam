import json
import boto3
import os
from raw_converter import convert_raw

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

IMAGES_BUCKET = os.environ.get('IMAGES_BUCKET')
IMAGES_TABLE = os.environ.get('IMAGES_TABLE')
AI_QUEUE_URL = os.environ.get('AI_QUEUE_URL')

def lambda_handler(event, context):
    bucket = event['bucket']
    key = event['key']
    photographer = event['photographer']
    
    # Download RAW file
    raw_path = f'/tmp/{key.split("/")[-1]}'
    s3.download_file(bucket, key, raw_path)
    
    try:
        # Extract embedded preview (fast)
        preview_path = convert_raw(raw_path, extract_preview=True)
        
        # Convert to high-quality JPEG proxy
        proxy_path = convert_raw(raw_path, output_size=2048)
        
        # Generate thumbnail
        thumbnail_path = convert_raw(raw_path, output_size=400)
        
        # Upload processed files
        # ... upload to S3
        
        # Save metadata to DynamoDB
        image_id = f"img_{int(context.aws_request_id, 16)}"
        table = dynamodb.Table(IMAGES_TABLE)
        table.put_item(Item={
            'imageId': image_id,
            'uploadTime': context.request_id,
            'photographerId': photographer,
            'status': 'READY',
            # ... more fields
        })
        
        # Queue for AI recognition
        sqs = boto3.client('sqs')
        sqs.send_message(
            QueueUrl=AI_QUEUE_URL,
            MessageBody=json.dumps({
                'imageId': image_id,
                's3Key': key,
            })
        )
        
        return {'statusCode': 200, 'body': json.dumps({'imageId': image_id})}
    except Exception as e:
        print(f"Error processing RAW: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
