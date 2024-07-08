import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import  OpenAI from 'openai';  

// init OpenAI client
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '' // Read API key from environment variable
});

async function getOrCreateAssistant(): Promise<any> {
    // find old Assistant
    console.log( "get env is ",process.env.OPENAI_API_KEY);
    const assistants = await client.beta.assistants.list();
    for (const assistant of assistants.data) {
        if (assistant.name === "myMatcher") {
            console.log(`Found existing Assistant: ${assistant}`);
            return assistant;
        }
    }

    // create Assistant
    const assistant = await client.beta.assistants.create({
        model: "gpt-3.5-turbo",
        instructions: `Given the user's input name, find the best matched name from the list below (David Smith |大卫 斯密斯, Yueling Zhang |月林张, Huawen Wu |华文吴, Annie Lee|李安妮)
Note: Separate each person's name with commas, with English before Chinese. Last names and given names can be combined in any order.`,
        name: "myMatcher"
    });
    console.log(`Created new Assistant: ${assistant}`);
    return assistant;
}

async function createThread(): Promise<any> {

    const thread = await client.beta.threads.create();
    console.log(`Created new Thread: ${thread}`);
    return thread;
}

async function addMessageToThread(threadId: string, content: string): Promise<any> {
    // add Thread message
    return client.beta.threads.messages.create( 
        threadId,
        {
        role: "user",
        content: content
    });
}

async function runAssistant(threadId: string, assistantId: string): Promise<any> {

    return client.beta.threads.runs.create( threadId,
        {
          assistant_id: assistantId,
          instructions: "Please return the best matched name consistently.",
        }
 
    );
}

async function retrieveRun(threadId: string, runId: string): Promise<any> {
    interface IMessageContent {
        type: string;
        text: {
            value: string;
            annotations: any[]; // 这里可以根据实际情况定义注解的类型
        };
        // 可以根据需要添加其他字段
    }
    
    while (true) {
        const keepRetrievingRun = await client.beta.threads.runs.retrieve(
            threadId,
            runId
        );
        console.log(`Run status: ${keepRetrievingRun.status}`);
 
        if (keepRetrievingRun.status === "completed") {
            const allMessages = await client.beta.threads.messages.list( threadId );
            //  const userMessage = allMessages.data[0].content[0]?.text?.value;
            //  const assistantResponse = allMessages.data[1].content[0]?.text?.value;
            // const userMessage = allMessages.data[0].content[0];
            // const assistantResponse = allMessages.data[1].content[0];
            // console.log(`User: ${userMessage}`);
            // console.log(`Assistant: ${assistantResponse}`);
            let userMessage: string = '';
            let assistantResponse: string = '';
            for (const message of allMessages.data) {
                if (message.role === 'user' && message.content.length > 0 && message.content[0].type === 'text') {
                    userMessage = message.content[0].text.value;
                    break; // 只取第一个匹配到的用户消息
                }
            }

            for (const message of allMessages.data) {
                if (message.role === 'assistant' && message.content.length > 0 && message.content[0].type === 'text') {
                    assistantResponse = message.content[0].text.value;
                    break; // 只取第一个匹配到的助手回复
                }
            }

            // const assistantResponse = (allMessages.data[1].content[0]?.text?.value as string) || '';
        
            // console.log(`User: ${userMessage}`);
            // console.log(`Assistant: ${assistantResponse}`);
            return {
                userMessage: userMessage,
                assistantResponse: assistantResponse
            };
        } else if (keepRetrievingRun.status !== "queued" && keepRetrievingRun.status !== "in_progress") {
            console.log(`Run status: ${keepRetrievingRun.status}`);
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
}

export async function lambdaHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        // deal POST body
        const body = JSON.parse(event.body || '');
        const inputMessage = body.message;

        // get or create Assistant
        const myAssistant = await getOrCreateAssistant();
        console.log(`This is the assistant object: ${myAssistant}`);

        // create Thread
        const myThread = await createThread();
        console.log(`This is the thread object: ${myThread}`);

        // add m to Thread
        const myThreadMessage = await addMessageToThread(myThread.id, inputMessage);
        console.log(`This is the message object: ${myThreadMessage}`);

        // run Assistant
        const myRun = await runAssistant(myThread.id, myAssistant.id);
        console.log(`This is the run object: ${myRun}`);

        // check res
        const result = await retrieveRun(myThread.id, myRun.id);

        // ret
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.log(`Error: ${error}`);

        return {
            statusCode: 500,
            // body: JSON.stringify({ error: error.toString() })
            body: JSON.stringify({ error: String })
        };
    }
}

// // local test
// async function main() {
//     try {
//         // sim  API Gateway envent
//         const event: APIGatewayProxyEvent = {
//             body: JSON.stringify({ message: "Yuelin" }), // 可以修改为任何测试消息
//             headers: {},
//             httpMethod: 'POST',
//             isBase64Encoded: false,
//             path: '/',
//             pathParameters: null,
//             queryStringParameters: null,
//             multiValueQueryStringParameters: null,
//             stageVariables: null,
//             requestContext: {
//                 "accountId": "123456789012",
//                 "apiId": "r3pmxmplak",
//                 "domainName": "r3pmxmplak.execute-api.us-east-2.amazonaws.com",
//                 "domainPrefix": "r3pmxmplak",

//                 "requestId": "JKJaXmPLvHcESHA=",
//                 "routeKey": "ANY /nodejs-apig-function-1G3XMPLZXVXYI",
//                 "stage": "default",
//                 authorizer: undefined,
//                 protocol: '',
//                 httpMethod: '',
//                 identity: '',
//                 path: '',
//                 requestTimeEpoch: 0,
//                 resourceId: '',
//                 resourcePath: ''
//             }, 
//             resource: ''
//         };

//         //  
//         const result = await lambdaHandler(event);
//         console.log("Lambda response:", result);
//     } catch (error) {
//         console.error("Error:", error);
//     }
// }

//  
// if (require.main === module) {
//     main();
// }
