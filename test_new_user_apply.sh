#!/bin/bash
curl -s -X POST http://localhost:5173/api/auth/register -H "Content-Type: application/json" -d '{
  "email": "newuser@test.com",
  "password": "Password123!",
  "firstName": "New",
  "lastName": "User",
  "role": 0
}'

TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login -H "Content-Type: application/json" -d '{"email":"newuser@test.com","password":"Password123!"}' | jq -r .token)
echo "Token: $TOKEN"

JOB_ID=$(curl -s http://localhost:5173/api/jobs | jq -r '.[0].id')
echo "Job ID: $JOB_ID"

curl -s -w "\nHTTP Code: %{http_code}\n" -X POST "http://localhost:5173/api/jobapplications/apply/$JOB_ID" -H "Authorization: Bearer $TOKEN"
