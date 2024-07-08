import json
import time
from openai import OpenAI

client = OpenAI(api_key='xxx') 
# input your key

def get_or_create_assistant():
    assistants = client.beta.assistants.list()
    for assistant in assistants.data:
        if assistant.name == "myMatcher":
            print(f"Found existing Assistant: {assistant}")
            return assistant

    # create Assistant
    assistant = client.beta.assistants.create(
        model="gpt-3.5-turbo",
        instructions="Given the user's input name, find the best matched name from the list below (David Smith 大卫 斯密斯, Yueling Zhang 月林张, Huawen Wu 华文吴, Annie Lee 李安妮)",
        name="myMatcher",
    )
    print(f"Created new Assistant: {assistant}")
    return assistant

def create_thread():
 
    thread = client.beta.threads.create()
    print(f"Created new Thread: {thread}")
    return thread

def add_message_to_thread(thread_id, content):
    # send sms to Thread  
    return client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=content,
    )

def run_assistant(thread_id, assistant_id):
    # run Assistant
    return client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id,
        instructions="Please return the best matched name consistently."
    )

def retrieve_run(thread_id, run_id):
    while True:
        keep_retrieving_run = client.beta.threads.runs.retrieve(
            thread_id=thread_id,
            run_id=run_id
        )
        print(f"Run status: {keep_retrieving_run.status}")

        if keep_retrieving_run.status == "completed":
            all_messages = client.beta.threads.messages.list(thread_id=thread_id)
            user_message = all_messages.data[0].content[0].text.value
            assistant_response = all_messages.data[1].content[0].text.value

            print(f"User: {user_message}")
            print(f"Assistant: {assistant_response}")

            return {
                'user_message': user_message,
                'assistant_response': assistant_response
            }
        elif keep_retrieving_run.status not in ["queued", "in_progress"]:
            print(f"Run status: {keep_retrieving_run.status}")
            break
        
        time.sleep(1)  


def lambda_handler(event, context):
    try:

        body = json.loads(event['body'])
        input_message = body['message']

        my_assistant = get_or_create_assistant()
        print(f"This is the assistant object: {my_assistant} \n")

        my_thread = create_thread()
        print(f"This is the thread object: {my_thread} \n")

        my_thread_message = add_message_to_thread(my_thread.id, input_message)
        print(f"This is the message object: {my_thread_message} \n")

        # run Assistant
        my_run = run_assistant(my_thread.id, my_assistant.id)
        print(f"This is the run object: {my_run} \n")

        # check
        result = retrieve_run(my_thread.id, my_run.id)

        # ret
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def main():
    try:
        my_assistant = get_or_create_assistant()
        print(f"This is the assistant object: {my_assistant} \n")

        #  Thread
        my_thread = create_thread()
        print(f"This is the thread object: {my_thread} \n")

        # add sms Thread
        my_thread_message = add_message_to_thread(my_thread.id, "Yuelin")  # 可以修改为任何测试消息
        print(f"This is the message object: {my_thread_message} \n")

        # run Assistant
        my_run = run_assistant(my_thread.id, my_assistant.id)
        print(f"This is the run object: {my_run} \n")

        result = retrieve_run(my_thread.id, my_run.id)

        print("Final Result:")
        print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
