
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

  

