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
        case "DELETE /markers/{id}":
          await dynamo
            .delete({
              TableName: MARKER_DB,
              Key: {
                id: event.pathParameters.id
              }
            })
            .promise();
          body = `Deleted item ${event.pathParameters.id}`;
          break;
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
        case "PUT /markers":
          requestJSON = JSON.parse(event.body);
          id = requestJSON.id || uuidv4()
          item = {
            id,
            latlng: requestJSON.latlng,
            image: requestJSON.image,
            creator,
            email,
          }
          await dynamo
            .put({
              TableName: MARKER_DB,
              Item: item
            })
            .promise();
          body = item;
          break;
        case "PUT /comments":
          requestJSON = JSON.parse(event.body);
          let mems = []
          if (requestJSON.mems) {
            mems = requestJSON.mems.map(mem => {
              return { id: uuidv4(), ...mem }
            })
          }
          id = requestJSON.id || uuidv4()
          item = {
            id,
            order: requestJSON.order,
            links: requestJSON.links,
            front: requestJSON.front,
            back: requestJSON.back,
            markerId: requestJSON.markerId,
            imageIndex: requestJSON.imageIndex,
            mems,
            creator,
            polygons: requestJSON.polygons,
            width: requestJSON.width,
          }
          await dynamo
            .put({
              TableName: COMMENT_DB,
              Item: item
            })
            .promise();
          body = item;
          break;
        case "GET /comments/{id}":
          // id is marker id

          params = {
            TableName: COMMENT_DB,
            FilterExpression: 'markerId = :markerId',
            ExpressionAttributeValues: {
              ':markerId': event.pathParameters.id
            },
          };

          body = await dynamo.scan(params).promise();

          break;
        case "GET /comments":
          body = await dynamo.scan({ TableName: COMMENT_DB }).promise();
          break;
        case "GET /mem":
          body = await dynamo.scan({ TableName: MEM_DB }).promise();
          break;
        case "PUT /mem":
          requestJSON = JSON.parse(event.body);
          id = requestJSON.id || uuidv4()
          item = {
            id,
            marker_id: requestJSON.markerId,
            image_index: requestJSON.imageIndex,
            image_key: requestJSON.image_key,
            creator,
            email,
          }
          await dynamo
            .put({
              TableName: MEM_DB,
              Item: item
            })
            .promise();
          body = item;
          break;
        case "GET /memage":
          body = await dynamo.scan({ TableName: MEMAGE_DB }).promise();
          break;
        case "PUT /memage":
          requestJSON = JSON.parse(event.body);
          id = requestJSON.id || uuidv4()
          item = {
            id,
            image_key: requestJSON.image_key,
            creator,
            email,
          }
          await dynamo
            .put({
              TableName: MEM_DB,
              Item: item
            })
            .promise();
          body = item;
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
