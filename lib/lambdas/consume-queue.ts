import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeEvent, S3Event, SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda'
import { SQSBatchItemFailure} from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const HASH_TABLE_NAME = process.env.HASH_TABLE_NAME!
const FILE_TABLE_NAME = process.env.FILE_TABLE_NAME
const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

const db = DynamoDBDocument.from(new DynamoDBClient({}))
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
    let batchItemFailures: SQSBatchItemFailure[] = [];
  
    if (!event.Records) {
        return {
            batchItemFailures: []
        }
    }



    
    for (const record of event.Records) {

        try {
            await processRecord(record);
        }
        catch (error) {
            batchItemFailures.push({ itemIdentifier: record.messageId })
        }
    }

    type S3ObjectEventDetail = {
        version: string
        bucket: {
            name: string
        }
        object: {
            key?: string,
            size?: number,
            eTag?: string,
            versionId?: string | undefined
        }

    }


    async function processRecord(individualRecord: SQSRecord) {
        let eventSource = JSON.parse(individualRecord.body) as EventBridgeEvent<"Object-Created", S3ObjectEventDetail>


        if (eventSource.source === "aws.s3") {
            const eTag = eventSource.detail.object.eTag ?? ""
            const bucket = eventSource.detail.bucket.name
            const size = eventSource.detail.object.size
            const key = eventSource.detail.object.key
            const createdAt = Date.now()
            

            try {
                await db.send(new TransactWriteCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: HASH_TABLE_NAME,
                                Item: { hashId: eTag, createdAt: Date.now(), ttl },
                                ConditionExpression: 'attribute_not_exists(hashId)',
                            }
                        },
                        {
                            Put: {
                                TableName: FILE_TABLE_NAME,
                                Item: {
                                    fileID: bucket + "/" + key, bucket: bucket, key: key, size: size, etag: eTag, createdAt: Date.now()
                                },
                            }
                        }
                    ]
                    
                }));


                console.log("file was successfully inserted")
                return {
                    batchItemFailures
                }




            }
            catch (error) {
                //log errors and return batch item failures to sqs
                console.log("There was an error inserting the record into the Database")
                return {
                  batchItemFailures
                }

            }


        }

        //if there are no errors just return batch item failures to sqs anyways
       return {
         batchItemFailures
       }





    }

    return {
        batchItemFailures
    }

    
}