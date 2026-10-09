---
updatedAt: 2025-05-28T00:30:54.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Create Order

Update purchase order detail if order id exist or create new if the order id does not already exist

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
      "post": {
        "tags": [
          "Orders"
        ],
        "summary": "Create Order",
        "description": "Update purchase order detail if order id exist or create new if the order id does not already exist",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.OrderAPI.AuthorizeOrderBody"
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
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.AuthorizeOrderResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.AuthorizeOrderResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.AuthorizeOrderResponse"
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.AuthorizeOrderResponse"
                }
              }
            }
          },
          "500": {
            "description": "Server Error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "default": {
            "description": "Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Microsoft.AspNetCore.Mvc.ProblemDetails"
                }
              }
            }
          }
        },
        "x-code-samples": [
          {
            "lang": "HTTP",
            "label": "HTTP Request",
            "source": "POST /api/v1/orders HTTP/1.1\nHost: my.anyday.io\nContent-Type: application/json\nContent-Length: 324\n{\n  \"amount\": 1000,\n  \"currency\": \"DKK\",\n  \"orderId\": \"OD314569\",\n  \"callbackUrl\": \"https://www.mywebshop.com/callback-handler\",\n  \"successRedirectUrl\": \"https://www.mywebshop.com/order/OD314569/success\",\n  \"cancelRedirectUrl\": \"https://www.mywebshop.com/order/OD314569/cancel\",\n  \"refererUrl\": \"https://www.mywebshop.com\"\n}"
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Anyday.Split.ServiceContracts.OrderAPI.AuthorizeOrderBody": {
        "required": [
          "Amount",
          "CancelRedirectUrl",
          "Currency",
          "OrderId",
          "SuccessRedirectUrl"
        ],
        "type": "object",
        "properties": {
          "callbackUrl": {
            "type": "string",
            "description": "Url to callback when the authorization is success"
          },
          "amount": {
            "type": "number",
            "description": "Order amount",
            "format": "double"
          },
          "currency": {
            "type": "string",
            "description": "Currency, only supports DKK for now"
          },
          "orderId": {
            "type": "string",
            "description": "Webshop Order ID, shown to Merchant in UI to identify an order"
          },
          "successRedirectUrl": {
            "type": "string",
            "description": "URL Customer is sent to when payment is authorized"
          },
          "cancelRedirectUrl": {
            "type": "string",
            "description": "URL Customer is sent to when payment is cancelled"
          },
          "returnUrl": {
            "type": "string",
            "description": "URL Customer is sent to when want to return to webshop without changes"
          },
          "refererUrl": {
            "type": "string",
            "description": "refererURL URL from Customer"
          },
          "webshopId": {
            "type": "string",
            "description": "Choose the webshop from ID (Will ignore referrer)",
            "format": "uuid"
          },
          "internalQrCodeId": {
            "type": "string",
            "description": "The GUID of the Anyday QR code generated from the backoffice, for direct integrations.",
            "format": "uuid"
          },
          "externalQrCodeId": {
            "type": "string",
            "description": "The ID of the QR scanned to create this order, for extenal QR interations."
          },
          "externalUserId": {
            "type": "string",
            "description": "The user who created the order, intended for in-store purchases."
          },
          "source": {
            "type": "string",
            "description": "The source of the order. This could be a category or an exact source, depending on your needs."
          }
        },
        "additionalProperties": false,
        "example": {
          "amount": 1000,
          "currency": "DKK",
          "orderId": "OD314569",
          "callbackUrl": "https://www.mywebshop.com/callback-handler",
          "successRedirectUrl": "https://www.mywebshop.com/order/OD314569/success",
          "cancelRedirectUrl": "https://www.mywebshop.com/order/OD314569/cancel",
          "refererUrl": "https://www.mywebshop.com"
        }
      },
      "Anyday.Split.ServiceContracts.WebshopAPI.AuthorizeOrderResponse": {
        "type": "object",
        "properties": {
          "errorMessage": {
            "type": "string",
            "nullable": true
          },
          "errorCode": {
            "$ref": "#/components/schemas/Anyday.Split.ServiceContracts.WebshopAPI.PaymentErrorCode"
          },
          "checkoutUrl": {
            "type": "string",
            "description": "URL Customer should be sent to in order to authorize order",
            "nullable": true
          },
          "purchaseOrderId": {
            "type": "string",
            "description": "Order ID, used to call capture, cancel or refund APIs",
            "format": "uuid"
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