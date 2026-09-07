#!/bin/bash
kill -9 $(lsof -t -i:5206) 2>/dev/null
dotnet run --project MyNaukri.API/MyNaukri.API.csproj &
sleep 5
node ClientApp/test_login2.cjs
