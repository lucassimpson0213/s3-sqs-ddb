File Processing Pipeline: JSON, CSV


S3 -> EventBridge -> SQS -> Lambda -> DynamoDB

The Architecture is defined in the s3-sqs-ddb-stack.ts file declaraativley
using the AWS CDK:
-> https://docs.aws.amazon.com/cdk/v2/guide/home.html


Upon File Upload, Object Created Events are sent to EventBridge:
  EventBridge has the following configuration
  <img width="1165" height="297" alt="image" src="https://github.com/user-attachments/assets/84747a80-e476-4d83-90f2-b9490d1de128" />


  SQS recieves the event and handles each record in that batch, with failed batches going to the Dead Letter Queue for reprocessing and
  evaluation.

  Uses partial batch response so only failed messages are retried.
  Writes to DynamoDB with TransactWrite for idempotency (de-dupe via hash/etag).
  

