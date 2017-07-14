import {expectToReject, willResolve} from 'jasmine-promise-tools';
import * as yaml from 'js-yaml';
import * as q from 'q';
import {FileSystem, ValidationOutcome} from '../../lib/swagger-mock-validator/types';
import {customMatchers, CustomMatchers} from './support/custom-jasmine-matchers';
import {pactBuilder} from './support/pact-builder';
import {interactionBuilder} from './support/pact-builder/interaction-builder';
import {operationBuilder, pathBuilder, pathParameterBuilder, swaggerBuilder} from './support/swagger-builder';
import {default as swaggerPactValidatorLoader, MockFileSystemResponses} from './support/swagger-mock-validator-loader';

declare function expect<T>(actual: T): CustomMatchers<T>;

describe('reading files', () => {
    let mockFiles: MockFileSystemResponses;
    let mockFileSystem: FileSystem;

    beforeEach(() => {
        jasmine.addMatchers(customMatchers);

        mockFiles = {};
        mockFileSystem = swaggerPactValidatorLoader.createMockFileSystem(mockFiles);
    });

    const invokeValidate = (specPathOrUrl: string, mockPathOrUrl: string): Promise<ValidationOutcome> =>
        swaggerPactValidatorLoader.invokeWithMocks({
            fileSystem: mockFileSystem,
            mockPathOrUrl,
            specPathOrUrl
        }) as any;

    describe('reading the swagger file', () => {
        it('should read the json swagger file from the file system', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.build()));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));

            return invokeValidate('swagger.json', 'pact.json').then(() => {
                expect(mockFileSystem.readFile).toHaveBeenCalledWith('swagger.json');
            });
        }));

        it('should read the yaml swagger file from the file system', willResolve(() => {
            mockFiles['swagger.yaml'] = q(yaml.safeDump(swaggerBuilder.build()));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));

            return invokeValidate('swagger.yaml', 'pact.json').then(() => {
                expect(mockFileSystem.readFile).toHaveBeenCalledWith('swagger.yaml');
            });
        }));

        it('should fail error when reading the swagger file fails', willResolve(() => {
            mockFiles['swagger.json'] = q.reject<string>(new Error('error-message'));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));
            const result = invokeValidate('swagger.json', 'pact.json');

            return expectToReject(result).then((error) => {
                expect(error).toEqual(new Error('Unable to read "swagger.json": error-message'));
            });
        }));

        it('should fail when the swagger file cannot be parsed', willResolve(() => {
            mockFiles['swagger.json'] = q('');
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));
            const result = invokeValidate('swagger.json', 'pact.json');

            return expectToReject(result).then((error) => {
                expect(error.message).toEqual(jasmine.stringMatching(
                    'Unable to parse "swagger.json": Unexpected end'
                ));
            });
        }));

        it('should return the error when the swagger file is not valid', willResolve(() => {
            mockFiles['swagger.json'] = q('{}');
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));
            return invokeValidate('swagger.json', 'pact.json')
                .then((result) => {
                    expect(result.reason).toEqual('"swagger.json" is not a valid swagger file');
                    expect(result).toContainErrors([{
                        code: 'sv.error',
                        message: 'Missing required property: paths',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot]',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'error'
                    }, {
                        code: 'sv.error',
                        message: 'Missing required property: info',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot]',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'error'
                    }, {
                        code: 'sv.error',
                        message: 'Missing required property: swagger',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot]',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'error'
                    }]);
            });
        }));

        it('should indicate the location where the validation error was found', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.withMissingInfoTitle().build()));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));
            return invokeValidate('swagger.json', 'pact.json')
                .then((result) => {
                    expect(result).toContainErrors([{
                        code: 'sv.error',
                        message: 'Missing required property: title',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot].info',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'error'
                    }]);
            });
        }));

        it('should return the warning when the swagger file contains warnings', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(
                swaggerBuilder
                    .withParameter('userId', pathParameterBuilder.withNumberNamed('userId'))
                    .build()
            ));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));

            return invokeValidate('swagger.json', 'pact.json').then((result) => {
                expect(result).toContainNoErrors();
                expect(result).toContainWarnings([{
                    code: 'sv.warning',
                    message: 'Parameter is defined but is not used: #/parameters/userId',
                    source: 'swagger-validation',
                    specDetails: {
                        location: '[swaggerRoot].parameters.userId',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: null
                    },
                    type: 'warning'
                }]);
            });
        }));

        it('should return any warnings when the swagger file contains errors and warnings', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(
                swaggerBuilder
                    .withPath('/account/{accountId}', pathBuilder.withGetOperation(operationBuilder))
                    .withParameter('userId', pathParameterBuilder.withNumberNamed('userId'))
                    .build()
            ));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));

            return invokeValidate('swagger.json', 'pact.json')
                .then((result) => {
                    expect(result).toContainErrors([{
                        code: 'sv.error',
                        message: 'API requires path parameter but it is not defined: accountId',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot].paths./account/{accountId}.get',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'error'
                    }]);
                    expect(result).toContainWarnings([{
                        code: 'sv.warning',
                        message: 'Parameter is defined but is not used: #/parameters/userId',
                        source: 'swagger-validation',
                        specDetails: {
                            location: '[swaggerRoot].parameters.userId',
                            pathMethod: null,
                            pathName: null,
                            specFile: 'swagger.json',
                            value: null
                        },
                        type: 'warning'
                    }]);
            });
        }));

        it('should return the swagger warnings when the pact file contains errors', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(
                swaggerBuilder
                    .withParameter('userId', pathParameterBuilder.withNumberNamed('userId'))
                    .build()
            ));
            mockFiles['pact.json'] = q(JSON.stringify(
                pactBuilder
                    .withInteraction(
                        interactionBuilder.withRequestPath('/does/not/exist')
                    )
                    .build()
            ));

            return invokeValidate('swagger.json', 'pact.json').then((result) => {
                expect(result).toContainErrors([{
                    code: 'spv.request.path-or-method.unknown',
                    message: 'Path or method not defined in swagger file: GET /does/not/exist',
                    mockDetails: {
                        interactionDescription: 'default-description',
                        interactionState: '[none]',
                        location: '[pactRoot].interactions[0].request.path',
                        mockFile: 'pact.json',
                        value: '/does/not/exist'
                    },
                    source: 'spec-mock-validation',
                    specDetails: {
                        location: '[swaggerRoot].paths',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: {}
                    },
                    type: 'error'
                }]);
                expect(result).toContainWarnings([{
                    code: 'sv.warning',
                    message: 'Parameter is defined but is not used: #/parameters/userId',
                    source: 'swagger-validation',
                    specDetails: {
                        location: '[swaggerRoot].parameters.userId',
                        pathMethod: null,
                        pathName: null,
                        specFile: 'swagger.json',
                        value: null
                    },
                    type: 'warning'
                }]);
            });
        }));
    });

    describe('reading the pact file', () => {
        it('should read the pact file from the file system', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.build()));
            mockFiles['pact.json'] = q(JSON.stringify(pactBuilder.build()));

            return invokeValidate('swagger.json', 'pact.json').then(() => {
                expect(mockFileSystem.readFile).toHaveBeenCalledWith('pact.json');
            });
        }));

        it('should fail when reading the pact file fails', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.build()));
            mockFiles['pact.json'] = q.reject<string>(new Error('error-message'));
            const result = invokeValidate('swagger.json', 'pact.json');

            return expectToReject(result).then((error) => {
                expect(error).toEqual(new Error('Unable to read "pact.json": error-message'));
            });
        }));

        it('should fail when the pact file cannot be parsed as json', willResolve(() => {
            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.build()));
            mockFiles['pact.json'] = q('');
            const result = invokeValidate('swagger.json', 'pact.json');

            return expectToReject(result).then((error) => {
                expect(error.message).toEqual(jasmine.stringMatching(
                    'Unable to parse "pact.json": Unexpected end'
                ));
            });
        }));

        it('should return the error when the pact file is not valid', willResolve(() => {
            const pact = pactBuilder.withMissingInteractions();

            mockFiles['swagger.json'] = q(JSON.stringify(swaggerBuilder.build()));
            mockFiles['pact.json'] = q(JSON.stringify(pact.build()));
            return invokeValidate('swagger.json', 'pact.json')
                .then((result) => {
                    expect(result.reason).toBe('"pact.json" is not a valid pact file');
                    expect(result).toContainErrors([{
                        code: 'pv.error',
                        message: 'Missing required property: interactions',
                        mockDetails: {
                            interactionDescription: null,
                            interactionState: null,
                            location: '[pactRoot]',
                            mockFile: 'pact.json',
                            value: pact.build()
                        },
                        source: 'pact-validation',
                        type: 'error'
                    }]);
            });
        }));
    });
});
