import {
    ParsedMockValue,
    ParsedSpecValue,
    ValidationResult,
    ValidationResultCode,
    ValidationResultSource,
    ValidationResultType
} from './types';

interface ResultOptions {
    code: ValidationResultCode;
    message: string;
    pactSegment: ParsedMockValue<any>;
    source: ValidationResultSource;
    swaggerSegment: ParsedSpecValue<any>;
}

const errorCodes = [
    'spv.request.accept.incompatible',
    'spv.request.authorization.missing',
    'spv.request.body.incompatible',
    'spv.request.content-type.incompatible',
    'spv.request.header.incompatible',
    'spv.request.path-or-method.unknown',
    'spv.request.query.incompatible',
    'spv.response.body.incompatible',
    'spv.response.body.unknown',
    'spv.response.content-type.incompatible',
    'spv.response.header.incompatible',
    'spv.response.header.unknown',
    'spv.response.status.unknown'
];

const codeToType = (code: ValidationResultCode): ValidationResultType =>
    (errorCodes.indexOf(code) > -1) ? 'error' : 'warning';

export default {
    build: (options: ResultOptions): ValidationResult => {
        const interaction = options.pactSegment.parentInteraction;
        const operation = options.swaggerSegment.parentOperation;

        return {
            code: options.code,
            message: options.message,
            pactDetails: {
                interactionDescription: interaction.description,
                interactionState: interaction.state,
                location: options.pactSegment.location,
                pactFile: interaction.pactFile,
                value: options.pactSegment.value
            },
            source: options.source,
            swaggerDetails: {
                location: options.swaggerSegment.location,
                pathMethod: operation.method,
                pathName: operation.pathName,
                swaggerFile: operation.swaggerFile,
                value: options.swaggerSegment.value
            },
            type: codeToType(options.code)
        };
    }
};
