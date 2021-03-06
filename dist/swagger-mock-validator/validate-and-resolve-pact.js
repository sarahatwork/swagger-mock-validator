"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_mock_validator_error_impl_1 = require("./swagger-mock-validator-error-impl");
exports.validateAndResolvePact = (pactJson, mockPathOrUrl) => {
    if (!pactJson.interactions) {
        throw new swagger_mock_validator_error_impl_1.SwaggerMockValidatorErrorImpl('SWAGGER_MOCK_VALIDATOR_PARSE_ERROR', `Unable to parse "${mockPathOrUrl}": Missing required property: interactions`);
    }
    return pactJson;
};
