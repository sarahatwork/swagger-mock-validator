"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const file_store_1 = require("./swagger-mock-validator/file-store");
const mock_parser_1 = require("./swagger-mock-validator/mock-parser");
const spec_parser_1 = require("./swagger-mock-validator/spec-parser");
const validate_spec_and_mock_1 = require("./swagger-mock-validator/validate-spec-and-mock");
const getMockSource = (mockPathOrUrl, providerName) => {
    if (providerName) {
        return 'pactBroker';
    }
    else if (file_store_1.FileStore.isUrl(mockPathOrUrl)) {
        return 'url';
    }
    return 'path';
};
const getSpecSource = (specPathOrUrl) => file_store_1.FileStore.isUrl(specPathOrUrl) ? 'url' : 'path';
const parseUserOptions = (userOptions) => (Object.assign({}, userOptions, { mockSource: getMockSource(userOptions.mockPathOrUrl, userOptions.providerName), specSource: getSpecSource(userOptions.specPathOrUrl) }));
const combineValidationResults = (validationResults) => {
    const flattenedValidationResults = _.flatten(validationResults);
    return _.uniqWith(flattenedValidationResults, _.isEqual);
};
const combineValidationOutcomes = (validationOutcomes) => {
    return {
        errors: combineValidationResults(validationOutcomes.map((validationOutcome) => validationOutcome.errors)),
        failureReason: _(validationOutcomes)
            .map((outcome) => outcome.failureReason)
            .filter((failureReason) => failureReason !== undefined)
            .join(', ') || undefined,
        success: _.every(validationOutcomes, (outcome) => outcome.success),
        warnings: combineValidationResults(validationOutcomes.map((validationOutcome) => validationOutcome.warnings))
    };
};
exports.validateSpecAndMockContent = (options) => __awaiter(this, void 0, void 0, function* () {
    const spec = options.spec;
    const mock = options.mock;
    const parsedSpec = yield spec_parser_1.SpecParser.parse(spec);
    const parsedMock = mock_parser_1.MockParser.parse(mock);
    const validationOutcome = yield validate_spec_and_mock_1.validateSpecAndMock(parsedMock, parsedSpec);
    return {
        parsedMock,
        validationOutcome
    };
});
class SwaggerMockValidator {
    constructor(fileStore, pactBroker, analytics) {
        this.fileStore = fileStore;
        this.pactBroker = pactBroker;
        this.analytics = analytics;
    }
    static getNoMocksInBrokerValidationOutcome() {
        const noMocksValidationOutcome = {
            errors: [],
            success: true,
            warnings: [{
                    code: 'pact-broker.no-pacts-found',
                    message: 'No consumer pacts found in Pact Broker',
                    source: 'pact-broker',
                    type: 'warning'
                }]
        };
        return [noMocksValidationOutcome];
    }
    validate(userOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = parseUserOptions(userOptions);
            const { spec, mocks } = yield this.loadSpecAndMocks(options);
            const validationOutcomes = yield this.getValidationOutcomes(spec, mocks, options);
            return combineValidationOutcomes(validationOutcomes);
        });
    }
    loadSpecAndMocks(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const whenSpecContent = this.getSpecFromFileOrUrl(options.specPathOrUrl);
            const whenMocks = options.providerName ?
                this.pactBroker.loadPacts({
                    pactBrokerUrl: options.mockPathOrUrl,
                    providerName: options.providerName,
                    tag: options.tag
                }) : this.getPactFromFileOrUrl(options.mockPathOrUrl);
            const [spec, mocks] = yield Promise.all([whenSpecContent, whenMocks]);
            return { spec, mocks };
        });
    }
    getSpecFromFileOrUrl(specPathOrUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.fileStore.loadFile(specPathOrUrl);
            return {
                content,
                format: 'auto-detect',
                pathOrUrl: specPathOrUrl
            };
        });
    }
    getPactFromFileOrUrl(mockPathOrUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.fileStore.loadFile(mockPathOrUrl);
            return [{
                    content,
                    format: 'auto-detect',
                    pathOrUrl: mockPathOrUrl
                }];
        });
    }
    getValidationOutcomes(spec, mocks, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mocks.length === 0) {
                return SwaggerMockValidator.getNoMocksInBrokerValidationOutcome();
            }
            return Promise.all(mocks.map((mock) => this.validateSpecAndMock(spec, mock, options)));
        });
    }
    validateSpecAndMock(spec, mock, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield exports.validateSpecAndMockContent({ mock, spec });
            if (result.parsedMock) {
                yield this.postAnalyticEvent(options, result.parsedMock, result.validationOutcome);
            }
            return result.validationOutcome;
        });
    }
    postAnalyticEvent(options, parsedMock, validationOutcome) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.analyticsUrl) {
                try {
                    yield this.analytics.postEvent({
                        analyticsUrl: options.analyticsUrl,
                        consumer: parsedMock.consumer,
                        mockPathOrUrl: parsedMock.pathOrUrl,
                        mockSource: options.mockSource,
                        provider: parsedMock.provider,
                        specPathOrUrl: options.specPathOrUrl,
                        specSource: options.specSource,
                        validationOutcome
                    });
                }
                catch (error) {
                    // do not fail tool on analytics errors
                }
            }
        });
    }
}
exports.SwaggerMockValidator = SwaggerMockValidator;
