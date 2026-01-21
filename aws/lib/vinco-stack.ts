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

    // Albums table (legacy - kept for backwards compatibility)
    const albumsTable = new dynamodb.Table(this, 'AlbumsTable', {
      tableName: 'vinco-albums',
      partitionKey: { name: 'albumId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Tags Table - Hierarchical taxonomy system
    const tagsTable = new dynamodb.Table(this, 'TagsTable', {
      tableName: 'vinco-tags',
      partitionKey: { name: 'tagId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // GSI for querying by parent (to build tree structure)
    tagsTable.addGlobalSecondaryIndex({
      indexName: 'parent-index',
      partitionKey: { name: 'parentTagId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sortOrder', type: dynamodb.AttributeType.NUMBER },
    });

    // GSI for querying root-level tags (parentTagId = 'ROOT')
    tagsTable.addGlobalSecondaryIndex({
      indexName: 'type-index',
      partitionKey: { name: 'tagType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    });

    // Tagging Rules Table - Auto-assignment rules
    const taggingRulesTable = new dynamodb.Table(this, 'TaggingRulesTable', {
      tableName: 'vinco-tagging-rules',
      partitionKey: { name: 'ruleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // GSI for querying active rules by date range
    taggingRulesTable.addGlobalSecondaryIndex({
      indexName: 'active-rules-index',
      partitionKey: { name: 'isActive', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });

    // GSI for querying rules by photographer folder
    taggingRulesTable.addGlobalSecondaryIndex({
      indexName: 'folder-index',
      partitionKey: { name: 'folderPath', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });

    const exportPresetsTable = new dynamodb.Table(this, 'ExportPresetsTable', {
      tableName: 'vinco-export-presets',
      partitionKey: { name: 'presetId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // ==========================================
    // NEW TABLES - Migrated from WordPress MySQL
    // ==========================================

    // Athletes Table
    const athletesTable = new dynamodb.Table(this, 'AthletesTable', {
      tableName: 'vinco-athletes',
      partitionKey: { name: 'athleteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    athletesTable.addGlobalSecondaryIndex({
      indexName: 'name-index',
      partitionKey: { name: 'lastNameFirstChar', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastNameFirstName', type: dynamodb.AttributeType.STRING },
    });

    athletesTable.addGlobalSecondaryIndex({
      indexName: 'nationality-index',
      partitionKey: { name: 'nationality', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastNameFirstName', type: dynamodb.AttributeType.STRING },
    });

    // Events Table
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'vinco-events',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: 'date-index',
      partitionKey: { name: 'yearMonth', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: 'venue-index',
      partitionKey: { name: 'venueId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startDate', type: dynamodb.AttributeType.STRING },
    });

    // Event Schedules Table
    const eventSchedulesTable = new dynamodb.Table(this, 'EventSchedulesTable', {
      tableName: 'vinco-event-schedules',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    eventSchedulesTable.addGlobalSecondaryIndex({
      indexName: 'time-index',
      partitionKey: { name: 'scheduleDate', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduledTime', type: dynamodb.AttributeType.STRING },
    });

    // Start Lists Table
    const startListsTable = new dynamodb.Table(this, 'StartListsTable', {
      tableName: 'vinco-start-lists',
      partitionKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startListId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    startListsTable.addGlobalSecondaryIndex({
      indexName: 'athlete-index',
      partitionKey: { name: 'athleteId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
    });

    // Results Table
    const resultsTable = new dynamodb.Table(this, 'ResultsTable', {
      tableName: 'vinco-results',
      partitionKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'resultId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    resultsTable.addGlobalSecondaryIndex({
      indexName: 'athlete-results-index',
      partitionKey: { name: 'athleteId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'finishTime', type: dynamodb.AttributeType.STRING },
    });

    // Venues Table
    const venuesTable = new dynamodb.Table(this, 'VenuesTable', {
      tableName: 'vinco-venues',
      partitionKey: { name: 'venueId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    venuesTable.addGlobalSecondaryIndex({
      indexName: 'country-index',
      partitionKey: { name: 'country', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    });

    // Photographers Table
    const photographersTable = new dynamodb.Table(this, 'PhotographersTable', {
      tableName: 'vinco-photographers',
      partitionKey: { name: 'photographerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    photographersTable.addGlobalSecondaryIndex({
      indexName: 'wpUserId-index',
      partitionKey: { name: 'wpUserId', type: dynamodb.AttributeType.NUMBER },
    });

    photographersTable.addGlobalSecondaryIndex({
      indexName: 'ftpUsername-index',
      partitionKey: { name: 'ftpUsername', type: dynamodb.AttributeType.STRING },
    });

    // Image Notes Table
    const imageNotesTable = new dynamodb.Table(this, 'ImageNotesTable', {
      tableName: 'vinco-image-notes',
      partitionKey: { name: 'imageId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'noteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    imageNotesTable.addGlobalSecondaryIndex({
      indexName: 'user-notes-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Activity Log Table (with TTL for auto-expiry)
    const activityLogTable = new dynamodb.Table(this, 'ActivityLogTable', {
      tableName: 'vinco-activity-log',
      partitionKey: { name: 'entityKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    activityLogTable.addGlobalSecondaryIndex({
      indexName: 'user-activity-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
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

    // FTP Watcher Lambda - Monitors FileMage FTP uploads
    const ftpWatcher = new lambda.Function(this, 'FtpWatcher', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/ftp-watcher'),
      layers: [sharedLayer],
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
        IMAGE_PROCESSOR_QUEUE_URL: aiProcessingQueue.queueUrl, // Reuse AI queue for processing
        FILEMAGE_WATCH_FOLDERS: '', // Set via environment variable or SSM Parameter Store
      },
    });

    uploadsBucket.grantRead(ftpWatcher);
    aiProcessingQueue.grantSendMessages(ftpWatcher);

    // Note: FTP watcher is triggered via EventBridge scheduler or FileMage webhooks,
    // not via S3 events (to avoid conflicts with the Image Processor)

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
        TAGGING_RULES_TABLE: taggingRulesTable.tableName,
        TAGS_TABLE: tagsTable.tableName,
      },
    });

    uploadsBucket.grantRead(imageProcessor);
    imagesBucket.grantReadWrite(imageProcessor);
    imagesTable.grantReadWriteData(imageProcessor);
    aiProcessingQueue.grantSendMessages(imageProcessor);
    rawProcessingQueue.grantSendMessages(imageProcessor);
    taggingRulesTable.grantReadData(imageProcessor);
    tagsTable.grantReadWriteData(imageProcessor);

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
        ATHLETES_TABLE: athletesTable.tableName,
        START_LISTS_TABLE: startListsTable.tableName,
      },
    });

    imagesBucket.grantRead(aiRecognition);
    platformStorageBucket.grantReadWrite(aiRecognition);
    imagesTable.grantReadWriteData(aiRecognition);
    validationQueueTable.grantReadWriteData(aiRecognition);
    connectionsTable.grantReadData(aiRecognition);
    athletesTable.grantReadData(aiRecognition);
    startListsTable.grantReadData(aiRecognition);

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

    // API Lambda Functions
    const apiCommonEnv = {
      IMAGES_TABLE: imagesTable.tableName,
      IMAGES_BUCKET: imagesBucket.bucketName,
      EXPORTS_BUCKET: exportsBucket.bucketName,
      EDIT_VERSIONS_TABLE: editVersionsTable.tableName,
      ALBUMS_TABLE: albumsTable.tableName,
      VALIDATION_TABLE: validationQueueTable.tableName,
      EXPORT_PRESETS_TABLE: exportPresetsTable.tableName,
      EXPORT_QUEUE_URL: exportQueue.queueUrl,
      // New tables - migrated from WordPress
      ATHLETES_TABLE: athletesTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
      EVENT_SCHEDULES_TABLE: eventSchedulesTable.tableName,
      START_LISTS_TABLE: startListsTable.tableName,
      RESULTS_TABLE: resultsTable.tableName,
      VENUES_TABLE: venuesTable.tableName,
      PHOTOGRAPHERS_TABLE: photographersTable.tableName,
      IMAGE_NOTES_TABLE: imageNotesTable.tableName,
      TAGS_TABLE: tagsTable.tableName,
      TAGGING_RULES_TABLE: taggingRulesTable.tableName,
      ACTIVITY_LOG_TABLE: activityLogTable.tableName,
    };

    // Images API
    const imagesList = new lambda.Function(this, 'ImagesList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesGet = new lambda.Function(this, 'ImagesGet', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesUpdate = new lambda.Function(this, 'ImagesUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesSaveEdits = new lambda.Function(this, 'ImagesSaveEdits', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'saveEdits.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesVersions = new lambda.Function(this, 'ImagesVersions', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getVersions.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesRevert = new lambda.Function(this, 'ImagesRevert', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'revert.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesExport = new lambda.Function(this, 'ImagesExport', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'export.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesDownload = new lambda.Function(this, 'ImagesDownload', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'download.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const imagesUpload = new lambda.Function(this, 'ImagesUpload', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('lambda/api/images'),
      layers: [sharedLayer],
      environment: {
        ...apiCommonEnv,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
      },
    });

    // Grant S3 permissions to upload function
    uploadsBucket.grantPut(imagesUpload);

    // Albums API
    const albumsList = new lambda.Function(this, 'AlbumsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/albums'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const albumsCreate = new lambda.Function(this, 'AlbumsCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/albums'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const albumsUpdate = new lambda.Function(this, 'AlbumsUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/api/albums'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const albumsAddImages = new lambda.Function(this, 'AlbumsAddImages', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'addImages.handler',
      code: lambda.Code.fromAsset('lambda/api/albums'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const albumsGet = new lambda.Function(this, 'AlbumsGet', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/api/albums'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Validation API
    const validationQueue = new lambda.Function(this, 'ValidationQueue', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'queue.handler',
      code: lambda.Code.fromAsset('lambda/api/validation'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const validationApprove = new lambda.Function(this, 'ValidationApprove', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'approve.handler',
      code: lambda.Code.fromAsset('lambda/api/validation'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const validationReject = new lambda.Function(this, 'ValidationReject', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'reject.handler',
      code: lambda.Code.fromAsset('lambda/api/validation'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const validationReassign = new lambda.Function(this, 'ValidationReassign', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'reassign.handler',
      code: lambda.Code.fromAsset('lambda/api/validation'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const validationClaim = new lambda.Function(this, 'ValidationClaim', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'claim.handler',
      code: lambda.Code.fromAsset('lambda/api/validation'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Grant permissions
    imagesBucket.grantRead(imagesGet);
    imagesBucket.grantRead(imagesDownload);
    imagesTable.grantReadWriteData(imagesList);
    imagesTable.grantReadWriteData(imagesGet);
    imagesTable.grantReadWriteData(imagesUpdate);
    imagesTable.grantReadWriteData(imagesSaveEdits);
    imagesTable.grantReadWriteData(imagesRevert);
    imagesTable.grantReadWriteData(imagesExport);
    editVersionsTable.grantReadWriteData(imagesSaveEdits);
    editVersionsTable.grantReadWriteData(imagesVersions);
    editVersionsTable.grantReadWriteData(imagesRevert);
    albumsTable.grantReadWriteData(albumsList);
    albumsTable.grantReadWriteData(albumsCreate);
    albumsTable.grantReadWriteData(albumsUpdate);
    albumsTable.grantReadWriteData(albumsAddImages);
    albumsTable.grantReadData(albumsGet);
    imagesTable.grantReadData(albumsAddImages);
    validationQueueTable.grantReadData(validationQueue);
    validationQueueTable.grantReadWriteData(validationClaim);
    validationQueueTable.grantReadWriteData(validationApprove);
    validationQueueTable.grantReadWriteData(validationReject);
    validationQueueTable.grantReadWriteData(validationReassign);
    imagesTable.grantReadWriteData(validationApprove);
    imagesTable.grantReadWriteData(validationReject);
    exportQueue.grantSendMessages(imagesExport);

    // Image notes permissions
    imageNotesTable.grantReadWriteData(imagesUpdate);
    imageNotesTable.grantReadWriteData(imagesGet);

    // REST API
    const api = new apigateway.RestApi(this, 'VincoApi', {
      restApiName: 'Vinco MAM API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Images API Routes
    const images = api.root.addResource('images');
    images.addMethod('GET', new apigateway.LambdaIntegration(imagesList));
    
    const image = images.addResource('{imageId}');
    image.addMethod('GET', new apigateway.LambdaIntegration(imagesGet));
    image.addMethod('PUT', new apigateway.LambdaIntegration(imagesUpdate));
    
    image.addResource('edits').addMethod('POST', new apigateway.LambdaIntegration(imagesSaveEdits));
    const imageVersions = image.addResource('versions');
    imageVersions.addMethod('GET', new apigateway.LambdaIntegration(imagesVersions));
    imageVersions.addResource('{versionTimestamp}').addMethod('POST', new apigateway.LambdaIntegration(imagesRevert));
    image.addResource('export').addMethod('POST', new apigateway.LambdaIntegration(imagesExport));
    image.addResource('download').addResource('{type}').addMethod('GET', new apigateway.LambdaIntegration(imagesDownload));

    // Upload endpoint for browser uploads
    images.addResource('upload').addMethod('POST', new apigateway.LambdaIntegration(imagesUpload));

    // Albums API Routes (legacy)
    const albums = api.root.addResource('albums');
    albums.addMethod('GET', new apigateway.LambdaIntegration(albumsList));
    albums.addMethod('POST', new apigateway.LambdaIntegration(albumsCreate));

    const album = albums.addResource('{albumId}');
    album.addMethod('GET', new apigateway.LambdaIntegration(albumsGet));
    album.addMethod('PUT', new apigateway.LambdaIntegration(albumsUpdate));
    album.addResource('images').addMethod('POST', new apigateway.LambdaIntegration(albumsAddImages));

    // Tags API Lambda Functions
    const tagsList = new lambda.Function(this, 'TagsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/tags'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const tagsCreate = new lambda.Function(this, 'TagsCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/tags'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const tagsUpdate = new lambda.Function(this, 'TagsUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/api/tags'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const tagsDelete = new lambda.Function(this, 'TagsDelete', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/api/tags'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const tagsTree = new lambda.Function(this, 'TagsTree', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'tree.handler',
      code: lambda.Code.fromAsset('lambda/api/tags'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Tags table permissions
    tagsTable.grantReadData(tagsList);
    tagsTable.grantReadData(tagsTree);
    tagsTable.grantReadWriteData(tagsCreate);
    tagsTable.grantReadWriteData(tagsUpdate);
    tagsTable.grantReadWriteData(tagsDelete);
    imagesTable.grantReadWriteData(tagsUpdate); // For updating image tags

    // Tags API Routes
    const tags = api.root.addResource('tags');
    tags.addMethod('GET', new apigateway.LambdaIntegration(tagsList));
    tags.addMethod('POST', new apigateway.LambdaIntegration(tagsCreate));
    tags.addResource('tree').addMethod('GET', new apigateway.LambdaIntegration(tagsTree));

    const tag = tags.addResource('{tagId}');
    tag.addMethod('PUT', new apigateway.LambdaIntegration(tagsUpdate));
    tag.addMethod('DELETE', new apigateway.LambdaIntegration(tagsDelete));

    // Tagging Rules API Lambda Functions
    const taggingRulesList = new lambda.Function(this, 'TaggingRulesList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/tagging-rules'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const taggingRulesCreate = new lambda.Function(this, 'TaggingRulesCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/tagging-rules'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const taggingRulesUpdate = new lambda.Function(this, 'TaggingRulesUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/api/tagging-rules'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const taggingRulesDelete = new lambda.Function(this, 'TaggingRulesDelete', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/api/tagging-rules'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Tagging rules table permissions
    taggingRulesTable.grantReadData(taggingRulesList);
    taggingRulesTable.grantReadWriteData(taggingRulesCreate);
    taggingRulesTable.grantReadWriteData(taggingRulesUpdate);
    taggingRulesTable.grantReadWriteData(taggingRulesDelete);
    tagsTable.grantReadData(taggingRulesCreate); // To validate tag IDs

    // Tagging Rules API Routes
    const taggingRules = api.root.addResource('tagging-rules');
    taggingRules.addMethod('GET', new apigateway.LambdaIntegration(taggingRulesList));
    taggingRules.addMethod('POST', new apigateway.LambdaIntegration(taggingRulesCreate));

    const taggingRule = taggingRules.addResource('{ruleId}');
    taggingRule.addMethod('PUT', new apigateway.LambdaIntegration(taggingRulesUpdate));
    taggingRule.addMethod('DELETE', new apigateway.LambdaIntegration(taggingRulesDelete));

    // Validation API Routes
    const validation = api.root.addResource('validation');
    validation.addMethod('GET', new apigateway.LambdaIntegration(validationQueue));
    
    const queueItem = validation.addResource('{queueItemId}');
    queueItem.addResource('claim').addMethod('POST', new apigateway.LambdaIntegration(validationClaim));
    queueItem.addResource('approve').addMethod('POST', new apigateway.LambdaIntegration(validationApprove));
    queueItem.addResource('reject').addMethod('POST', new apigateway.LambdaIntegration(validationReject));
    queueItem.addResource('reassign').addMethod('POST', new apigateway.LambdaIntegration(validationReassign));

    // Athletes API (proxies to WordPress)
    const athletesList = new lambda.Function(this, 'AthletesList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/athletes'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const athletesCreate = new lambda.Function(this, 'AthletesCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/athletes'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const athletesUpdate = new lambda.Function(this, 'AthletesUpdate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/api/athletes'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const athletesUploadHeadshot = new lambda.Function(this, 'AthletesUploadHeadshot', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'uploadHeadshot.handler',
      code: lambda.Code.fromAsset('lambda/api/athletes'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    imagesBucket.grantReadWrite(athletesUploadHeadshot);

    // Athletes table permissions
    athletesTable.grantReadData(athletesList);
    athletesTable.grantReadWriteData(athletesCreate);
    athletesTable.grantReadWriteData(athletesUpdate);
    athletesTable.grantReadWriteData(athletesUploadHeadshot);

    // Grant Rekognition permissions to athletes headshot Lambda
    athletesUploadHeadshot.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'rekognition:IndexFaces',
        'rekognition:DeleteFaces',
      ],
      resources: ['*'],
    }));

    // Events API
    const eventsList = new lambda.Function(this, 'EventsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/events'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const eventsGetSchedule = new lambda.Function(this, 'EventsGetSchedule', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getSchedule.handler',
      code: lambda.Code.fromAsset('lambda/api/events'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const eventsGetResults = new lambda.Function(this, 'EventsGetResults', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getResults.handler',
      code: lambda.Code.fromAsset('lambda/api/events'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Events table permissions
    eventsTable.grantReadData(eventsList);
    eventSchedulesTable.grantReadData(eventsGetSchedule);
    startListsTable.grantReadData(eventsGetSchedule);
    resultsTable.grantReadData(eventsGetResults);
    athletesTable.grantReadData(eventsGetResults); // For athlete name lookup
    venuesTable.grantReadData(eventsList);

    // Venues API
    const venuesList = new lambda.Function(this, 'VenuesList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/venues'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const venuesCreate = new lambda.Function(this, 'VenuesCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/venues'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Venues table permissions
    venuesTable.grantReadData(venuesList);
    venuesTable.grantReadWriteData(venuesCreate);

    // Videos API
    const videosList = new lambda.Function(this, 'VideosList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/videos'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const videosGet = new lambda.Function(this, 'VideosGet', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/api/videos'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    imagesTable.grantReadData(videosList);
    imagesTable.grantReadData(videosGet);
    imagesBucket.grantRead(videosGet);

    // Users API (proxies to WordPress)
    const usersList = new lambda.Function(this, 'UsersList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/api/users'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const usersCreate = new lambda.Function(this, 'UsersCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/api/users'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const photographersList = new lambda.Function(this, 'PhotographersList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'photographers/list.handler',
      code: lambda.Code.fromAsset('lambda/api/users'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    const photographersCreate = new lambda.Function(this, 'PhotographersCreate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'photographers/create.handler',
      code: lambda.Code.fromAsset('lambda/api/users'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    // Photographers table permissions
    photographersTable.grantReadData(photographersList);
    photographersTable.grantReadWriteData(photographersCreate);

    // Search API
    const search = new lambda.Function(this, 'Search', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api/search'),
      layers: [sharedLayer],
      environment: apiCommonEnv,
    });

    imagesTable.grantReadData(search);
    albumsTable.grantReadData(search);
    athletesTable.grantReadData(search);
    eventsTable.grantReadData(search);

    // Athletes API Routes
    const athletes = api.root.addResource('athletes');
    athletes.addMethod('GET', new apigateway.LambdaIntegration(athletesList));
    athletes.addMethod('POST', new apigateway.LambdaIntegration(athletesCreate));
    const athlete = athletes.addResource('{athleteId}');
    athlete.addMethod('PUT', new apigateway.LambdaIntegration(athletesUpdate));
    athlete.addResource('headshot').addMethod('POST', new apigateway.LambdaIntegration(athletesUploadHeadshot));

    // Events API Routes
    const events = api.root.addResource('events');
    events.addMethod('GET', new apigateway.LambdaIntegration(eventsList));
    const event = events.addResource('{eventId}');
    const eventSchedule = event.addResource('schedule');
    eventSchedule.addMethod('GET', new apigateway.LambdaIntegration(eventsGetSchedule));
    const scheduleItem = eventSchedule.addResource('{scheduleId}');
    scheduleItem.addResource('results').addMethod('GET', new apigateway.LambdaIntegration(eventsGetResults));

    // Venues API Routes
    const venues = api.root.addResource('venues');
    venues.addMethod('GET', new apigateway.LambdaIntegration(venuesList));
    venues.addMethod('POST', new apigateway.LambdaIntegration(venuesCreate));

    // Videos API Routes
    const videos = api.root.addResource('videos');
    videos.addMethod('GET', new apigateway.LambdaIntegration(videosList));
    videos.addResource('{mediaId}').addMethod('GET', new apigateway.LambdaIntegration(videosGet));

    // Users API Routes
    const users = api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(usersList));
    users.addMethod('POST', new apigateway.LambdaIntegration(usersCreate));
    const photographers = users.addResource('photographers');
    photographers.addMethod('GET', new apigateway.LambdaIntegration(photographersList));
    photographers.addMethod('POST', new apigateway.LambdaIntegration(photographersCreate));

    // Search API Route
    api.root.addResource('search').addMethod('GET', new apigateway.LambdaIntegration(search));

    // WebSocket Lambda Functions
    const wsConnect = new lambda.Function(this, 'WebSocketConnect', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'connect.handler',
      code: lambda.Code.fromAsset('lambda/websocket'),
      layers: [sharedLayer],
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const wsDisconnect = new lambda.Function(this, 'WebSocketDisconnect', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'disconnect.handler',
      code: lambda.Code.fromAsset('lambda/websocket'),
      layers: [sharedLayer],
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const wsMessage = new lambda.Function(this, 'WebSocketMessage', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'message.handler',
      code: lambda.Code.fromAsset('lambda/websocket'),
      layers: [sharedLayer],
      environment: {
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // Grant permissions
    connectionsTable.grantReadWriteData(wsConnect);
    connectionsTable.grantReadWriteData(wsDisconnect);
    connectionsTable.grantReadWriteData(wsMessage);

    // Grant WebSocket API permissions
    wsConnect.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: ['*'],
    }));

    wsDisconnect.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: ['*'],
    }));

    wsMessage.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: ['*'],
    }));

    // WebSocket API
    const webSocketApi = new apigatewayv2.CfnApi(this, 'WebSocketApi', {
      name: 'VincoWebSocket',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    // WebSocket Integration
    const wsConnectIntegration = new apigatewayv2.CfnIntegration(this, 'WebSocketConnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsConnect.functionArn}/invocations`,
    });

    const wsDisconnectIntegration = new apigatewayv2.CfnIntegration(this, 'WebSocketDisconnectIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsDisconnect.functionArn}/invocations`,
    });

    const wsMessageIntegration = new apigatewayv2.CfnIntegration(this, 'WebSocketMessageIntegration', {
      apiId: webSocketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${wsMessage.functionArn}/invocations`,
    });

    // WebSocket Routes
    const wsConnectRoute = new apigatewayv2.CfnRoute(this, 'WebSocketConnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$connect',
      target: `integrations/${wsConnectIntegration.ref}`,
    });

    const wsDisconnectRoute = new apigatewayv2.CfnRoute(this, 'WebSocketDisconnectRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$disconnect',
      target: `integrations/${wsDisconnectIntegration.ref}`,
    });

    const wsMessageRoute = new apigatewayv2.CfnRoute(this, 'WebSocketMessageRoute', {
      apiId: webSocketApi.ref,
      routeKey: '$default',
      target: `integrations/${wsMessageIntegration.ref}`,
    });

    // WebSocket Stage
    const wsStage = new apigatewayv2.CfnStage(this, 'WebSocketStage', {
      apiId: webSocketApi.ref,
      stageName: 'prod',
      autoDeploy: true,
    });

    wsStage.addDependency(wsConnectRoute);
    wsStage.addDependency(wsDisconnectRoute);
    wsStage.addDependency(wsMessageRoute);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'REST API endpoint for WordPress integration',
    });

    new cdk.CfnOutput(this, 'WebSocketEndpoint', {
      value: `wss://${webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`,
      description: 'WebSocket API endpoint for real-time updates',
    });

    new cdk.CfnOutput(this, 'PlatformStorageBucketName', {
      value: platformStorageBucket.bucketName,
      description: 'S3 bucket for platform storage and backups',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for network isolation',
    });
  }
}
