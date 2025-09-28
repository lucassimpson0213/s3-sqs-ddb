File Processing Pipeline: JSON, CSV

---

# ☁️ 2. `s3-sqs-ddb`
An AWS serverless event pipeline.

```markdown
# S3 → SQS → Lambda → DynamoDB Pipeline

A serverless event-driven architecture that ingests files from S3, routes events via SQS, and persists metadata in DynamoDB. Built with AWS CDK.

## Features
- S3 bucket → EventBridge → SQS → Lambda
- Partial batch responses for resilience
- Idempotency checks to prevent double processing
- DynamoDB as the persistence layer



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

  
  

