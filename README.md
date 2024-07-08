# workDemo

This project features two Lambda functions: one implemented in Python and another in TypeScript. It leverages AWS SAM for deployment and integrates with OpenAI's MyMatcher assistant for AI model optimization.

Due to security policies, API keys are not provided and need to be added manually.

@To compile:
For Python (using pip):

	Navigate to the directory where your Lambda handler (Python) is located.
	Execute pip install <package-name> to install necessary Python packages.

For TypeScript (using npm and tsc):

	Navigate to the directory where your Lambda handler (TypeScript) is located.
	Run npm install to install dependencies specified in package.json.
	Compile TypeScript to JavaScript using tsc if TypeScript code needs to be compiled.

@To deploy using SAM:

Run sam init, sam build, and deploy in the root directory.
To install dependencies in the directory where the Lambda handler resides:

@To test with Postman 
	using the message body:
	{
		"message": "David"
	}
	Ensure your Lambda function handles incoming requests correctly based on this structure.

@For AI model optimization,
	Find the MyMatcher assistant on OpenAI, and fine-tune it freely using prompt words.

@workable prompt
Given the user's input name, find the best matched name from the list below (David Smith |大卫 斯密斯, Yueling Zhang |月林张, Huawen Wu |华文吴, Annie Lee|李安妮)
Note: Separate each person's name with commas, with English before Chinese. Last names and given names can be combined in any order.
