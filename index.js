const AWS = require("aws-sdk");
const { "v4": uuidv4 } = require('uuid');

const dynamo = new AWS.DynamoDB.DocumentClient();

const MARKER_DB = "memnut-markers"
const MEMAGE_DB = "memnut-memages"
const MEM_DB = "memnut-mems"
const COMMENT_DB = "memnut-comments"

exports.handler = async(event, context) => {
  let body;
  let statusCode = 200;
  let requestJSON;
  let id;
  let item;
  let params;
  const headers = {
    "Content-Type": "application/json",
  };
  const requestContext = event.requestContext
  if (requestContext) {
    const claims = requestContext.authorizer.jwt.claims
    const email = claims.email
    try {
      const creator = (u => ({
        name: u.name,
        family_name: u.family_name,
        given_name: u.given_name,
        picture: u.picture,
      }))(claims)

      switch (event.routeKey) {
        // case "DELETE /markers/{id}":
        //   await dynamo
        //     .delete({
        //       TableName: MARKER_DB,
        //       Key: {
        //         id: event.pathParameters.id
        //       }
        //     })
        //     .promise();
        //   body = `Deleted item ${event.pathParameters.id}`;
        //   break;
        case "GET /markers":
          params = {
            TableName: MARKER_DB,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': email
            },
          };
          body = await dynamo.scan(params).promise();
          break;
        case "GET /markers/{id}":
          body = await dynamo
            .get({
              TableName: MARKER_DB,
              Key: {
                id: event.pathParameters.id
              }
            })
            .promise();
          break;
        case "GET /mem":
          body = await dynamo.scan({ TableName: MEM_DB }).promise();
          break;
        case "GET /memages":
          body = await dynamo.scan({ TableName: MEMAGE_DB }).promise();
          break;
        default:
          throw new Error(`Unsupported route: "${event.routeKey}"`);
      }
    }
    catch (err) {
      statusCode = 400;
      body = event.routeKey + ": " + err.message;
    }
    finally {
      body = JSON.stringify(body);
    }
  }

  return {
    statusCode,
    body,
    headers
  };
};
