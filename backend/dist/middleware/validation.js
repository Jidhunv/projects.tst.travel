"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDTO = validateDTO;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const errorHandler_1 = require("./errorHandler");
function validateDTO(dtoClass) {
    return async (req, res, next) => {
        try {
            const instance = (0, class_transformer_1.plainToInstance)(dtoClass, req.body);
            const errors = await (0, class_validator_1.validate)(instance, {
                skipMissingProperties: false,
                forbidUnknownValues: true,
            });
            if (errors.length > 0) {
                const messages = errors
                    .map((error) => Object.values(error.constraints || {}).join(', '))
                    .join('; ');
                throw new errorHandler_1.AppError(400, `Validation failed: ${messages}`);
            }
            req.body = instance;
            next();
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                next(error);
            }
            else {
                next(new errorHandler_1.AppError(400, 'Invalid request body'));
            }
        }
    };
}
//# sourceMappingURL=validation.js.map