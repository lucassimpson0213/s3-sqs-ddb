import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeEvent, S3Event, SQSEvent, SQSRecord } from 'aws-lambda'
import { SQSBatchItemFailure} from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const HASH_TABLE_NAME = process.env.HASH_TABLE_NAME!
const FILE_TABLE_NAME = process.env.FILE_TABLE_NAME
const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

const db = DynamoDBDocument.from(new DynamoDBClient({}))
export const handler = async (event: SQSEvent): Promise<any> => {
    if (!event.Records) {
        return {
            statusCode: 400,
            body: "invalid response: no records to process"
        }
    }



    let batchItemFailures: SQSBatchItemFailure[] = []
    for (const record of event.Records) {


        try {
            await processRecord(record);
        }
        catch (error) {
            batchItemFailures.push({ itemIdentifier: record.messageId })
        }
    }

    type CustomDetailType = {
        version: string
        bucket: {
            "name": string
        }
        object: {
            "key": string,
            "size": number,
            "eTag": string | undefined,
            "versionId": string | undefined
        }

    }
    async function processRecord(individualRecord: SQSRecord) {
        let eventSource = JSON.parse(individualRecord.body)


        if (eventSource.source === "aws.s3") {
            const eventSourceCloned: EventBridgeEvent<"Object-Created", CustomDetailType> = structuredClone(eventSource)

            try {
                await db.send(new TransactWriteCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: HASH_TABLE_NAME,
                                Item: { hashId: eventSourceCloned.detail.object.eTag, createdAt: Date.now(), ttl },
                                ConditionExpression: 'attribute_not_exists(hashId)',
                            }
                        },
                        {
                            Put: {
                                TableName: FILE_TABLE_NAME,
                                Item: {
                                    fileID: eventSourceCloned.detail.bucket.name + "/" + eventSourceCloned.detail.object.key, bucket: eventSourceCloned.detail.bucket.name, key: eventSourceCloned.detail.object.key, size: eventSourceCloned.detail.object.size, etag: eventSourceCloned.detail.object.eTag, createdAt: Date.now()
                                },
                            }
                        }
                    ]
                    // , ReturnConsumedCapacity: 'TOTAL' // optional for observability
                }));

                return {
                    statusCode: 200,
                    body: "file successfully inserted"
                }




            }
            catch (error) {
                return {
                    statusCode: 200,
                    message: "file process failed because of idempotency"
                }
            }


        }
        return {
            statusCode: 500,
            body: "unknown code path error"
        }





    }
}