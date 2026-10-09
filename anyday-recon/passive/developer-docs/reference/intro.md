---
updatedAt: 2025-05-28T00:30:50.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Anyday Order API

The Anyday Order API allows you to create, retrieve, cancel, capture, and refund an Anyday order.

## Integration Types

The Anyday Order API supports two primary integration types:

1. **Online/E-commerce Integration**: For web-based checkout flows where customers complete purchases on your website.
2. **In-store/QR Integration**: For physical store purchases where customers scan QR codes to complete purchases.

## Order Lifecycle

1. **Creation**: An order is created using the `/v1/orders` endpoint.
2. **Authorization**: The customer completes the checkout process, authorizing the payment.
3. **Capture**: The merchant captures the authorized amount using the `/v1/orders/{id}/capture` endpoint. Capture can be in full or a partial amount of the authorized amount.
4. **Refund (if necessary)**: The merchant can refund a captured amount using the `/v1/orders/{id}/refund` endpoint. Refunds can be in full or a partial amount of the captured amount.
5. **Cancel**: The merchant cancels the authorized amount using the `/v1/orders/{id}/cancel` endpoint.

**Important Note on Order Expiration**

Online orders have a maximum lifetime of 28 days from the initial authorization date (this period may be configured per merchant). After this period, orders are considered expired. Attempting to capture an expired order will result in a special handling process (see the [Capture section of the Online Integration Guide](https://developer.anyday.io/reference/online-integration-guide#step-3---capture-the-order) for details).

## Callback Service

Anyday provides a callback service for online orders that will notify your system when an order is Authorized, Cancelled, Captured, or Refunded. In-store orders will trigger callbacks if an `externalQrCodeId` is provided. However, In-store orders created with an `internalQrCodeId` will **not** trigger callbacks as Anyday generated QR codes are handled synchronously through the Anyday client.

While the `callbackUrl` is an optional parameter, it is highly advised that you provide a `callbackUrl` when creating an order and utilize callbacks received on all order transactions for updating the order's state in your external system.

The callback service is asynchronous and as such will not interfere with or prolong the processing time of the API request generating a callback. e.g. The time your customer will have to wait for payment confirmation.

All callbacks for transactions on an order will be delivered to the callback URL provided on the initial creation of that order.

Your provided callback URL must quickly return a successful status code (2xx) prior to any complex logic that could cause a timeout. In the event that your system is not able to receive or correctly process the callback on the initial attempt, the callback service will try to deliver its message up to 9 additional times (total 10 attempts), with gradually increasing delays between each attempt over the course of 12 hours.

## Callback Signatures

Verify the callbacks that Anyday sends to your provided callbackUrl.

Anyday signs all callbacks we send to your provided callbackUrl by including a signature in each callback’s x-anyday-signature request header. Anyday generates signatures using a hash-based message authentication code (HMAC) with SHA-256. This allows you to verify that the callbacks were sent by Anyday, not by a third party.

Before you can verify signatures, you need to retrieve a Private Key. A Merchant's Private Key can be retrieved from the /webshops/mine endpoint or it can be manually retrieved from a Merchant's Anyday account by navigating to the Webshop page and selecting the API KEY tab.

### Steps to verify a callback signature

**Step 1: Get the encrypted signature**\
To verify the x-anyday-signature, you must first read the x-anyday-signature header and get the encrypted signature.

**Step 2: Prepare the payload string**\
Next, prepare the payload by converting the callback's raw JSON request body into a string.

**Step 3: Determine the expected signature**\
Then, compute an HMAC with the SHA256 hash function. Use the Merchant's Private Key as the key, and use the prepared payload string as the message.

**Step 4: Compare the signatures**\
Compare the computed signature to the expected x-anyday-signature.

**Step 5: Respond**\
Respond with the appropriate status code.

### Example callback verification

```javascript
import hmacSHA256 from 'crypto-js/hmac-sha256'

export default (req, res) => {  
  const privateKey = process.env.PRIVATE_KEY;  
  const signature = req.headers['x-anyday-signature']  
  // Ensure you convert the raw JSON body into a string  
  const bodyString = req.rawBody.toString()  
  const hash = hmacSHA256(bodyString, privateKey)  
  const encode = hash.toString()  
  if (req.method === 'POST' && signature  === encode) {  
        // your-code  
        console.log("success")  
    res.status(200).json({  
      success: true,  
    })  
  } else {  
      console.log("error")  
    res.status(401).json({  
      error: 'Unauthorized',  
    })  
  }  
}
```

## Order Object Structure

```json
{  
  "id": guid,  
  "createdDate": datetime,  
  "expiredDate": datetime,  
  "merchantId": guid,  
  "merchantName": string,  
  "webshopId": guid,  
  "webshopName": string,  
  "orderId": string,  
  "orderTotal": decimal,  
  "currency": string,  
  "authorized": boolean,  
  "cancelled": boolean,  
  "totalCaptured": decimal,  
  "totalRefunded": decimal,  
  "transaction": {  
      "id": guid,  
      "createdDate": datetime,  
      "amount": decimal,  
      "type": string,  
      "status": string  
  },  
  "transactions": [  
    {  
      "id": guid,  
      "createdDate": datetime,  
      "amount": decimal,  
      "type": string,  
      "status": string  
    }  
  ]  
}
```

<br />

All callbacks for every order transaction will respond with this order object structure. You can refer to the transaction object for the most recent transaction that triggered the callback, or the transactions array for all transactions on the order.

However, when sending a GET request on an order, the transaction object will be null since there isn't a specific transaction to be returned.

## Request Headers

The request headers for order endpoints contain important information necessary to execute a successful request or validate a successful request.

| Parameter          | Description                                                                                                                                               |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization      | JWT Authorization header using the Bearer scheme. e.g. Merchant API Key                                                                                   |
| Content-Type       | The original media type of the resource used for POST/PUT/PATCH requests, e.g. application/json                                                           |
| Accept             | Indicates which content types, expressed as MIME types, the client is able to understand used for GET requests. e.g. application/json                     |
| x-anyday-signature | A checksum of the entire raw callback request body using a hash-based message authentication code (HMAC) with SHA-256 as the cryptographic hash function. |

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

## Idempotency

Anyday's API supports idempotent requests for `capture` and `refund` operations to prevent duplicate transactions. Idempotency ensures that an API request will not be processed multiple times even if it is sent multiple times.

### How Idempotency Works

When making a request to the `capture` or `refund` endpoints, you can include an optional `idempotencyKey` parameter:

* Each `idempotencyKey` must be a UUID format string
* You should use a unique `idempotencyKey` for each new unique request
* If you need to retry the same request (due to a network error, timeout, etc.), use the same `idempotencyKey` as the original request

When Anyday receives a request with an `idempotencyKey` that matches a previous request:

* If the original request succeeded, the API will return the same response as the original request without executing the operation again
* If the original request failed or is still processing, the new request will be processed normally

### When to Use Idempotency Keys

Idempotency keys are particularly important for:

* Preventing duplicate captures or refunds during network issues
* Safely retrying failed requests without risk of double-processing
* Implementing automatic retry logic in your integration