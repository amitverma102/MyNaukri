#!/bin/bash
TOKEN=$(curl -s -k -X POST http://localhost:5206/api/auth/login -H "Content-Type: application/json" -d '{"email":"can1@edu.net","password":"Sch@123"}' | jq -r .token)
echo "Token: $TOKEN"

JOB_ID=$(curl -s -k http://localhost:5206/api/jobs | jq -r '.[0].id')
echo "Job ID: $JOB_ID"

curl -s -k -w "\nHTTP Code: %{http_code}\n" -X POST "http://localhost:5206/api/jobapplications/apply/$JOB_ID" -H "Authorization: Bearer $TOKEN"
