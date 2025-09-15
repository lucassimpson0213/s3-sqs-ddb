import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import  * as s3 from 'aws-cdk-lib/aws-s3'
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as db from 'aws-cdk-lib/aws-dynamodb'
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';


export class S3SqsDdbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'school-project-bucket', {
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true ,
    })

    const dlq = new sqs.Queue(this, 'DLQ', {
        fifo: true,
        contentBasedDeduplication: true
    })
    const queue = new sqs.Queue(this, 'school-project-queue-fifo', {
      deadLetterQueue: {queue: dlq, maxReceiveCount: 5},
      fifo: true,
      contentBasedDeduplication: true
    })

    
    const fileTable = new db.Table(this, 'FileInfoTable', {
      partitionKey: {name: 'fileId', type: db.AttributeType.STRING},
      billingMode: db.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl'
    })

    const hashTable = new db.Table(this, 'HashInfoTable', {
      partitionKey: {name: 'hashId', type: db.AttributeType.STRING},
      billingMode: db.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl'
    })
    
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: '/Users/lucassimpson/aws-project/s3-sqs-ddb/package-lock.json',
      environment: {
        PRIMARY_KEY_FILE: 'fileId',
        PRIMARY_KEY_HASH: 'HashId',
        FILE_TABLE_NAME: fileTable.tableName,
        HASH_TABLE_NAME: hashTable.tableName
      },
      runtime: Runtime.NODEJS_20_X,
    }

    
    const consumeQueue = new NodejsFunction(this, 'consumeQueueFunction', {
      entry: join(__dirname, 'lambdas', 'consume-queue.ts'),
      ...nodeJsFunctionProps
    })

    consumeQueue.addEventSource(new eventsources.SqsEventSource(queue, {
      reportBatchItemFailures: true
    }))
    queue.grantConsumeMessages(consumeQueue)

    fileTable.grantReadWriteData(consumeQueue)
    hashTable.grantReadWriteData(consumeQueue)


  }
}
