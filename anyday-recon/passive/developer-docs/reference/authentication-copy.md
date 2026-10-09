---
updatedAt: 2025-05-28T00:30:46.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Authentication

Anyday requires an API key to be used for all requests to the Anyday API. You can access your API keys by visiting the following page after signing in to your Anyday Merchant account: <https://my.anyday.io/en/merchant/dashboard/webshop>

![](https://files.readme.io/22018c1-anyday-webshop-apikey.png "anyday-webshop-apikey.png")

Your API keys carry many privileges, so be sure to keep them secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.

## API Key vs. Test API Key

Every <Glossary>Merchant</Glossary> has an API Key and Test API Key. We encourage you to use the Test API Key to perform test payment requests prior to releasing your Anyday integration into production to ensure proper communication between your system and Anyday. You may use your Test API Key for all payment requests just as you would your API Key.

To view test transactions in your MyAnyday account, toggle the Test Data switch in the upper right-hand corner of the Transactions page. You will see a warning icon with the message, "You are in test mode" when the Test Data switch is toggled.

> ❗️ Test API Key Warning
>
> Before releasing Anyday in your production environment, remember to update your configuration to use your API Key and **not** your Test API Key. Requests made with your Test API Key are irreversible.

![](https://files.readme.io/3bba1a1-5be964d-anyday-test-mode.png "5be964d-anyday-test-mode.png")

## Retrieving API Keys programmatically

The Anyday API supports signing in to a Merchant's Anyday Account to retrieve the keys programmatically. This can be used to implement a user-friendly e-commerce module that allows the Merchant to simply enter their Anyday credentials, after which the module retrieves and stores the Merchant’s API keys without the need for the Merchant to manually copy and paste the keys.

To do so, you must first authenticate the Merchant's account by sending a POST request to: `<https://my.anyday.io/api/v1/authentication/login>`. Include the Username and Password for the Merchant's Anyday account in the request body.

```javascript
const response = await fetch('https://my.anyday.io/api/v1/authentication/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "Username": "test@example.com",
        "Password": "password"
    })
})
```

The response includes a Bearer access token:

```json
{
  "accessToken": "string"
}
```

Next, send a POST request to: `<https://my.anyday.io/api/v1/webshop/mine>`. Include an Authorization header with the Bearer access token to retrieve the configuration for the Merchant's Webshops:

```javascript
const response = await fetch('https://my.anyday.io/api/v1/webshop/mine', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer TOKEN'
    }
})
```

The response includes an array of Webshop object(s). Each Webshop object contains the Webshop ID, Name, URL, API Key, Test API Key, and Price Widget Token.

```json
{
  "data": [
    {
      "id": "f2890f32-6e17-4f26-bf14-3c144e8cd3f1",
      "name": "Anyday Test Merchant",
      "url": "https://anyday.io/",
      "apiKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGhpcyBpcyBhbiBleGFtcGxlIEFQSSBLZXkiLCJpYXQiOjE1MTYyMzkwMjJ9.37HtB6sDt8fiaZR-NLzb6qtlMtXTsxwBpcbjKXkuG1Y",
      "testAPIKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGhpcyBpcyBhbiBleGFtcGxlIFRlc3QgQVBJIEtleSIsImlhdCI6MTUxNjIzOTAyMn0.3AT83B7nbJNsJxIclXeadnAZuPpNvU3IMMPWBnUg0Ew",
      "priceTagToken": "57c8d3b0e6894565a9771a4d798fd25b"
    }
  ],
  "errors": []
}
```

## Authenticating your requests

Include an Authorization header with your API Key/Test API Key using the Bearer authentication scheme for all HTTP requests you make.

| Name          | Value           |
| :------------ | :-------------- |
| Authorization | Bearer \<token> |

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.