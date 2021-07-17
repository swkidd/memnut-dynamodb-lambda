const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamo = new AWS.DynamoDB.DocumentClient();

const MARKER_DB = "memnut-markers";
const MEMAGE_DB = "memnut-memages";
const MARKERMEM_DB = "memnut-markermems";
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

const validID = (db, id, email) => {
  const getResp = await getOwnItems(db, id, email);
  return !!getResp.Items;
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
          if (requestJSON.id && !validID(requestJSON.id)) {
            throw Error("invalid request");
          } else if (!requestJSON.id) {
            id = uuidv4();
          }
          item = {
            id,
            latlng: requestJSON.latlng,
            mem_ids: requestJSON.mem_ids || [],
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
        case "GET /mems":
          body = await dynamo.scan({ TableName: MEM_DB }).promise();
          break;
        case "PUT /mems":
          requestJSON = JSON.parse(event.body);
          if (requestJSON.id && !validID(requestJSON.id)) {
            throw Error("invalid request");
          } else if (!requestJSON.id) {
            id = uuidv4();
          }
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
          if (requestJSON.id && !validID(requestJSON.id)) {
            throw Error("invalid request");
          } else if (!requestJSON.id) {
            id = uuidv4();
          }
          item = {
            id,
            mem_ids: requestJSON.mem_ids || [],
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
        case "GET /markermems":
          body = await dynamo.scan({ TableName: MARKERMEM_DB }).promise();
          break;
        case "PUT /markermems":
          requestJSON = JSON.parse(event.body);
          if (requestJSON.id && !validID(requestJSON.id)) {
            throw Error("invalid request");
          } else if (!requestJSON.id) {
            id = uuidv4();
          }
          item = {
            id,
            order: requestJSON.order,
            marker_id: requestJSON.marker_id,
            mem_id: requestJSON.mem_id,
            scaleX: requestJSON.scaleX,
            scaleY: requestJSON.scaleY,
            left: requestJSON.left,
            top: requestJSON.top,
            width: requestJSON.width,
            creator,
            email,
          };
          await dynamo
            .put({
              TableName: MARKERMEM_DB,
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
