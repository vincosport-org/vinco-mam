// aws/lib/vinco-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class VincoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for Lambda functions (with VPC endpoints for S3 and DynamoDB for security)
    const vpc = new ec2.Vpc(this, 'VincoVpc', {
      maxAzs: 2,
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Endpoints for S3 and DynamoDB (keeps traffic within AWS network)
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // S3 Buckets
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: 'vinco-uploads',
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: 'vinco-images',
      lifecycleRules: [{
        id: 'MoveOriginalsToGlacier',
        prefix: 'originals/',
        transitions: [{
          storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
          transitionAfter: cdk.Duration.days(30),
        }],
      }],
    });

    const exportsBucket = new s3.Bucket(this, 'ExportsBucket', {
      bucketName: 'vinco-exports',
      lifecycleRules: [{
        expiration: cdk.Duration.days(7),
      }],
    });

    // Platform storage bucket (for additional platform data, backups, etc.)
    const platformStorageBucket = new s3.Bucket(this, 'PlatformStorageBucket', {
      bucketName: 'vinco-platform-storage',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'TransitionToGlacier',
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        }],
      }],
    });

    // DynamoDB Tables
    const imagesTable = new dynamodb.Table(this, 'ImagesTable', {
      tableName: 'vinco-images',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    imagesTable.addGlobalSecondaryIndex({
      indexName: 'photographerId-uploadTime-index',
      partitionKey: { name: 'photographerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploadTime', type: dynamodb.AttributeType.STRING },
    });

    imagesTable.addGlobalSecondaryIndex({
      indexName: 'eventId-captureTime-index',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'captureTime', type: dynamodb.AttributeType.STRING },
    });

    const editVersionsTable = new dynamodb.Table(this, 'EditVersionsTable', {
      tableName: 'vinco-edit-versions',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'versionTimestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    const validationQueueTable = new dynamodb.Table(this, 'ValidationQueueTable', {
      tableName: 'vinco-validation-queue',
      partitionKey: { name: 'queueItemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    validationQueueTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    validationQueueTable.addGlobalSecondaryIndex({
      indexName: 'claimedBy-status-index',
      partitionKey: { name: 'claimedBy', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });

    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'vinco-websocket-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    connectionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const albumsTable = new dynamodb.Table(this, 'AlbumsTable', {
      tableName: 'vinco-albums',
      partitionKey: { name: 'albumId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const exportPresetsTable = new dynamodb.Table(this, 'ExportPresetsTable', {
      tableName: 'vinco-export-presets',
      partitionKey: { name: 'presetId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // SQS Queues
    const aiProcessingQueue = new sqs.Queue(this, 'AIProcessingQueue', {
      queueName: 'vinco-ai-processing',
      visibilityTimeout: cdk.Duration.minutes(5),
    });

    const rawProcessingQueue = new sqs.Queue(this, 'RawProcessingQueue', {
      queueName: 'vinco-raw-processing',
      visibilityTimeout: cdk.Duration.minutes(15),
    });

    const exportQueue = new sqs.Queue(this, 'ExportQueue', {
      queueName: 'vinco-export',
      visibilityTimeout: cdk.Duration.minutes(10),
    });

    // Lambda Layer for shared code
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
    });

    // Image Processor Lambda
    const imageProcessor = new lambda.Function(this, 'ImageProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/image-processor'),
      layers: [sharedLayer],
      timeout: cdk.Duration.minutes(1),
      memorySize: 1024,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        AI_QUEUE_URL: aiProcessingQueue.queueUrl,
        RAW_QUEUE_URL: rawProcessingQueue.queueUrl,
      },
    });

    uploadsBucket.grantRead(imageProcessor);
    imagesBucket.grantReadWrite(imageProcessor);
    imagesTable.grantReadWriteData(imageProcessor);
    aiProcessingQueue.grantSendMessages(imageProcessor);
    rawProcessingQueue.grantSendMessages(imageProcessor);

    // S3 trigger
    uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageProcessor),
      { prefix: 'photographers/' }
    );

    // RAW Processor (Container Lambda)
    const rawProcessor = new lambda.DockerImageFunction(this, 'RawProcessor', {
      code: lambda.DockerImageCode.fromImageAsset('lambda/raw-processor'),
      timeout: cdk.Duration.minutes(10),
      memorySize: 3008,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        AI_QUEUE_URL: aiProcessingQueue.queueUrl,
      },
    });

    uploadsBucket.grantRead(rawProcessor);
    imagesBucket.grantReadWrite(rawProcessor);
    imagesTable.grantReadWriteData(rawProcessor);
    aiProcessingQueue.grantSendMessages(rawProcessor);

    rawProcessor.addEventSource(new lambdaEventSources.SqsEventSource(rawProcessingQueue, {
      batchSize: 1,
    }));

    // AI Recognition Lambda (in VPC for network isolation)
    const aiRecognition = new lambda.Function(this, 'AIRecognition', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ai-recognition'),
      layers: [sharedLayer],
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        IMAGES_TABLE: imagesTable.tableName,
        VALIDATION_TABLE: validationQueueTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
        REKOGNITION_COLLECTION_ID: 'vinco-athletes',
        PLATFORM_STORAGE_BUCKET: platformStorageBucket.bucketName,
      },
    });

    imagesBucket.grantRead(aiRecognition);
    platformStorageBucket.grantReadWrite(aiRecognition);
    imagesTable.grantReadWriteData(aiRecognition);
    validationQueueTable.grantReadWriteData(aiRecognition);
    connectionsTable.grantReadData(aiRecognition);

    // Grant Rekognition permissions
    aiRecognition.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'rekognition:DetectFaces',
        'rekognition:SearchFacesByImage',
        'rekognition:DetectText',
        'rekognition:IndexFaces',
      ],
      resources: ['*'],
    }));

    aiRecognition.addEventSource(new lambdaEventSources.SqsEventSource(aiProcessingQueue, {
      batchSize: 5,
    }));

    // Export Renderer (Container Lambda)
    const exportRenderer = new lambda.DockerImageFunction(this, 'ExportRenderer', {
      code: lambda.DockerImageCode.fromImageAsset('lambda/export-renderer'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 3008,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        EXPORTS_BUCKET: exportsBucket.bucketName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    imagesBucket.grantRead(exportRenderer);
    exportsBucket.grantReadWrite(exportRenderer);
    connectionsTable.grantReadData(exportRenderer);

    exportRenderer.addEventSource(new lambdaEventSources.SqsEventSource(exportQueue, {
      batchSize: 1,
    }));

    // REST API
    const api = new apigateway.RestApi(this, 'VincoApi', {
      restApiName: 'Vinco MAM API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // WebSocket API
    const webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: 'VincoWebSocket',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'REST API endpoint for WordPress integration',
    });

    new cdk.CfnOutput(this, 'WebSocketEndpoint', {
      value: `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`,
      description: 'WebSocket API endpoint for real-time updates',
    });

    new cdk.CfnOutput(this, 'PlatformStorageBucket', {
      value: platformStorageBucket.bucketName,
      description: 'S3 bucket for platform storage and backups',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for network isolation',
    });
  }
}
