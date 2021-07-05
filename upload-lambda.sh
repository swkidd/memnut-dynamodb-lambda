zip -r function.zip .
aws lambda update-function-code --function-name memnut-dynamodb-lambda --zip-file fileb://function.zip