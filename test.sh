touch .env.test

results="{ \"ENV_DB_USER\": \"TestValue\", \"ENV_DB_PWD\": \"TestValue\", \"ENV_STRIPE_SUBSCRIPTION_PRODUCT_ID\": \"TestValue\", \"ENV_DB_HOST\": \"TestValue\", \"github_token\": \"TestValue\", \"AWS_LAMBDA_EXERN\": \"TestValue\", \"ENV_STRIPE_API_SECRET_KEY\": \"TestValue\", \"ENV_STRIPE_WEBHOOK_SECRET\": \"TestValue\", \"ENV_BASE_CLIENT_URL\": \"TestValue\", \"AWS_REGION\": \"TestValue\", \"AWS_ACCOUNT_ID\": \"TestValue\", \"AWS_GHACTIONS_ROLENAME\": \"TestValue\", \"ENV_DB_NAME\": \"TestValue\" }" 

echo "$results" | jq -r '. | to_entries[] | select(.key | startswith("ENV")) | .key + "=" + (.value|tojson)' |

while read i; 
do 
  echo "${i/ENV_/""}" >> .env.test
done

cat .env.test