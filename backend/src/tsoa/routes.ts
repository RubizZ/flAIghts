/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UsersController } from './../modules/users/user.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SearchController } from './../modules/search/search.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../modules/auth/auth.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AirportController } from './../modules/airport/airport.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AirlineController } from './../modules/airline/airline.controller.js';
import { expressAuthentication } from './../modules/auth/authentication.js';
// @ts-ignore - no great way to install types from subpackage
import { iocContainer } from './../ioc.js';
import type { IocContainer, IocContainerFactory } from '@tsoa/runtime';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';

const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "SuccessResponseType": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_EMAIL_ALREADY_IN_USE._field-email--value-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"string","required":true},"field":{"dataType":"enum","enums":["email"],"required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["EMAIL_ALREADY_IN_USE"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_EmailAlreadyInUseError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_EMAIL_ALREADY_IN_USE._field-email--value-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_InitiateRegistrationData__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.email":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_InitiateRegistrationData___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_InitiateRegistrationData__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InitiateRegistrationRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_InitiateRegistrationData___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InitiateRegistrationData": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "User": {
        "dataType": "refObject",
        "properties": {
            "_id": {"dataType":"string","required":true},
            "type": {"dataType":"enum","enums":["self"],"required":true},
            "username": {"dataType":"string","required":true},
            "public": {"dataType":"boolean","required":true},
            "email": {"dataType":"string","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},
            "preferences": {"dataType":"nestedObjectLiteral","nestedProperties":{"airline_quality_weight":{"dataType":"double","required":true},"stops_weight":{"dataType":"double","required":true},"duration_weight":{"dataType":"double","required":true},"price_weight":{"dataType":"double","required":true}},"required":true},
            "created_at": {"dataType":"string","required":true},
            "last_seen_at": {"dataType":"string","required":true},
            "auth_version": {"dataType":"double","required":true},
            "friends": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "sent_friend_requests": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "received_friend_requests": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "pending_email": {"dataType":"string"},
            "profile_picture": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_User_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"User","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_USERNAME_ALREADY_IN_USE._field-username--value-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"string","required":true},"field":{"dataType":"enum","enums":["username"],"required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["USERNAME_ALREADY_IN_USE"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_UsernameAlreadyInUseError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_USERNAME_ALREADY_IN_USE._field-username--value-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_EmailVerificationCodeInvalidOrExpiredError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_CompleteRegistrationData__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.email":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.username":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.code":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.password":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.price_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.duration_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.stops_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.airline_quality_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_CompleteRegistrationData___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_CompleteRegistrationData__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompleteRegistrationRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_CompleteRegistrationData___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompleteRegistrationData": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$"}}},
            "code": {"dataType":"string","required":true,"validators":{"minLength":{"value":6},"maxLength":{"value":6}}},
            "username": {"dataType":"string","required":true,"validators":{"minLength":{"value":3},"maxLength":{"value":20}}},
            "password": {"dataType":"string","required":true,"validators":{"minLength":{"value":8}}},
            "preferences": {"dataType":"nestedObjectLiteral","nestedProperties":{"airline_quality_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"stops_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"duration_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"price_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FriendUser": {
        "dataType": "refObject",
        "properties": {
            "_id": {"dataType":"string","required":true},
            "type": {"dataType":"enum","enums":["friend"],"required":true},
            "username": {"dataType":"string","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},
            "created_at": {"dataType":"string","required":true},
            "last_seen_at": {"dataType":"string","required":true},
            "friend_since": {"dataType":"string","required":true},
            "profile_picture": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PublicUser": {
        "dataType": "refObject",
        "properties": {
            "_id": {"dataType":"string","required":true},
            "type": {"dataType":"enum","enums":["public"],"required":true},
            "username": {"dataType":"string","required":true},
            "public": {"dataType":"boolean","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},
            "created_at": {"dataType":"string","required":true},
            "last_seen_at": {"dataType":"string","required":true},
            "sent_friend_request": {"dataType":"boolean","required":true},
            "received_friend_request": {"dataType":"boolean","required":true},
            "profile_picture": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Pick_User.Exclude_keyofUser.friends-or-sent_friend_requests-or-received_friend_requests__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"friends":{"dataType":"array","array":{"dataType":"refObject","ref":"FriendUser"},"required":true},"sent_friend_requests":{"dataType":"array","array":{"dataType":"refObject","ref":"PublicUser"},"required":true},"received_friend_requests":{"dataType":"array","array":{"dataType":"refObject","ref":"PublicUser"},"required":true},"email":{"dataType":"string","required":true},"username":{"dataType":"string","required":true},"preferences":{"dataType":"nestedObjectLiteral","nestedProperties":{"airline_quality_weight":{"dataType":"double","required":true},"stops_weight":{"dataType":"double","required":true},"duration_weight":{"dataType":"double","required":true},"price_weight":{"dataType":"double","required":true}},"required":true},"_id":{"dataType":"string","required":true},"type":{"dataType":"enum","enums":["self"],"required":true},"public":{"dataType":"boolean","required":true},"role":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},"created_at":{"dataType":"string","required":true},"last_seen_at":{"dataType":"string","required":true},"auth_version":{"dataType":"double","required":true},"pending_email":{"dataType":"string"},"profile_picture":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PopulatedUser": {
        "dataType": "refObject",
        "properties": {
            "friends": {"dataType":"array","array":{"dataType":"refObject","ref":"FriendUser"},"required":true},
            "sent_friend_requests": {"dataType":"array","array":{"dataType":"refObject","ref":"PublicUser"},"required":true},
            "received_friend_requests": {"dataType":"array","array":{"dataType":"refObject","ref":"PublicUser"},"required":true},
            "email": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "preferences": {"dataType":"nestedObjectLiteral","nestedProperties":{"airline_quality_weight":{"dataType":"double","required":true},"stops_weight":{"dataType":"double","required":true},"duration_weight":{"dataType":"double","required":true},"price_weight":{"dataType":"double","required":true}},"required":true},
            "_id": {"dataType":"string","required":true},
            "type": {"dataType":"enum","enums":["self"],"required":true},
            "public": {"dataType":"boolean","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},
            "created_at": {"dataType":"string","required":true},
            "last_seen_at": {"dataType":"string","required":true},
            "auth_version": {"dataType":"double","required":true},
            "pending_email": {"dataType":"string"},
            "profile_picture": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetUserResponseData": {
        "dataType": "refAlias",
        "type": {"ref":"PopulatedUser","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_GetUserResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"GetUserResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NO_TOKEN_PROVIDED._reason-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"reason":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NO_TOKEN_PROVIDED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_NoTokenProvidedError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NO_TOKEN_PROVIDED._reason-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_INVALID_TOKEN.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["INVALID_TOKEN"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_InvalidTokenError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_INVALID_TOKEN.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_TOKEN_USER_NOT_FOUND._userId-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"userId":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["TOKEN_USER_NOT_FOUND"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_TokenUserNotFoundError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_TOKEN_USER_NOT_FOUND._userId-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_AUTH_VERSION_MISMATCH._userId-string--currentVersion-number--tokenVersion-number__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"tokenVersion":{"dataType":"double","required":true},"currentVersion":{"dataType":"double","required":true},"userId":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["AUTH_VERSION_MISMATCH"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_AuthenticationVersionMismatchError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_AUTH_VERSION_MISMATCH._userId-string--currentVersion-number--tokenVersion-number__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"FailResponseFromError_NoTokenProvidedError_"},{"ref":"FailResponseFromError_InvalidTokenError_"},{"ref":"FailResponseFromError_TokenUserNotFoundError_"},{"ref":"FailResponseFromError_AuthenticationVersionMismatchError_"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthenticatedUser": {
        "dataType": "refObject",
        "properties": {
            "_id": {"dataType":"string","required":true},
            "username": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["admin"]}],"required":true},
            "auth_version": {"dataType":"double","required":true},
            "token": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserResponseData": {
        "dataType": "refAlias",
        "type": {"ref":"User","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_UpdateUserResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"UpdateUserResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NOT_FOUND._userId-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"userId":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NOT_FOUND"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_UserNotFoundError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NOT_FOUND._userId-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_UpdateUserData__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.username":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.price_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.duration_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.stops_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.preferences.airline_quality_weight":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.public":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_UpdateUserData___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_UpdateUserData__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_UpdateUserData___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string._message-string--value-any__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any","required":true},"message":{"dataType":"string","required":true}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DatabaseValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"Record_string._message-string--value-any__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["DATABASE_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"UpdateUserRequestValidationFailResponse"},{"ref":"DatabaseValidationFailResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserData": {
        "dataType": "refObject",
        "properties": {
            "username": {"dataType":"string","validators":{"minLength":{"value":3},"maxLength":{"value":20}}},
            "public": {"dataType":"boolean"},
            "preferences": {"dataType":"nestedObjectLiteral","nestedProperties":{"airline_quality_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"stops_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"duration_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},"price_weight":{"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_InitiateEmailChangeData__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.newEmail":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_InitiateEmailChangeData___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_InitiateEmailChangeData__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InitiateEmailChangeRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_InitiateEmailChangeData___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "InitiateEmailChangeData": {
        "dataType": "refObject",
        "properties": {
            "newEmail": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_CompleteEmailChangeData__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.oldEmailCode":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.newEmailCode":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_CompleteEmailChangeData___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_CompleteEmailChangeData__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompleteEmailChangeRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_CompleteEmailChangeData___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompleteEmailChangeData": {
        "dataType": "refObject",
        "properties": {
            "oldEmailCode": {"dataType":"string","required":true,"validators":{"minLength":{"value":6},"maxLength":{"value":6}}},
            "newEmailCode": {"dataType":"string","required":true,"validators":{"minLength":{"value":6},"maxLength":{"value":6}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_PublicUser-Array_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"PublicUser"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_QueryPath__q-string___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"query":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"query.q":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_QueryPath__q-string____": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_QueryPath__q-string___","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetUserByIdResponseData": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"PopulatedUser"},{"ref":"User"},{"ref":"PublicUser"},{"ref":"FriendUser"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_GetUserByIdResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"GetUserByIdResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_PathPath__id-string___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"path":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"path.id":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_PathPath__id-string____": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_PathPath__id-string___","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_SELF_FRIEND_REQUEST.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["SELF_FRIEND_REQUEST"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_SelfFriendRequestError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_SELF_FRIEND_REQUEST.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_ALREADY_FRIENDS.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["ALREADY_FRIENDS"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_AlreadyFriendsError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_ALREADY_FRIENDS.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_FRIEND_REQUEST_ALREADY_SENT.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["FRIEND_REQUEST_ALREADY_SENT"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_FriendRequestAlreadySentError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_FRIEND_REQUEST_ALREADY_SENT.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_FRIEND_REQUEST_ALREADY_RECEIVED.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["FRIEND_REQUEST_ALREADY_RECEIVED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_FriendRequestAlreadyReceivedError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_FRIEND_REQUEST_ALREADY_RECEIVED.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NO_PENDING_FRIEND_REQUEST.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NO_PENDING_FRIEND_REQUEST"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_NoPendingFriendRequestError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NO_PENDING_FRIEND_REQUEST.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NO_RECEIVED_FRIEND_REQUEST.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NO_RECEIVED_FRIEND_REQUEST"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_NoReceivedFriendRequestError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NO_RECEIVED_FRIEND_REQUEST.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NOT_FRIENDS.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NOT_FRIENDS"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_NotFriendsError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NOT_FRIENDS.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_INVALID_PROFILE_PICTURE.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["INVALID_PROFILE_PICTURE"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_InvalidProfilePictureError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_INVALID_PROFILE_PICTURE.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_PROFILE_PICTURE_TOO_LARGE._size-number--maxSize-number__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"maxSize":{"dataType":"double","required":true},"size":{"dataType":"double","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["PROFILE_PICTURE_TOO_LARGE"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_ProfilePictureTooLargeError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_PROFILE_PICTURE_TOO_LARGE._size-number--maxSize-number__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RateLimitFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["RATE_LIMIT_EXCEEDED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetProfilePictureRequest": {
        "dataType": "refAlias",
        "type": {"dataType":"buffer","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LegResponse": {
        "dataType": "refObject",
        "properties": {
            "order": {"dataType":"double","required":true},
            "flight_id": {"dataType":"string","required":true},
            "origin": {"dataType":"string","required":true},
            "destination": {"dataType":"string","required":true},
            "price": {"dataType":"double","required":true},
            "duration": {"dataType":"double","required":true},
            "airline": {"dataType":"string","required":true},
            "airline_logo": {"dataType":"string"},
            "departure_time": {"dataType":"string","required":true},
            "arrival_time": {"dataType":"string","required":true},
            "wait_time": {"dataType":"double"},
            "airplane": {"dataType":"string","required":true},
            "flight_number": {"dataType":"string","required":true},
            "travel_class": {"dataType":"string","required":true},
            "extensions": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ItineraryResponse": {
        "dataType": "refObject",
        "properties": {
            "score": {"dataType":"double","required":true},
            "total_price": {"dataType":"double","required":true},
            "total_duration": {"dataType":"double","required":true},
            "city_order": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "legs": {"dataType":"array","array":{"dataType":"refObject","ref":"LegResponse"},"required":true},
            "created_at": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchResponseData": {
        "dataType": "refObject",
        "properties": {
            "_id": {"dataType":"string","required":true},
            "user_id": {"dataType":"string"},
            "origins": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "destinations": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "departure_date": {"dataType":"datetime","required":true},
            "return_date": {"dataType":"datetime"},
            "criteria": {"dataType":"nestedObjectLiteral","nestedProperties":{"max_price":{"dataType":"double"},"priority":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["balanced"]},{"dataType":"enum","enums":["cheap"]},{"dataType":"enum","enums":["fast"]}],"required":true}},"required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["searching"]},{"dataType":"enum","enums":["completed"]},{"dataType":"enum","enums":["failed"]}],"required":true},
            "departure_itineraries": {"dataType":"array","array":{"dataType":"refObject","ref":"ItineraryResponse"}},
            "return_itineraries": {"dataType":"array","array":{"dataType":"refObject","ref":"ItineraryResponse"}},
            "created_at": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_SearchResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"SearchResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_SearchRequest__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.origins":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.destinations":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.departure_date":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.return_date":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.criteria":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.criteria.priority":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.criteria.max_price":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.dates":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_SearchRequest___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_SearchRequest__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_SearchRequest___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"SearchRequestValidationFailResponse"},{"ref":"DatabaseValidationFailResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SearchRequest": {
        "dataType": "refObject",
        "properties": {
            "origins": {"dataType":"array","array":{"dataType":"string"},"required":true,"validators":{"minItems":{"value":1},"pattern":{"value":"^[A-Z]{3}$"}}},
            "destinations": {"dataType":"array","array":{"dataType":"string"},"required":true,"validators":{"minItems":{"value":1},"pattern":{"value":"^[A-Z]{3}$"}}},
            "departure_date": {"dataType":"datetime","required":true,"validators":{"isDateTime":{"errorMsg":"Fecha de ida (YYYY-MM-DD o formato ISO)"}}},
            "return_date": {"dataType":"datetime","validators":{"isDateTime":{"errorMsg":"Fecha de vuelta (si es round_trip)"}}},
            "criteria": {"dataType":"nestedObjectLiteral","nestedProperties":{"max_price":{"dataType":"double","validators":{"minimum":{"value":0}}},"priority":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["balanced"]},{"dataType":"enum","enums":["cheap"]},{"dataType":"enum","enums":["fast"]}],"required":true}},"required":true},
            "dates": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GeneticTripRequest": {
        "dataType": "refObject",
        "properties": {
            "origin": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^[A-Z]{3}$"}}},
            "cities": {"dataType":"array","array":{"dataType":"string"},"required":true,"validators":{"minItems":{"value":1},"pattern":{"value":"^[A-Z]{3}$"}}},
            "startDate": {"dataType":"datetime","required":true,"validators":{"isDateTime":{"errorMsg":"Fecha de inicio del viaje"}}},
            "daysPerCity": {"dataType":"double","required":true,"validators":{"minimum":{"value":1}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NOT_FOUND._searchId-string--requesterId-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"requesterId":{"dataType":"string","required":true},"searchId":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NOT_FOUND"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_SearchNotFoundError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NOT_FOUND._searchId-string--requesterId-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NOT_AUTHORIZED._searchId-string--requesterId-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"requesterId":{"dataType":"string","required":true},"searchId":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NOT_AUTHORIZED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_SearchNotAuthorizedError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NOT_AUTHORIZED._searchId-string--requesterId-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_PathPath__searchId-string___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"path":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"path.searchId":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_PathPath__searchId-string____": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_PathPath__searchId-string___","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType__items-SearchResponseData-Array--total-number--page-number--totalPages-number__": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"totalPages":{"dataType":"double","required":true},"page":{"dataType":"double","required":true},"total":{"dataType":"double","required":true},"items":{"dataType":"array","array":{"dataType":"refObject","ref":"SearchResponseData"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_PathPath__userId-string__-or-QueryPath__page-number--limit-number___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"query":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"path":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"path.userId":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"query.page":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"query.limit":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_PathPath__userId-string__-or-QueryPath__page-number--limit-number____": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_PathPath__userId-string__-or-QueryPath__page-number--limit-number___","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginResponseData": {
        "dataType": "refObject",
        "properties": {
            "userId": {"dataType":"string","required":true},
            "token": {"dataType":"string","required":true},
            "authVersion": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_LoginResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"LoginResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_LoginRequest__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.password":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.identifier":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.responseType":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_LoginRequest___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_LoginRequest__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_LoginRequest___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"LoginRequestValidationFailResponse","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_INVALID_CREDENTIALS._identifier-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"identifier":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["INVALID_CREDENTIALS"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_InvalidCredentialsError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_INVALID_CREDENTIALS._identifier-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequest": {
        "dataType": "refObject",
        "properties": {
            "identifier": {"dataType":"string","required":true,"validators":{"minLength":{"value":3}}},
            "password": {"dataType":"string","required":true,"validators":{"minLength":{"value":8}}},
            "responseType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["cookie"]},{"dataType":"enum","enums":["json"]}],"default":"json"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MessageResponseData": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponse_MessageResponseData_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"MessageResponseData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_ChangePasswordRequest__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.oldPassword":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.newPassword":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_ChangePasswordRequest___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_ChangePasswordRequest__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangePasswordRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_ChangePasswordRequest___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangePasswordValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"ChangePasswordRequestValidationFailResponse"},{"ref":"DatabaseValidationFailResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_INVALID_PASSWORD._identifier-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"identifier":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["INVALID_PASSWORD"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_InvalidPasswordError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_INVALID_PASSWORD._identifier-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangePasswordErrorResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"AuthFailResponse"},{"ref":"FailResponseFromError_InvalidPasswordError_"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_NEW_PASSWORD_SAME_AS_OLD.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["NEW_PASSWORD_SAME_AS_OLD"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_NewPasswordSameAsOldError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_NEW_PASSWORD_SAME_AS_OLD.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_USER_NOT_FOUND._identifier-string__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"nestedObjectLiteral","nestedProperties":{"identifier":{"dataType":"string","required":true}},"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["USER_NOT_FOUND"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_LoginUserNotFoundError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_USER_NOT_FOUND._identifier-string__","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ChangePasswordRequest": {
        "dataType": "refObject",
        "properties": {
            "oldPassword": {"dataType":"string","required":true,"validators":{"minLength":{"value":8}}},
            "newPassword": {"dataType":"string","required":true,"validators":{"minLength":{"value":8}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_ForgotPasswordRequest__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.email":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_ForgotPasswordRequest___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_ForgotPasswordRequest__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ForgotPasswordRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_ForgotPasswordRequest___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ForgotPasswordValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"ForgotPasswordRequestValidationFailResponse","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ForgotPasswordRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true,"validators":{"pattern":{"value":"^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationDetails_BodyPath_ResetPasswordRequest__": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"body":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.newPassword":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}},"body.token":{"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any"},"message":{"dataType":"string","required":true}}}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RequestValidationFailResponse_ValidationDetails_BodyPath_ResetPasswordRequest___": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"ref":"ValidationDetails_BodyPath_ResetPasswordRequest__","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["REQUEST_VALIDATION_ERROR"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetPasswordRequestValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"ref":"RequestValidationFailResponse_ValidationDetails_BodyPath_ResetPasswordRequest___","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetPasswordValidationFailResponse": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"ref":"ResetPasswordRequestValidationFailResponse"},{"ref":"DatabaseValidationFailResponse"}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponse_RESET_TOKEN_INVALID_OR_EXPIRED.undefined_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"nestedObjectLiteral","nestedProperties":{"details":{"dataType":"undefined","required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"enum","enums":["RESET_TOKEN_INVALID_OR_EXPIRED"],"required":true}},"required":true},"status":{"dataType":"enum","enums":["fail"],"required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FailResponseFromError_ResetTokenInvalidOrExpiredError_": {
        "dataType": "refAlias",
        "type": {"ref":"FailResponse_RESET_TOKEN_INVALID_OR_EXPIRED.undefined_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResetPasswordRequest": {
        "dataType": "refObject",
        "properties": {
            "token": {"dataType":"string","required":true},
            "newPassword": {"dataType":"string","required":true,"validators":{"minLength":{"value":8}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AirportResponse": {
        "dataType": "refObject",
        "properties": {
            "iata_code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "importance_score": {"dataType":"double","required":true},
            "location": {"dataType":"nestedObjectLiteral","nestedProperties":{"coordinates":{"dataType":"array","array":{"dataType":"double"},"required":true},"type":{"dataType":"enum","enums":["Point"],"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedAirportResponse": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"AirportResponse"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_PaginatedAirportResponse_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"PaginatedAirportResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GlobeAirportResponse": {
        "dataType": "refObject",
        "properties": {
            "i": {"dataType":"string","required":true},
            "n": {"dataType":"string","required":true},
            "ci": {"dataType":"string","required":true},
            "la": {"dataType":"double","required":true},
            "lo": {"dataType":"double","required":true},
            "s": {"dataType":"double","required":true},
            "c": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_GlobeAirportResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"GlobeAirportResponse"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_AirportResponse_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"AirportResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AirlineResponse": {
        "dataType": "refObject",
        "properties": {
            "code": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "quality_score": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginatedAirlineResponse": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"refObject","ref":"AirlineResponse"},"required":true},
            "total": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseType_PaginatedAirlineResponse_": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["success"],"required":true},
            "data": {"ref":"PaginatedAirlineResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsUsersController_initiateRegistration: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"InitiateRegistrationData"},
        };
        app.post('/users/register/initiate',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.initiateRegistration)),

            async function UsersController_initiateRegistration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_initiateRegistration, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'initiateRegistration',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_completeRegistration: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CompleteRegistrationData"},
        };
        app.post('/users/register/complete',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.completeRegistration)),

            async function UsersController_completeRegistration(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_completeRegistration, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'completeRegistration',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getSelfUser: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.get('/users/me',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getSelfUser)),

            async function UsersController_getSelfUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getSelfUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSelfUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_updateUser: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserData"},
        };
        app.patch('/users/me',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.updateUser)),

            async function UsersController_updateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_updateUser, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'updateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_initiateEmailChange: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                body: {"in":"body","name":"body","required":true,"ref":"InitiateEmailChangeData"},
        };
        app.post('/users/me/change-email/initiate',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.initiateEmailChange)),

            async function UsersController_initiateEmailChange(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_initiateEmailChange, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'initiateEmailChange',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_completeEmailChange: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                body: {"in":"body","name":"body","required":true,"ref":"CompleteEmailChangeData"},
        };
        app.post('/users/me/change-email/complete',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.completeEmailChange)),

            async function UsersController_completeEmailChange(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_completeEmailChange, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'completeEmailChange',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_cancelEmailChange: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/me/change-email/cancel',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.cancelEmailChange)),

            async function UsersController_cancelEmailChange(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_cancelEmailChange, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelEmailChange',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_searchUsers: Record<string, TsoaRoute.ParameterSchema> = {
                q: {"in":"query","name":"q","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.get('/users/search',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.searchUsers)),

            async function UsersController_searchUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_searchUsers, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getUserById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.get('/users/:id',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getUserById)),

            async function UsersController_getUserById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getUserById, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUserById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_sendFriendRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/:id/send-friend-request',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.sendFriendRequest)),

            async function UsersController_sendFriendRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_sendFriendRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'sendFriendRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_cancelFriendRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/:id/cancel-friend-request',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.cancelFriendRequest)),

            async function UsersController_cancelFriendRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_cancelFriendRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'cancelFriendRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_acceptFriendRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/:id/accept-friend-request',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.acceptFriendRequest)),

            async function UsersController_acceptFriendRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_acceptFriendRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'acceptFriendRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_rejectFriendRequest: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/:id/reject-friend-request',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.rejectFriendRequest)),

            async function UsersController_rejectFriendRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_rejectFriendRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'rejectFriendRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_removeFriend: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.post('/users/:id/remove-friend',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.removeFriend)),

            async function UsersController_removeFriend(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_removeFriend, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'removeFriend',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_setProfilePicture: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                body: {"in":"body","name":"body","required":true,"ref":"SetProfilePictureRequest"},
        };
        app.post('/users/me/profile-picture',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.setProfilePicture)),

            async function UsersController_setProfilePicture(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_setProfilePicture, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'setProfilePicture',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUsersController_getUserAvatar: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/users/:id/avatar',
            ...(fetchMiddlewares<RequestHandler>(UsersController)),
            ...(fetchMiddlewares<RequestHandler>(UsersController.prototype.getUserAvatar)),

            async function UsersController_getUserAvatar(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUsersController_getUserAvatar, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<UsersController>(UsersController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getUserAvatar',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 302,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_searchRequest: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"SearchRequest"},
                user: {"in":"request-prop","name":"user","required":true,"dataType":"union","subSchemas":[{"ref":"AuthenticatedUser"},{"dataType":"enum","enums":[null]}]},
        };
        app.post('/search',
            authenticateMiddleware([{"jwt-optional":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.searchRequest)),

            async function SearchController_searchRequest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_searchRequest, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchRequest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_geneticTrip: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"GeneticTripRequest"},
                user: {"in":"request-prop","name":"user","required":true,"dataType":"union","subSchemas":[{"ref":"AuthenticatedUser"},{"dataType":"enum","enums":[null]}]},
        };
        app.post('/search/genetic',
            authenticateMiddleware([{"jwt-optional":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.geneticTrip)),

            async function SearchController_geneticTrip(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_geneticTrip, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'geneticTrip',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_searchResult: Record<string, TsoaRoute.ParameterSchema> = {
                searchId: {"in":"path","name":"searchId","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"dataType":"union","subSchemas":[{"ref":"AuthenticatedUser"},{"dataType":"enum","enums":[null]}]},
        };
        app.get('/search/:searchId',
            authenticateMiddleware([{"jwt-optional":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.searchResult)),

            async function SearchController_searchResult(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_searchResult, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchResult',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_shareSearch: Record<string, TsoaRoute.ParameterSchema> = {
                searchId: {"in":"path","name":"searchId","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.patch('/search/:searchId/share',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.shareSearch)),

            async function SearchController_shareSearch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_shareSearch, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'shareSearch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_privatizeSearch: Record<string, TsoaRoute.ParameterSchema> = {
                searchId: {"in":"path","name":"searchId","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
        };
        app.patch('/search/:searchId/privatize',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.privatizeSearch)),

            async function SearchController_privatizeSearch(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_privatizeSearch, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'privatizeSearch',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsSearchController_getSearches: Record<string, TsoaRoute.ParameterSchema> = {
                userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
                user: {"in":"request-prop","name":"user","required":true,"dataType":"union","subSchemas":[{"ref":"AuthenticatedUser"},{"dataType":"enum","enums":[null]}]},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":10,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/search/user/:userId',
            authenticateMiddleware([{"jwt-optional":[]}]),
            ...(fetchMiddlewares<RequestHandler>(SearchController)),
            ...(fetchMiddlewares<RequestHandler>(SearchController.prototype.getSearches)),

            async function SearchController_getSearches(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsSearchController_getSearches, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SearchController>(SearchController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getSearches',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_login: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"LoginRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/auth/login',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.login)),

            async function AuthController_login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_login, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_logout: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/auth/logout',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.logout)),

            async function AuthController_logout(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_logout, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'logout',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_logoutAll: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/auth/logoutAll',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.logoutAll)),

            async function AuthController_logoutAll(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_logoutAll, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'logoutAll',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_changePassword: Record<string, TsoaRoute.ParameterSchema> = {
                user: {"in":"request-prop","name":"user","required":true,"ref":"AuthenticatedUser"},
                body: {"in":"body","name":"body","required":true,"ref":"ChangePasswordRequest"},
        };
        app.post('/auth/change-password',
            authenticateMiddleware([{"jwt":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.changePassword)),

            async function AuthController_changePassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_changePassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'changePassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_forgotPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ForgotPasswordRequest"},
        };
        app.post('/auth/forgot-password',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.forgotPassword)),

            async function AuthController_forgotPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_forgotPassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'forgotPassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_resetPassword: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"ResetPasswordRequest"},
        };
        app.post('/auth/reset-password',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.resetPassword)),

            async function AuthController_resetPassword(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_resetPassword, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AuthController>(AuthController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'resetPassword',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAirportController_searchAirports: Record<string, TsoaRoute.ParameterSchema> = {
                q: {"in":"query","name":"q","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":10,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/airports',
            ...(fetchMiddlewares<RequestHandler>(AirportController)),
            ...(fetchMiddlewares<RequestHandler>(AirportController.prototype.searchAirports)),

            async function AirportController_searchAirports(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAirportController_searchAirports, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AirportController>(AirportController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchAirports',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAirportController_getGlobeAirports: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/airports/globe',
            ...(fetchMiddlewares<RequestHandler>(AirportController)),
            ...(fetchMiddlewares<RequestHandler>(AirportController.prototype.getGlobeAirports)),

            async function AirportController_getGlobeAirports(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAirportController_getGlobeAirports, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AirportController>(AirportController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getGlobeAirports',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAirportController_getAirportByIata: Record<string, TsoaRoute.ParameterSchema> = {
                iata: {"in":"path","name":"iata","required":true,"dataType":"string"},
        };
        app.get('/airports/:iata',
            ...(fetchMiddlewares<RequestHandler>(AirportController)),
            ...(fetchMiddlewares<RequestHandler>(AirportController.prototype.getAirportByIata)),

            async function AirportController_getAirportByIata(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAirportController_getAirportByIata, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AirportController>(AirportController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'getAirportByIata',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAirlineController_searchAirlines: Record<string, TsoaRoute.ParameterSchema> = {
                q: {"in":"query","name":"q","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":10,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/airlines',
            ...(fetchMiddlewares<RequestHandler>(AirlineController)),
            ...(fetchMiddlewares<RequestHandler>(AirlineController.prototype.searchAirlines)),

            async function AirlineController_searchAirlines(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAirlineController_searchAirlines, request, response });

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<AirlineController>(AirlineController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }

              await templateService.apiHandler({
                methodName: 'searchAirlines',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
