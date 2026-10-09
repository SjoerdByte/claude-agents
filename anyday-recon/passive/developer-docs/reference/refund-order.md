---
updatedAt: 2025-05-28T00:30:55.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Refund Order

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
    "/api/v1/orders/{purchaseOrderId}/refund": {
      "post": {
        "tags": [
          "Orders"
        ],
        "summary": "Refund Order",
        "parameters": [
          {
            "name": "purchaseOrderId",
            "in": "path",
            "description": "PurchaseOrderId returned from approval API",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentBody"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentResponse"
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentResponse"
                }
              }
            }
          }
        },
        "x-code-samples": [
          {
            "lang": "HTTP",
            "label": "HTTP Request",
            "source": "POST /api/v1/orders/{purchaseOrderId}/refund HTTP/1.1\nHost: my.anyday.io\nContent-Type: application/json\nContent-Length: 81\n{\n  \"amount\": 29.99,\n  \"idempotencyKey\": \"c22032e9-7597-4e1e-b242-53fcbd9076ec\"\n}"
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
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
      "Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentBody": {
        "required": [
          "Amount",
          "IdempotencyKey"
        ],
        "type": "object",
        "properties": {
          "amount": {
            "type": "number",
            "description": "Amount to refund, positive number",
            "format": "double"
          },
          "idempotencyKey": {
            "type": "string",
            "description": "Optional Idempotency Key, must be unique for every new request. Must be the same when a request is being automatically retried.",
            "format": "uuid"
          }
        },
        "additionalProperties": false,
        "example": {
          "amount": 29.99,
          "idempotencyKey": "c22032e9-7597-4e1e-b242-53fcbd9076ec"
        }
      },
      "Anyday.Split.ServiceContracts.WebshopAPI.RefundPaymentResponse": {
        "type": "object",
        "properties": {
          "errorMessage": {
            "type": "string",
            "nullable": true
          },
          "errorCode": {
            "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentErrorCode"
          },
          "transactionId": {
            "type": "string",
            "format": "uuid"
          }
        },
        "additionalProperties": false
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