# Sandpack Packager

> A packager used to aggregate all relevant files from a combination of npm dependencies

## Installing

This service is based on the services of Amazon. We use AWS Lambda, S3 and API Gateway to handle all requests. We provision these services using [serverless](https://serverless.com/).

Installation should be as simple as setting up serverless ([Getting Started](https://serverless.com/framework/docs/getting-started/)) and running `sls deploy --stage dev --s3prefix myBucketName`. `stage` can be either `prod` or `dev`, `s3prefix` is the prefix for your S3 bucket name.

# 私有化部署

## 架构
此代码仓库为codesandbox的依赖服务，其采用了serverless + s3 架构。`functions`下有`api`目录及`packager`目录
* api服务：依赖获取服务，若对象存储有缓存依赖，返回依赖文件路径，客户端访问cos依赖文件路径；若对象存储无缓存依赖，调用packager服务去npm源请求依赖并处理，带处理后依赖存入对象存储，获取文件路径。请求POST示例：http://localhost:3004/react@17.0.2
* packager服务：请求npm源，处理依赖数据，并将其存入对象存储，返回访问路径。请求GET示例：http://localhost:3003/react@17.0.2。（注：此服务会在环境上创建和删除文件，windows系统上可能无法直接运行，建议在docker环境中运行此服务进行测试）


## 启用服务
docker network create compile-network # 创建docker network，允许容器互相访问

docker build --tag compile/dependency:packager -f Dockerfile.packager .
docker run -it -dp 3003:3003 \
  --name packager-container \
  --network compile-network \
  -e SECRET_ID="x" \ # 对象存储ID
  -e SECRET_KEY="xx" \ # 对象存储密钥
  -e BUCKET_NAME="xxx" \ # 存储桶
  -e REGISTRY="https://registry.npm.taobao.org" \ # 私有源配置
  compile/dependency:packager


docker build --tag compile/dependency:api -f Dockerfile.api .
docker run -it -dp 3004:3004 \
  --name api-container \
  --network compile-network \
  -e SECRET_ID="x" \ # 对象存储ID
  -e SECRET_KEY="xx" \ # 对象存储密钥
  -e BUCKET_NAME="xxx" \ # 存储桶
  -e REGISTRY="https://registry.npm.taobao.org" \ # 私有源配置
  compile/dependency:api

## 调用链路
访问api服务——>cos有缓存，则返回cos获取key值，后续通过key值获取依赖
         ——>cos无缓存，则访问packager服务，packager服务从npm获取包存入cos，返回key值

整体依赖数据调用链路：
客户端向对象存储请求依赖数据——>有依赖数据，直接返回
                          ——>无依赖数据，访问api服务
                          ——>api服务从逻辑上会再次请求对象存储，有数据，返回文件路径，供客户端再次请求对象存储
                          ——>无数据，api服务调用packager服务，请求npm源处理依赖，缓存到对象存储，返回路径供客户端再次请求
