'use strict';

const chai = require('chai');
const chaiSubset = require('chai-subset');
const sinon = require('sinon');

const LambdaWarmup = require('../index');

chai.use(chaiSubset);
const expect = chai.expect;

const DEFAULT_PAYLOAD = '{"source":"serverless-plugin-lambda-warmup"}';

function createTestInstance(options) {
  options = options || {}; // eslint-disable-line no-param-reassign

  return new LambdaWarmup({
    version: options.version || '1.12.0',
    service: {
      provider: options.provider || {},
      functions: options.functions,
      resources: options.resources ? { Resources: options.resources } : undefined,
      custom: options.custom || undefined
    },
    cli: {
      log: () => {}
    },
    getProvider: () => {
      return {
        naming: {
          getLambdaLogicalId(functionName) {
            return `${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}LambdaFunction`;
          },
          getStackName() {
            return options.stackName || 'foo-dev';
          }
        }
      };
    }
  }, {
    stage: options.stage || 'dev'
  });
}

describe('serverless-plugin-lambda-warmup', function() {
  describe('#constructor', function() {
    it('should throw on older version', function() {
      expect(() => createTestInstance({ version: '1.11.0' }))
        .to.throw('serverless-plugin-lambda-account-access requires serverless 1.12 or higher!');
    });

    it('should create hooks', function() {
      const instance = createTestInstance();
      expect(instance)
        .to.have.property('hooks')
        .that.has.all.keys('package:createDeploymentArtifacts');

      const stub = sinon.stub(instance, 'addWarmupRule');
      instance.hooks['package:createDeploymentArtifacts']();

      sinon.assert.calledOnce(stub);
    });
  });

  describe('#addWarmupRule', function() {
    it('should not add resources when there are no functions defined', function() {
      const instance = createTestInstance();

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.is.undefined;
    });

    it('should not override resources object when serverless has configured resources', function() {
      const testResources = { Gold: {} };
      const instance = createTestInstance({
        functions: {},
        resources: testResources
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.deep.equals({
          Resources: testResources
        });
    });

    it('should add warmup rules and permissions', function() {
      const instance = createTestInstance({
        functions: {
          function1: {},
          function2: {}
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.deep.equals({
          Resources: {
            LambdaWarmupEventsRule1: {
              Type: 'AWS::Events::Rule',
              Properties: {
                Description: 'Lambda warmup timer created by serverless-plugin-lambda-warmup',
                Name: 'foo-dev-lambdaWarmup-timer-1',
                ScheduleExpression: 'rate(5 minutes)',
                State: 'ENABLED',
                Targets: [
                  {
                    Arn: {
                      'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                    },
                    Id: 'Function1LambdaFunctionSchedule',
                    Input: DEFAULT_PAYLOAD
                  },
                  {
                    Arn: {
                      'Fn::GetAtt': ['Function2LambdaFunction', 'Arn']
                    },
                    Id: 'Function2LambdaFunctionSchedule',
                    Input: DEFAULT_PAYLOAD
                  }
                ]
              }
            },
            LambdaWarmupEventsRule1Function1LambdaFunctionSchedulePermission: {
              Type: 'AWS::Lambda::Permission',
              Properties: {
                Action: 'lambda:InvokeFunction',
                FunctionName: {
                  'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                },
                Principal: 'events.amazonaws.com',
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule1Function2LambdaFunctionSchedulePermission: {
              Type: 'AWS::Lambda::Permission',
              Properties: {
                Action: 'lambda:InvokeFunction',
                FunctionName: {
                  'Fn::GetAtt': ['Function2LambdaFunction', 'Arn']
                },
                Principal: 'events.amazonaws.com',
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            }
          }
        });
    });

    it('should not add target and permission for the function that has warmup property set to false', function() {
      const instance = createTestInstance({
        functions: {
          function1: {},
          function2: { warmup: false }
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.deep.equals({
          Resources: {
            LambdaWarmupEventsRule1: {
              Type: 'AWS::Events::Rule',
              Properties: {
                Description: 'Lambda warmup timer created by serverless-plugin-lambda-warmup',
                Name: 'foo-dev-lambdaWarmup-timer-1',
                ScheduleExpression: 'rate(5 minutes)',
                State: 'ENABLED',
                Targets: [
                  {
                    Arn: {
                      'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                    },
                    Id: 'Function1LambdaFunctionSchedule',
                    Input: DEFAULT_PAYLOAD
                  }
                ]
              }
            },
            LambdaWarmupEventsRule1Function1LambdaFunctionSchedulePermission: {
              Type: 'AWS::Lambda::Permission',
              Properties: {
                Action: 'lambda:InvokeFunction',
                FunctionName: {
                  'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                },
                Principal: 'events.amazonaws.com',
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            }
          }
        });
    });

    it('should not add warmup rule when stages are specified, but current stage is not in the list', function() {
      const instance = createTestInstance({
        stage: 'dev',
        custom: {
          warmup: {
            stages: ['prod']
          }
        },
        functions: {
          function1: {}
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.is.undefined;
    });

    it('should not add warmup rule when all the functions have warmup property set to false', function() {
      const instance = createTestInstance({
        functions: {
          function1: { warmup: false }
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.is.undefined;
    });

    it('should add warmup rule when stages are specified and current stage is in the list', function() {
      const instance = createTestInstance({
        stage: 'prod',
        custom: {
          warmup: {
            stages: ['prod']
          }
        },
        functions: {
          function1: {}
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources.Resources.LambdaWarmupEventsRule1');
    });

    it('should override defaults with provided config', function() {
      const testSchedule = 'rate(48 hours)';
      const testPayload = { data: 'some-data' };
      const instance = createTestInstance({
        custom: {
          warmup: {
            schedule: testSchedule,
            payload: testPayload
          }
        },
        functions: {
          function1: {}
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources.Resources.LambdaWarmupEventsRule1')
        .that.deep.equals({
          Type: 'AWS::Events::Rule',
          Properties: {
            Description: 'Lambda warmup timer created by serverless-plugin-lambda-warmup',
            Name: 'foo-dev-lambdaWarmup-timer-1',
            ScheduleExpression: testSchedule,
            State: 'ENABLED',
            Targets: [
              {
                Arn: {
                  'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                },
                Id: 'Function1LambdaFunctionSchedule',
                Input: JSON.stringify(testPayload)
              }
            ]
          }
        });
    });

    it('should create multiple rules if the number of functions exceeds the max number of targets allowed', function() {
      const instance = createTestInstance({
        functions: {
          function1: {},
          function2: {},
          function3: {},
          function4: {},
          function5: {},
          function6: {}
        }
      });

      instance.addWarmupRule();

      expect(instance)
        .to.have.nested.property('serverless.service.resources')
        .that.containSubset({
          Resources: {
            LambdaWarmupEventsRule1: {
              Properties: {
                Name: 'foo-dev-lambdaWarmup-timer-1',
                Targets: [
                  { Id: 'Function1LambdaFunctionSchedule' },
                  { Id: 'Function2LambdaFunctionSchedule' },
                  { Id: 'Function3LambdaFunctionSchedule' },
                  { Id: 'Function4LambdaFunctionSchedule' },
                  { Id: 'Function5LambdaFunctionSchedule' }
                ]
              }
            },
            LambdaWarmupEventsRule2: {
              Properties: {
                Name: 'foo-dev-lambdaWarmup-timer-2',
                Targets: [
                  { Id: 'Function6LambdaFunctionSchedule' }
                ]
              }
            },
            LambdaWarmupEventsRule1Function1LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function1LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule1Function2LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function2LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule1Function3LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function3LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule1Function4LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function4LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule1Function5LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function5LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule1', 'Arn']
                }
              }
            },
            LambdaWarmupEventsRule2Function6LambdaFunctionSchedulePermission: {
              Properties: {
                FunctionName: {
                  'Fn::GetAtt': ['Function6LambdaFunction', 'Arn']
                },
                SourceArn: {
                  'Fn::GetAtt': ['LambdaWarmupEventsRule2', 'Arn']
                }
              }
            }
          }
        });
    });
  });
});
