const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamo = new AWS.DynamoDB.DocumentClient();

const MARKER_DB = "memnut-markers";
const MEMAGE_DB = "memnut-memages";
const MEM_DB = "memnut-mems";

const getOwnItems = async (db, id, email) => {
  const params = {
    TableName: db,
    FilterExpression: "id = :id AND email = :email",
    ExpressionAttributeValues: {
      ":id": id,
      ":email": email,
    },
  };

  return await dynamo.scan(params).promise();
};

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  let requestJSON;
  let id;
  let item;
  let params;
  const headers = {
    "Content-Type": "application/json",
  };
  const requestContext = event.requestContext;
  if (requestContext) {
    const claims = requestContext.authorizer.jwt.claims;
    const email = claims.email;
    try {
      const creator = ((u) => ({
        name: u.name,
        family_name: u.family_name,
        given_name: u.given_name,
        picture: u.picture,
      }))(claims);

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
            FilterExpression: "email = :email",
            ExpressionAttributeValues: {
              ":email": email,
            },
          };
          body = await dynamo.scan(params).promise();
          break;
        case "GET /markers/{id}":
          body = await dynamo
            .get({
              TableName: MARKER_DB,
              Key: {
                id: event.pathParameters.id,
              },
            })
            .promise();
          break;
        case "PUT /markers":
          requestJSON = JSON.parse(event.body);
          id = uuidv4();
          item = {
            id,
            latlng: requestJSON.latlng,
            mems: requestJSON.mems || [],
            image_key: requestJSON.image_key,
            creator,
            email,
          };
          await dynamo
            .put({
              TableName: MARKER_DB,
              Item: item,
            })
            .promise();
          body = item;
          break;
        case "PUT /markers/{id}":
          requestJSON = JSON.parse(event.body);
          id = event.pathParameters.id;
          const getResp = await getOwnItems(MARKER_DB, id, email)
          if (getResp.Items) {
            item = {
              id,
              latlng: requestJSON.latlng,
              mems: requestJSON.mems,
              image_key: requestJSON.image_key,
              creator,
              email,
            };
            await dynamo
              .put({
                TableName: MARKER_DB,
                Item: item,
              })
              .promise();
            body = item;
          }
          break;
        case "GET /mems":
          body = await dynamo.scan({ TableName: MEM_DB }).promise();
          break;
        case "PUT /mems":
          requestJSON = JSON.parse(event.body);
          id = uuidv4();
          item = {
            id,
            memage_id: requestJSON.memage_id,
            order: requestJSON.order,
            front: requestJSON.front,
            back: requestJSON.back,
            polygon: requestJSON.polygon,
            width: requestJSON.width,
            image_key: requestJSON.image_key,
            creator,
            email,
          };
          await dynamo
            .put({
              TableName: MEM_DB,
              Item: item,
            })
            .promise();
          body = item;
          break;
        case "GET /memages":
          body = await dynamo.scan({ TableName: MEMAGE_DB }).promise();
          break;
        case "PUT /memages":
          requestJSON = JSON.parse(event.body);
          id = uuidv4();
          item = {
            id,
            mems: requestJSON.mems || [],
            image_key: requestJSON.image_key,
            creator,
            email,
          };
          await dynamo
            .put({
              TableName: MEMAGE_DB,
              Item: item,
            })
            .promise();
          body = item;
          break;
        default:
          throw new Error(`Unsupported route: "${event.routeKey}"`);
      }
    } catch (err) {
      statusCode = 400;
      body = event.routeKey + ": " + err.message;
    } finally {
      body = JSON.stringify(body);
    }
  }

  return {
    statusCode,
    body,
    headers,
  };
};
