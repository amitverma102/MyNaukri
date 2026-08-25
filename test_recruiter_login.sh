#!/bin/bash
# Stop any running dotnet server just to be sure we restart it with our logging
kill -9 $(lsof -t -i:5206) 2>/dev/null
dotnet run --project MyNaukri.API/MyNaukri.API.csproj &
sleep 5 # Wait for server to start

echo "Logging in as admin@recruiter.com..."
TOKEN=$(curl -s -X POST http://localhost:5206/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@recruiter.com","password":"hashedpassword"}' | jq -r .token)
echo "Token: $TOKEN"

echo "Accessing /api/jobs/recruiter..."
curl -v -H "Authorization: Bearer $TOKEN" http://localhost:5206/api/jobs/recruiter 2>&1 | grep HTTP/
