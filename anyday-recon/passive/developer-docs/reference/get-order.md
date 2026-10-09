---
updatedAt: 2025-05-28T00:30:56.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Get Order

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "Anyday API",
    "version": "v1"
  },
  "servers": [
    {
      "url": "https://my.anyday.io",
      "description": "Main (production) server"
    }
  ],
  "paths": {
    "/api/v1/orders": {
      "get": {
        "tags": [
          "Orders"
        ],
        "summary": "Get Order",
        "parameters": [
          {
            "name": "id",
            "in": "query",
            "description": "Anyday purchaseOrderId or Webshop orderId",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.Core.CQS.Base.ICommandResult"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Microsoft.AspNetCore.Mvc.ProblemDetails"
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentResponse"
                }
              }
            }
          }
        },
        "x-code-samples": [
          {
            "lang": "HTTP",
            "label": "HTTP Request",
            "source": "GET /api/v1/orders HTTP/1.1\nHost: my.anyday.io\n"
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Anyday.Split.Core.CQS.Base.CommandError": {
        "type": "object",
        "properties": {
          "code": {
            "$ref": "#/components/schemas/Anyday.Split.Core.CQS.Base.ErrorCode"
          },
          "message": {
            "type": "string",
            "nullable": true
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "data": {
            "nullable": true
          },
          "formattedMessagePlaceholderValues": {
            "type": "object",
            "additionalProperties": {},
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "Anyday.Split.Core.CQS.Base.ErrorCode": {
        "enum": [
          1000,
          1001,
          1002,
          1003,
          1004,
          1100,
          1101,
          1102,
          1103,
          1104,
          1105,
          1106,
          1107,
          1108,
          1109,
          1110,
          1111,
          1112,
          1113,
          1114,
          1115,
          1116,
          1117,
          1118,
          1119,
          1120,
          1121,
          1122,
          1123,
          1124,
          1125,
          1126,
          1127,
          1128,
          1129,
          1130,
          1131,
          1132,
          1133,
          1134,
          1200,
          1201,
          1202,
          1203,
          1204,
          1205,
          1206,
          1207,
          1208,
          1209,
          1210,
          1211,
          1212,
          1213,
          1214,
          1215,
          1216,
          1300,
          1301,
          1302,
          1303,
          1304,
          1305,
          1306,
          1307,
          1308,
          1310,
          1311,
          1312,
          1313,
          1314,
          1315,
          1316,
          1317,
          1318,
          1319,
          1320,
          1321,
          1322,
          1323,
          1324,
          1325,
          1326,
          1327,
          1328,
          1329,
          1330,
          1331,
          1332,
          1333,
          1334,
          1335,
          1336,
          1337,
          1340,
          1341,
          1342,
          1343,
          1400,
          1401,
          1402,
          1403,
          1404,
          1405,
          1406,
          1407,
          1408,
          1500,
          1501,
          1502,
          1503,
          1504,
          1600,
          1601,
          1602,
          1700,
          1701,
          1702,
          1800,
          1801,
          1802,
          1803,
          1804,
          1900,
          1901,
          1902,
          1903,
          2000,
          2001,
          2002,
          2003,
          2100,
          2101,
          2102,
          2103,
          2104,
          2200,
          2201,
          2202,
          2203,
          2204,
          2205,
          2206,
          2210,
          2211,
          2212,
          2213,
          2214,
          2215,
          2220,
          2221,
          2222,
          2223,
          2224,
          2226,
          2227,
          2228,
          2229,
          2230,
          2231,
          2232,
          2233,
          2234,
          2235,
          2300,
          2400,
          2401,
          2402,
          2500,
          2501,
          2502,
          2503,
          2504,
          2600,
          2601,
          2602,
          2603,
          2604,
          2605,
          2606,
          2700,
          2701,
          2702,
          3500,
          3501,
          3502,
          3503,
          3504,
          3505,
          3506,
          3507,
          3508,
          3509,
          3510,
          3511,
          3512,
          3513,
          3514,
          3515,
          3600,
          3601,
          3602,
          3603,
          3604,
          3605,
          3606,
          3607,
          3608,
          3609,
          3610,
          3611,
          3612,
          3613,
          3614,
          3615,
          3616,
          3617,
          3618,
          3619,
          3700,
          3701,
          3702,
          3703,
          3704,
          3705,
          3706,
          3707,
          3708,
          3709,
          3710,
          3711,
          3712,
          3713,
          3714,
          3715,
          3716,
          3717,
          3718,
          3719,
          3720,
          3721,
          3722
        ],
        "type": "integer",
        "format": "int32",
        "x-enumNames": [
          "Unknown",
          "Undefined",
          "CustomMessage",
          "NoChanges",
          "NotAllowed",
          "Validation",
          "PropertyValidation",
          "PropertyNotProvided",
          "DuplicateValue",
          "EmailValidator",
          "GreaterThanOrEqualValidator",
          "GreaterThanValidator",
          "LengthValidator",
          "MinimumLengthValidator",
          "MaximumLengthValidator",
          "LessThanOrEqualValidator",
          "LessThanValidator",
          "NotEmptyValidator",
          "NotEqualValidator",
          "NotNullValidator",
          "PredicateValidator",
          "AsyncPredicateValidator",
          "RegularExpressionValidator",
          "EqualValidator",
          "ExactLengthValidator",
          "InclusiveBetweenValidator",
          "ExclusiveBetweenValidator",
          "CreditCardValidator",
          "ScalePrecisionValidator",
          "EmptyValidator",
          "NullValidator",
          "EnumValidator",
          "Length_Simple",
          "MinimumLength_Simple",
          "MaximumLength_Simple",
          "ExactLength_Simple",
          "InclusiveBetween_Simple",
          "InvalidUrl",
          "MissingOnboardingSteps",
          "InvalidLanguage",
          "InvalidCurrencyCode",
          "TooManyDecimalPlaces",
          "IdentityResult",
          "NemIdLoginError",
          "NemIdSessionExpired",
          "NemIdCountryNotMatch",
          "NemIdUnder18",
          "NemIdInvalidName",
          "NemIdFoundInRKI",
          "NemIdNameIsSecret",
          "NemIdAddressIsSecret",
          "NemIdNotFoundInCpr",
          "NemIdMissingLastName",
          "NemIdMissingCity",
          "NemIdMissingPostCode",
          "NemIdInvalidCprStatusCode",
          "ShopperSignupUnsuccessful",
          "ShopperLoginCancelled",
          "CriiptoInvalidState",
          "Payment",
          "PaymentOrderNotFound",
          "PaymentShopperRedFlag",
          "PaymentNotEnoughCredit",
          "PaymentOverSpendingLimit",
          "PaymentCardNotAuthorized",
          "TransactionPending",
          "PurchaseShopperNotAllowed",
          "PurchaseShopperConflicts",
          "AcquirerError",
          "GeneralInputError",
          "InvalidCardNumber",
          "UnsupportedCardScheme",
          "InvalidCSC",
          "InvalidExpireDate",
          "CardExpired",
          "InvalidCurrency",
          "InvalidTextOnStatement",
          "InvalidTransaction",
          "ClearhausRuleViolation",
          "ThreeDSecureProblem",
          "ThreeDSecureAuthenticationFailure",
          "BackendProblem",
          "DeclinedByIssuerOrCardScheme",
          "CardRestricted",
          "CardLostOrStolen",
          "InsufficientFunds",
          "SuspectedFraud",
          "AmountLimitExceeded",
          "AdditionalAuthenticationRequired",
          "MerchantBlockedByCardholder",
          "ClearhausError",
          "MissingBillingCustomer",
          "RequiresConfirmation",
          "DownpaymentLowerThanMinimumValue",
          "DownpaymentHigherThanSoftMaximumValue",
          "DownpaymentHigherThanHardMaximumValue",
          "MerchantNoIdentifier",
          "PaymentCardNotAllowed",
          "PaymentCardNotActivated",
          "PaymentNotValidAmount",
          "Email",
          "InvalidEmail",
          "DuplicateEmail",
          "SuspectedEmail",
          "SuggestionEmail",
          "EmailValidationServiceDown",
          "EmailConfirmTokenExpired",
          "EmailConfirmTokenInvalid",
          "EmailConfirmTokenAlreadyConfirmed",
          "PasswordError",
          "PasswordEmpty",
          "PasswordTooShort",
          "PasswordIllegalChar",
          "PasswordTooSimple",
          "Installment",
          "PendingInstallment",
          "DebtorLocked",
          "Economic",
          "DuplicateAccountingId",
          "DuplicateAccountingContactId",
          "Phone",
          "InvalidPhoneNumber",
          "DuplicatePhoneNumber",
          "InvalidOTP",
          "MaxAttemptsOTP",
          "CPR",
          "CprNameNotMatched",
          "CprNumberNotMatched",
          "CprBlocked",
          "CreditCheck",
          "CreditVerificationServiceDown",
          "CreditVerificationServiceUnknown",
          "RiskShopper",
          "CardSubscription",
          "UnsubscribePrimaryCard",
          "UnsubscribeCardInUse",
          "PaymentCardMatchesExistingCard",
          "PaymentCardMatchesSomeoneCard",
          "BankReport",
          "ConnectBankUnsuccessful",
          "ReportNotFound",
          "ExtraCreditDisqualified",
          "ExtraCreditNotAllowed",
          "ReportTimeout",
          "ReportProcessing",
          "AiiaError",
          "AiiaSyncFailed",
          "AiiaInputsError",
          "AiiaNoTransactions",
          "AiiaUseSomeoneAccount",
          "AiiaNoBankAccount",
          "NordigenError",
          "NordigenParamsMissing",
          "NordigenTimeout",
          "NordigenUnavailable",
          "NordigenAnalysisRequested",
          "NordigenUnsupportedPdf",
          "NordigenTooManyRequests",
          "NordigenExceededLimit",
          "NordigenUnsupportedFile",
          "NordigenUnsupportedCountry",
          "NordigenForbidden",
          "NordigenFeatureExtractFailure",
          "NordigenCreditScoringFailure",
          "NordigenNoRequestId",
          "NordigenNoTestReportId",
          "NordigenNoAnalysisRequested",
          "CanNotRefundInstallment",
          "CanNotUndoInstallment",
          "InstallmentRefundRequired",
          "InstallmentRefundPending",
          "Trustpilot",
          "TrustpilotApiError",
          "TrustpilotIdNotFound",
          "TrustpilotIdNotValid",
          "TrustpilotUrlNotMatch",
          "MerchantSubscription",
          "MerchantSubscriptionTestPackageNotAllow",
          "MerchantSubscriptionPackageDuplicated",
          "MerchantSubscriptionItemDuplicated",
          "MerchantSubscriptionWasUnsubscribed",
          "MerchantSubscriptionTierConflicts",
          "MerchantSubscriptionConsentRequired",
          "FunnelStep",
          "FunnelStepInaccessible",
          "FunnelStepAttemptLimitExceeded",
          "Marqeta",
          "MarqetaUnexpectedError",
          "MarqetaApiError",
          "MarqetaFeatureOff",
          "MarqetaUserNotAllowed",
          "MarqetaUnsupportedTransaction",
          "MarqetaPreApprovalIsUsed",
          "MarqetaInvalidAuthorizeAmount",
          "MarqetaInvalidMerchant",
          "MarqetaAmountTooManyDecimals",
          "MarqetaRecurringNotAllowed",
          "MarqetaInstallmentNotAllowed",
          "MarqetaInvalidRefundAmount",
          "MarqetaNoReferenceId",
          "MarqetaRefundNotLinked",
          "MarqetaAuthorizeAmountExceeds",
          "VirtualCard",
          "VirtualCardRenewNotAllowed",
          "VirtualCardTerminateNotAllowed",
          "VirtualCardInvalidTransition",
          "VirtualCardCannotRenew",
          "VirtualCardUnusable",
          "VirtualCardAcceptTermRequired",
          "VirtualCardCreditRequired",
          "VirtualCardCreateNotAllowed",
          "VirtualCardNoTransitionReason",
          "VirtualCardFoundProcessingPreApproval",
          "VirtualCardPreApprovalNotAvailable",
          "VirtualCardPreApprovalLocked",
          "VirtualCardPreApprovalExpired",
          "VirtualCardShopperRedFlag",
          "VirtualCardReportMessageRequired",
          "VirtualCardPreApprovalCannotBeCancelled",
          "VirtualCardPreApprovalNoFcmToken",
          "VirtualCardThreeDsStatusNotValid",
          "VirtualCardThreeDsResultFailed",
          "Nordiska",
          "NordiskaApiError",
          "NordiskaLoanAccountRejected",
          "SinchParameterValidation",
          "SinchMissingParameter",
          "SinchInvalidRequest",
          "SinchNumberMissingLeadingPlus",
          "SinchAuthorizationHeader",
          "SinchTimestampAuthorizationHeader",
          "SinchInvalidSignature",
          "SinchAuthorizationRequired",
          "SinchInvalidAuthorization",
          "SinchPaymentRequired",
          "SinchForbiddenRequest",
          "SinchRestrictedAction",
          "SinchResourceNotFound",
          "SinchRequestConflict",
          "SinchApplicationConfiguration",
          "SinchUnavailable",
          "SinchCapacityExceeded",
          "SinchVelocityConstraint",
          "SinchInternalError",
          "SinchTemporaryDown",
          "SinchConfigurationError"
        ]
      },
      "Anyday.Split.Core.CQS.Base.ICommandResult": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "readOnly": true
          },
          "successCode": {
            "$ref": "#/components/schemas/Anyday.Split.Core.CQS.Base.SuccessCode"
          },
          "errors": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Anyday.Split.Core.CQS.Base.CommandError"
            },
            "nullable": true,
            "readOnly": true
          },
          "statusCode": {
            "type": "integer",
            "format": "int32",
            "nullable": true,
            "readOnly": true
          }
        },
        "additionalProperties": false
      },
      "Anyday.Split.Core.CQS.Base.SuccessCode": {
        "enum": [
          0,
          1,
          2
        ],
        "type": "integer",
        "description": "\n\n0 = Success\n\n1 = AlreadyDone\n\n2 = NotNeeded",
        "format": "int32",
        "x-enumNames": [
          "Success",
          "AlreadyDone",
          "NotNeeded"
        ]
      },
      "Anyday.Split.ServiceContracts.WebshopAPI.PaymentErrorCode": {
        "enum": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17
        ],
        "type": "integer",
        "description": "\n\n0 = noError\n\n1 = typeMissMatch\n\n2 = unexpected\n\n3 = notAuthorized\n\n4 = notFound\n\n5 = notCaptured\n\n6 = alreadyCancelled\n\n7 = alreadyRefunded\n\n8 = alreadyCaptured\n\n9 = exceedsAuthorizedAmount\n\n10 = exceedsOrderAmount\n\n11 = refundWindowClosed\n\n12 = exceedsCaptureAmount\n\n13 = resourceLocked\n\n14 = authorizationExpired\n\n15 = firstCaptureBellowMin\n\n16 = unapturedRemainderTooSmall\n\n17 = virtualCardUnlinkedTransaction",
        "format": "int32",
        "x-enumNames": [
          "noError",
          "typeMissMatch",
          "unexpected",
          "notAuthorized",
          "notFound",
          "notCaptured",
          "alreadyCancelled",
          "alreadyRefunded",
          "alreadyCaptured",
          "exceedsAuthorizedAmount",
          "exceedsOrderAmount",
          "refundWindowClosed",
          "exceedsCaptureAmount",
          "resourceLocked",
          "authorizationExpired",
          "firstCaptureBellowMin",
          "unapturedRemainderTooSmall",
          "virtualCardUnlinkedTransaction"
        ]
      },
      "Anyday.Split.ServiceContracts.WebshopAPI.PaymentResponse": {
        "type": "object",
        "properties": {
          "errorMessage": {
            "type": "string",
            "nullable": true
          },
          "errorCode": {
            "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentErrorCode"
          }
        },
        "additionalProperties": false
      },
      "Microsoft.AspNetCore.Mvc.ProblemDetails": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "nullable": true
          },
          "title": {
            "type": "string",
            "nullable": true
          },
          "status": {
            "type": "integer",
            "format": "int32",
            "nullable": true
          },
          "detail": {
            "type": "string",
            "nullable": true
          },
          "instance": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": {}
      }
    },
    "securitySchemes": {
      "Bearer": {
        "type": "http",
        "description": "JWT Authorization header using the Bearer scheme.",
        "scheme": "bearer"
      }
    }
  },
  "security": [
    {
      "Bearer": []
    }
  ],
  "x-readme": {
    "explorer-enabled": true,
    "proxy-enabled": true
  }
}
```