import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for storing resumes
    const resumesTable = new dynamodb.Table(this, 'ResumesTable', {
      partitionKey: { name: 'resumeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Use on-demand billing mode
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Not recommended for production
    });

    // Lambda function to handle CRUD operations on resumes
    const handler = new lambda.Function(this, 'ResumesHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'), // Directory containing your Lambda code
      handler: 'index.handler',
      environment: {
        TABLE_NAME: resumesTable.tableName,
      },
    });

    // Grant Lambda permissions to access DynamoDB
    resumesTable.grantReadWriteData(handler);

    // API Gateway to expose Lambda function as HTTP endpoints
    const api = new apigateway.RestApi(this, 'ResumesApi', {
      restApiName: 'Resumes API',
      description: 'API for managing resumes',
    });

    // Define API endpoints
    const resumes = api.root.addResource('resumes');
    const resumeId = resumes.addResource('{resumeId}');

    // Integration between API Gateway and Lambda function
    const integration = new apigateway.LambdaIntegration(handler);
    resumes.addMethod('GET', integration); // GET /resumes
    resumes.addMethod('POST', integration); // POST /resumes
    resumeId.addMethod('GET', integration); // GET /resumes/{resumeId}
    resumeId.addMethod('PUT', integration); // PUT /resumes/{resumeId}
    resumeId.addMethod('DELETE', integration); // DELETE /resumes/{resumeId}

    // Optionally, add IAM permissions for API Gateway to invoke Lambda
    const apiInvokeLambdaPolicy = new iam.PolicyStatement({
      actions: ['lambda:InvokeFunction'],
      resources: [handler.functionArn],
    });
    handler.addToRolePolicy(apiInvokeLambdaPolicy);

    // Output the API endpoint URL for reference
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });
  }
}
