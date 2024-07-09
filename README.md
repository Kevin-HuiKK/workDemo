## Project Overview and Deployment Guide

### Project Overview

The **workDemo** project is designed to showcase the latest OpenAI assistant, utilizing serverless Lambda functions to create a seamless user interface. This demo achieves the separation of AI channel development from AI model development, allowing independent tuning and testing of specific business models to adapt to various business needs. The project features two AWS Lambda functions, one implemented in Python and another in TypeScript. It leverages AWS Serverless Application Model (SAM) for deployment and integrates with OpenAI's MyMatcher assistant for AI model optimization. Due to security policies, API keys are not provided and need to be added manually.

### Compilation Instructions

#### Python Lambda Function

1. Navigate to the directory where your Python Lambda handler is located:
   ```bash
   cd lambda/openai
   ```
2. Install necessary Python packages using `pip` and the `requirements.txt` file:
   ```bash
   pip install -r requirements.txt
   ```

#### TypeScript Lambda Function

1. Navigate to the directory where your TypeScript Lambda handler is located:
   ```bash
   cd lambda/openai2
   ```
2. Install dependencies specified in `package.json` using `npm`:
   ```bash
   npm install
   ```
3. Compile TypeScript to JavaScript using the TypeScript compiler (`tsc`), if necessary:
   ```bash
   tsc
   ```

### Deployment Instructions using AWS SAM

1. Initialize the project:
   ```bash
   sam init
   ```
2. Build the project:
   ```bash
   sam build
   ```
3. Deploy the project:
   ```bash
   sam deploy
   ```

### Testing with Postman

To test the Lambda functions using Postman:

1. Use the following message body:
   ```json
   {
       "message": "David"
   }
   ```
2. Ensure your Lambda function handles incoming requests correctly based on this structure.

### AI Model Optimization with MyMatcher

1. Find the MyMatcher assistant on OpenAI.
2. Fine-tune it freely using prompt words for AI model optimization.

### Example Prompt

To match a user's input name with a list of names, use the following prompt:

```
Given the user's input name, find the best matched name from the list below (David Smith |大卫 斯密斯, Yueling Zhang |月林张, Huawen Wu |华文吴, Annie Lee|李安妮)
```

**Note:** Separate each person's name with commas, listing English names before Chinese names. Last names and given names can be combined in any order.
