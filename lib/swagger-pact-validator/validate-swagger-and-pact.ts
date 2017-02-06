import * as _ from 'lodash';
import * as q from 'q';
import {
    ParsedMock,
    ParsedMockInteraction,
    ParsedSpec,
    ParsedSpecOperation,
    ValidationFailureError,
    ValidationResult
} from './types';
import getSwaggerOperation from './validate-swagger-and-pact/get-swagger-operation';
import getSwaggerResponse from './validate-swagger-and-pact/get-swagger-response';
import validatePactRequestBody from './validate-swagger-and-pact/validate-pact-request-body';
import validatePactRequestHeaders from './validate-swagger-and-pact/validate-pact-request-headers';
import validatePactRequestQuery from './validate-swagger-and-pact/validate-pact-request-query';
import validatePactResponseBody from './validate-swagger-and-pact/validate-pact-response-body';
import validatePactResponseHeaders from './validate-swagger-and-pact/validate-pact-response-headers';
import validateSwaggerConsumes from './validate-swagger-and-pact/validate-swagger-consumes';
import validateSwaggerProduces from './validate-swagger-and-pact/validate-swagger-produces';
import validateSwaggerSecurity from './validate-swagger-and-pact/validate-swagger-security';

const validatePactInteractionRequest = (
    pactInteraction: ParsedMockInteraction,
    swaggerOperation: ParsedSpecOperation
) => _.concat(
    validateSwaggerConsumes(pactInteraction, swaggerOperation),
    validateSwaggerProduces(pactInteraction, swaggerOperation),
    validateSwaggerSecurity(pactInteraction, swaggerOperation),
    validatePactRequestBody(pactInteraction, swaggerOperation),
    validatePactRequestHeaders(pactInteraction, swaggerOperation),
    validatePactRequestQuery(pactInteraction, swaggerOperation)
);

const validatePactInteractionResponse = (
    pactInteraction: ParsedMockInteraction,
    swaggerOperation: ParsedSpecOperation
) => {
    const swaggerResponseSearchResult = getSwaggerResponse(pactInteraction, swaggerOperation);

    if (!swaggerResponseSearchResult.found) {
        return swaggerResponseSearchResult.results;
    }

    return _.concat(
        swaggerResponseSearchResult.results,
        validatePactResponseBody(pactInteraction, swaggerResponseSearchResult.value),
        validatePactResponseHeaders(pactInteraction, swaggerResponseSearchResult.value)
    );
};

const validatePactInteraction = (pactInteraction: ParsedMockInteraction, swagger: ParsedSpec) => {
    const swaggerOperationSearchResult = getSwaggerOperation(pactInteraction, swagger);

    if (!swaggerOperationSearchResult.found) {
        return swaggerOperationSearchResult.results;
    }

    return _.concat(
        swaggerOperationSearchResult.results,
        validatePactInteractionRequest(pactInteraction, swaggerOperationSearchResult.value),
        validatePactInteractionResponse(pactInteraction, swaggerOperationSearchResult.value)
    );
};

export default (pact: ParsedMock, swagger: ParsedSpec) => {
    const validationResults = _(pact.interactions)
        .map((pactInteraction) => validatePactInteraction(pactInteraction, swagger))
        .flatten<ValidationResult>()
        .value();

    const results = {
        errors: _.filter(validationResults, (res) => res.type === 'error'),
        warnings: _.filter(validationResults, (res) => res.type === 'warning')
    };

    if (results.errors.length > 0) {
        const error = new Error(
            `Pact file "${pact.pathOrUrl}" is not compatible ` +
            `with swagger file "${swagger.pathOrUrl}"`
        ) as ValidationFailureError;

        error.details = {
            errors: results.errors,
            warnings: results.warnings
        };

        return q.reject(error);
    }

    return q({warnings: results.warnings});
};
