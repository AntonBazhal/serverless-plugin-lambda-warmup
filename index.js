'use strict';

const semver = require('semver');
const chunk = require('lodash.chunk');
const set = require('lodash.set');

const DEFAULT_PAYLOAD = { source: 'serverless-plugin-lambda-warmup' };
const DEFAULT_SCHEDULE = 'rate(5 minutes)';
const RESOURCE_NAME = 'LambdaWarmupEventsRule';
const TARGETS_PER_RULE = 5;

class LambdaWarmup {
  constructor(serverless, options) {
    if (!semver.satisfies(serverless.version, '>= 1.12')) {
      throw new Error('serverless-plugin-lambda-account-access requires serverless 1.12 or higher!');
    }

    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');
    this.hooks = {
      'package:createDeploymentArtifacts': () => this.addWarmupRule(),
    };
  }

  addWarmupRule() {
    const service = this.serverless.service;
    if (typeof service.functions !== 'object') {
      this.serverless.cli.log('LambdaWarmup: No functions to keep warm');
      return;
    }

    const config = (service.custom && service.custom.warmup) || {};

    if (config.stages) {
      const deployToStages = [].concat(config.stages);
      const currentStage = this.options.stage;
      if (deployToStages.indexOf(currentStage) === -1) {
        this.serverless.cli.log(`LambdaWarmup: Not warming up functions on stage ${currentStage}`);
        return;
      }
    }

    const input = JSON.stringify(config.payload || DEFAULT_PAYLOAD);
    const targets = Object.keys(service.functions).reduce((acc, functionName) => {
      if (service.functions[functionName].warmup !== false) {
        const functionLogicalId = this.provider.naming.getLambdaLogicalId(functionName);
        acc.push({
          Id: `${functionLogicalId}Schedule`,
          Arn: {
            'Fn::GetAtt': [functionLogicalId, 'Arn']
          },
          Input: input
        });
      }

      return acc;
    }, []);

    if (targets.length === 0) {
      this.serverless.cli.log('LambdaWarmup: No functions to keep warm');
      return;
    }

    this.serverless.cli.log(`LambdaWarmup: Setting ${targets.length} functions to be warm`);

    const stackName = this.provider.naming.getStackName();
    chunk(targets, TARGETS_PER_RULE).forEach((targetsChunk, chunkIndex) => {
      const suffix = chunkIndex + 1;
      const ruleId = `${RESOURCE_NAME}${suffix}`;
      const ruleResource = {
        Type: 'AWS::Events::Rule',
        Properties: {
          ScheduleExpression: config.schedule || DEFAULT_SCHEDULE,
          State: 'ENABLED',
          Name: `${stackName}-lambdaWarmup-timer-${suffix}`,
          Description: 'Lambda warmup timer created by serverless-plugin-lambda-warmup',
          Targets: targetsChunk
        }
      };

      set(service, `resources.Resources[${ruleId}]`, ruleResource);

      targetsChunk.forEach(target => {
        const permissionId = `${ruleId}${target.Id}Permission`;
        const permissionResource = {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            Action: 'lambda:InvokeFunction',
            FunctionName: target.Arn,
            Principal: 'events.amazonaws.com',
            SourceArn: {
              'Fn::GetAtt': [ruleId, 'Arn']
            }
          }
        };

        set(service, `resources.Resources[${permissionId}]`, permissionResource);
      });
    });
  }
}

module.exports = LambdaWarmup;
