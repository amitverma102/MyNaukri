FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["MyNaukri.API/MyNaukri.API.csproj", "MyNaukri.API/"]
COPY ["MyNaukri.Application/MyNaukri.Application.csproj", "MyNaukri.Application/"]
COPY ["MyNaukri.Domain/MyNaukri.Domain.csproj", "MyNaukri.Domain/"]
COPY ["MyNaukri.Infrastructure/MyNaukri.Infrastructure.csproj", "MyNaukri.Infrastructure/"]
COPY ["MyNaukri.SharedKernel/MyNaukri.SharedKernel.csproj", "MyNaukri.SharedKernel/"]
RUN dotnet restore "MyNaukri.API/MyNaukri.API.csproj"
COPY . .
WORKDIR "/src/MyNaukri.API"
RUN dotnet build "MyNaukri.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MyNaukri.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MyNaukri.API.dll"]
