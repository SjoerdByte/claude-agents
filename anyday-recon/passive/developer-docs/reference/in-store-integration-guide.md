---
updatedAt: 2025-10-16T07:05:48.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# In-Store Integration Guide

This guide walks you through implementing Anyday's payment solution for physical stores using QR codes. For online e-commerce implementations, please see the [Online Integration Guide](https://developer.anyday.io/reference/online-integration-guide).

## Implementation Overview

For in-store integrations, customers complete their purchase by:

1. Store clerk creates an order in your POS system
2. Customer scans a QR code linked to the order
3. Customer completes payment on their device
4. POS system receives confirmation via callback

## QR Code Setup

Before implementing the API integration, you'll need to set up QR codes in your Anyday merchant account:

### Option 1: Generate Your Own QR Code

1. Log into your Anyday merchant account and navigate to the QR Codes section
2. Create a new Payment QR code and obtain the QR code URL
3. Use this URL to generate your own QR code using your preferred QR code generator
4. Note the `internalQrCodeId` associated with this QR code for use in your API integration

### Option 2: Use Anyday's Pre-generated QR Code

1. Log into your Anyday merchant account and navigate to the QR Codes section
2. Create a new Payment QR code and download the pre-generated QR code image
3. Print and display this physical QR code in your store
4. Note the `internalQrCodeId` associated with this QR code for use in your API integration

### Option 3: Use an external QR Code outside of Anyday

1. Provide an identifier as the value for the `externalQrCodeId` when creating the order via Anyday's Order API

## Step 1 - Create an In-Store Order

Create an Anyday in-store order by sending a POST request to the `/v1/orders` endpoint with the QR-specific parameters.

### Required Parameters

| Name     | Type    | Example    | Description                                                   |
| -------- | ------- | ---------- | ------------------------------------------------------------- |
| amount   | Decimal | 1000.00    | The total amount of the order.                                |
| currency | String  | "DKK"      | The currency of the order amount. (Only supports DKK for now) |
| orderID  | String  | "OD314569" | The order id from your shop system.                           |

### QR-Specific Parameters

**Note**: You should include either `internalQrCodeId` OR `externalQrCodeId` depending on your implementation.

| Name             | Type   | Example                                | Description                                                                            |
| ---------------- | ------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| internalQrCodeId | UUID   | "5fcd32d2-2767-4445-9ecc-88e17f0a82d8" | The GUID of the Anyday QR code generated from the backoffice, for direct integrations. |
| externalQrCodeId | String | "STORE123-QR456"                       | The ID of the QR scanned to create this order, for external QR integrations.           |
| externalUserId   | String | "CLERK789"                             | The user who created the order, intended for in-store purchases.                       |

### Optional Parameters

| Name   | Type   | Example      | Description                                                                                    |
| ------ | ------ | ------------ | ---------------------------------------------------------------------------------------------- |
| source | String | "TheBestPOS" | The source of the order. This could be a category or an exact source, depending on your needs. |

### Example Request

```javascript
const response = await fetch('https://my.anyday.io/v1/orders', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "amount": 1000.00,
      "currency": "DKK",
      "orderId": "OD314569",
      "internalQrCodeId": "5fcd32d2-2767-4445-9ecc-88e17f0a82d8",
      "externalUserId": "CLERK789",
      "source": "TheBestPOS"
    })
})
```

### Example Response

```json
{
  "checkoutUrl": "https://my.anyday/api/v1/internal/checkout/begin?checkoutId=789321",
  "purchaseOrderId": "3437a6a5-5303-4f1d-a831-ab50e0ebd59a",
  "errorMessage": null,
  "errorCode": 0
}
```

## Step 2 - Customer Payment Process

After creating the order through the API, the customer completes payment by scanning the QR code:

### If Using Self-Generated QR Codes (Option 1)

1. The customer scans the QR code displayed at your POS terminal
2. The customer is directed to Anyday's payment page with the order details
3. The customer completes the payment on their device

### If Using Anyday's Pre-generated QR Codes (Option 2)

1. The customer scans the physical QR code displayed in your store
2. The customer is directed to Anyday's payment page with the order details
3. The customer completes the payment on their device

### Technical Implementation Note

When implementing in-store QR payments:

1. Each QR code in your Anyday merchant account has a unique `internalQrCodeId`
2. When creating an order via the API, include this `internalQrCodeId` to link the order to the specific QR code
3. When a customer scans the QR code (whether generated by you or downloaded from Anyday), the system uses this ID to associate their payment with your API-created order
4. For external QR code systems, use the `externalQrCodeId` parameter instead

Upon successful authorization & capture, Anyday will deliver a callback to the provided `callbackUrl` with the order details.

### Example Callback (Authorization)

```json
{
  "id": "3437a6a5-5303-4f1d-a831-ab50e0ebd59a",
  "createdDate": "2022-02-18T17:15:00+00:00",
  "expiredDate": "2022-03-04T17:15:00+00:00",
  "merchantId": "3974829a-7711-489f-9052-35cc9f33de11",
  "merchantName": "My Store",
  "webshopId": "5fcd32d2-2767-4445-9ecc-88e17f0a82d8",
  "webshopName": "mystore.com",
  "orderId": "OD314569",
  "orderTotal": 1000.00,
  "currency": "DKK",
  "authorized": true,
  "cancelled": false,
  "totalCaptured": 0,
  "totalRefunded": 0,
  "transaction": {
      "id": "ca4a0223-9cb1-4330-838b-5fc3eb7d7bab",
      "createdDate": "2022-02-18T17:15:00+00:00",
      "amount": 1000.00,
      "type": "authorize",
      "status": "success"
  },
  "transactions": [
    {
      "id": "ca4a0223-9cb1-4330-838b-5fc3eb7d7bab",
      "createdDate": "2022-02-18T17:15:00+00:00",
      "amount": 1000.00,
      "type": "authorize",
      "status": "success"
    }
  ]
}
```

### Implementation Note for In-Store Systems

For POS and in-store systems, we strongly recommend implementing idempotency on all refund requests to protect against spotty network connections common in retail environments. Your implementation should:

1. Generate a unique UUID for each new refund operation
2. Store this UUID with the order details in your system
3. Include this UUID as the `idempotencyKey` parameter in your request
4. If you need to retry the request, use the same stored UUID

## Implementation Best Practices

* Train store clerks on the QR payment process
* Ensure your in-store WiFi can support customer devices accessing the payment page
* Always use idempotency keys for refund operations to prevent duplicate transactions
* Generate and store idempotency keys in your system before making the request
* Implement a retry mechanism that reuses the same idempotency key when retrying failed requests