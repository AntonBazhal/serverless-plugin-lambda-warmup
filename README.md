# serverless-plugin-lambda-warmup

[![Build Status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]
[![NPM version][npm-image]][npm-url]
[![Dependencies Status][dependencies-image]][dependencies-url]
[![DevDependencies Status][devdependencies-image]][devdependencies-url]

A [Serverless][serverless-url] plugin that creates [CloudWatch rule][cloudwatch-rules-url] to keep your [AWS Lambda][aws-lambda-url] functions warm.

## Usage

```yaml
service: my-service

plugins:
  - serverless-plugin-lambda-warmup

custom:
  warmup:
    schedule: 'rate(10 minutes)' # [Optional] Schedule expression for the rule (defaults to "rate(5 minutes)")
    stages: # [Optional] Stages to keep lambdas warm (all stages by default)
      - prod
    payload: # [Optional] Event payload (defaults to "{ source: 'serverless-plugin-lambda-warmup' }")
      type: 'warmup'

functions:
  function1:
    handler: 'src/function1.js'

  function2:
    handler: 'src/function2.js'
    warmup: false # [Optional] Allows to exclude functions from the warmup rule
```

## License

The MIT License (MIT)

Copyright (c) 2017 Anton Bazhal

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[aws-lambda-url]: https://aws.amazon.com/lambda/details/
[ci-image]: https://circleci.com/gh/AntonBazhal/serverless-plugin-lambda-warmup.svg?style=shield&circle-token=cdefc59995398eed572dc034080286433aaf2d1f
[ci-url]: https://circleci.com/gh/AntonBazhal/serverless-plugin-lambda-warmup
[cloudwatch-rules-url]: http://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
[coverage-image]: https://coveralls.io/repos/github/AntonBazhal/serverless-plugin-lambda-warmup/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/AntonBazhal/serverless-plugin-lambda-warmup?branch=master
[dependencies-url]: https://david-dm.org/antonbazhal/serverless-plugin-lambda-warmup
[dependencies-image]: https://david-dm.org/antonbazhal/serverless-plugin-lambda-warmup/status.svg
[devdependencies-url]: https://david-dm.org/antonbazhal/serverless-plugin-lambda-warmup?type=dev
[devdependencies-image]: https://david-dm.org/antonbazhal/serverless-plugin-lambda-warmup/dev-status.svg
[npm-url]: https://www.npmjs.org/package/serverless-plugin-lambda-warmup
[npm-image]: https://img.shields.io/npm/v/serverless-plugin-lambda-warmup.svg
[serverless-url]: https://serverless.com/
