---
updatedAt: 2025-05-28T00:30:48.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Get Shops

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
    "/api/v1/webshop/mine": {
      "get": {
        "tags": [
          "Webshop"
        ],
        "summary": "Query own Webshops to get price tag token and API keys.",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.WebshopsResponse"
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
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentResponse"
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
            "source": "GET /api/v1/webshop/mine HTTP/1.1\nHost: my.anyday.io\n"
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Anyday.Split.ServiceContracts.WebshopAPI.ExternalWebshopDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "name": {
            "type": "string",
            "nullable": true
          },
          "url": {
            "type": "string",
            "nullable": true
          },
          "apiKey": {
            "type": "string",
            "nullable": true
          },
          "testAPIKey": {
            "type": "string",
            "nullable": true
          },
          "priceTagToken": {
            "type": "string",
            "nullable": true
          },
          "privateKey": {
            "type": "string",
            "nullable": true
          },
          "readyToTransact": {
            "type": "boolean"
          }
        },
        "additionalProperties": false
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
      "Anyday.Split.ServiceContracts.WebshopAPI.WebshopsResponse": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.ExternalWebshopDto"
            },
            "nullable": true
          },
          "errors": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "nullable": true
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