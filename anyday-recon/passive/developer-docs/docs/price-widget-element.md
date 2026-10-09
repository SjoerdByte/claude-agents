---
updatedAt: 2025-05-28T00:28:40.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Price Widget Element

Now that you have added the Price Widget Script to your website, it's time to implement the Price Widget Element.

The Price Widget Element is an HTML element `<anyday-price-widget></anyday-price-widget>` that is configured using the following HTML attributes:

### Attributes

<Table align={["left","left","left","left","left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Name
      </th>

      <th style={{ textAlign: "left" }}>
        Type
      </th>

      <th style={{ textAlign: "left" }}>
        Required
      </th>

      <th style={{ textAlign: "left" }}>
        Possible Values
      </th>

      <th style={{ textAlign: "left" }}>
        Example Value
      </th>

      <th style={{ textAlign: "left" }}>
        Notes
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        theme
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        True
      </td>

      <td style={{ textAlign: "left" }}>
        light, outline, medium, dark
      </td>

      <td style={{ textAlign: "left" }}>
        light
      </td>

      <td style={{ textAlign: "left" }}>
        You can view the available themes below.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        currency
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        True
      </td>

      <td style={{ textAlign: "left" }}>
        DKK
      </td>

      <td style={{ textAlign: "left" }}>
        DKK
      </td>

      <td style={{ textAlign: "left" }}>
        This value must be a valid ISO 4217 Code. Currently, only DKK is supported.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        price
      </td>

      <td style={{ textAlign: "left" }}>
        decimal
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        A valid decimal
      </td>

      <td style={{ textAlign: "left" }}>
        1000.00
      </td>

      <td style={{ textAlign: "left" }}>
        Cannot be used with price-selector. Only one price attribute can be used in a Price Widget element at a time.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        price-selector
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        A valid CSS selector such as a CSS class or id
      </td>

      <td style={{ textAlign: "left" }}>
        .product-price
      </td>

      <td style={{ textAlign: "left" }}>
        Cannot be used along with price. Only one price attribute can be used in a Price Widget element at a time.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        price-format-locale
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        da-DK, en-UK
      </td>

      <td style={{ textAlign: "left" }}>
        da-DK
      </td>

      <td style={{ textAlign: "left" }}>
        This value must be a valid ISO 639-1 Code. Currently, only en and da are supported. A price or price-selector value must be provided as a requirement for the currency-format-locale.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        locale
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        True
      </td>

      <td style={{ textAlign: "left" }}>
        da-DK, en-UK
      </td>

      <td style={{ textAlign: "left" }}>
        da-DK
      </td>

      <td style={{ textAlign: "left" }}>
        This value must be a valid ISO 639-1 Code Language Desginator combined with an ISO 3166-1 Code Region Designator. Currently, only da-DK and en-UK are supported.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        token
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        True
      </td>

      <td style={{ textAlign: "left" }}>
        A valid price widget token
      </td>

      <td style={{ textAlign: "left" }}>
        57c8d3b0e6894565a9771a4d798fd25b
      </td>

      <td style={{ textAlign: "left" }}>
        This value can be retrieved from a Merchant's Anyday account or programmatically via the Anyday API.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        fully-clickable
      </td>

      <td style={{ textAlign: "left" }}>
        boolean
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        true, false
      </td>

      <td style={{ textAlign: "left" }}>
        true
      </td>

      <td style={{ textAlign: "left" }}>
        `true` allows users to click anywhere on the price widget to open the price widget modal.\
        `false` requires users to click on the Anyday logo or the "See more" link to open the price widget modal.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        container-breakpoint
      </td>

      <td style={{ textAlign: "left" }}>
        integer
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        350
      </td>

      <td style={{ textAlign: "left" }}>
        350
      </td>

      <td style={{ textAlign: "left" }}>
        Use to set the px value for the breakpoint that renders the Anyday logo on a new line.
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        debug
      </td>

      <td style={{ textAlign: "left" }}>
        string
      </td>

      <td style={{ textAlign: "left" }}>
        False
      </td>

      <td style={{ textAlign: "left" }}>
        info, warning, verbose, error
      </td>

      <td style={{ textAlign: "left" }}>

      </td>

      <td style={{ textAlign: "left" }}>
        Use for debugging purposes in the browser console.
      </td>
    </tr>
  </tbody>
</Table>

### Price Widget Example - Static Price

```html
<anyday-price-widget                   
    theme="light"                                 
    currency="DKK"
    price="1000"
    price-format-locale="en-UK"
    locale="da-DK"
    token="69b39b2169414d7d904e99a81cc4cbf2"
    fully-clickable="true"
    container-breakpoint="350"                 
    debug="info" >
</anyday-price-widget>
```

### Price Widget Example - Dynamic Price

```html
<anyday-price-widget                  
    theme="light"                                  
    currency="DKK"
    price-selector=".product-price"
    price-format-locale="en-UK"
    locale="da-DK"
    token="69b39b2169414d7d904e99a81cc4cbf2"
    fully-clickable="true"
    container-breakpoint="350"                 
    debug="info" >
</anyday-price-widget>
```

## Theme

`light` renders a price widget with a transparent background.

![](https://files.readme.io/2e68739-image.png)

`outline` renders a price widget with a light-grey outline.

![](https://files.readme.io/cfb1cfa-image.png)

`medium` renders a price widget with a light-grey background color.

![](https://files.readme.io/576cd31-image.png)

`dark` renders a price widget with a dark/black background color.

![](https://files.readme.io/5714471-image.png)

## Token

The Price Widget element requires a unique token that can be retrieved from a Merchant's Anyday account by visiting the following page: <https://my.anyday.io/en/merchant/dashboard/webshop/apikey>

To quickly copy your token, click the copy icon and it will be saved to your clipboard.

![](https://files.readme.io/044b7e1-image.png)

Additionally, you can retrieve a Merchant's Price Widget token programmatically by referencing the instructions here: [Retrieving API Keys Programmatically](https://anyday.readme.io/docs/authentication#retrieving-api-keys-programmatically)

Use this token as the value for the `token` attribute.

## Fixed or Dynamic Price

The Price Widget supports both fixed prices as well as dynamic prices. These are handled by the `total-price` and `total-price-selector` attributes. A Price Widget element may only include one price attribute at a time, otherwise, it will throw an error.

The `total-price` attribute should be used if you have a fixed price that is not affected nor changed by product variants, shipping options, etc.

Therefore, the value should be a decimal such as: `10.00`

The `total-price-selector` attribute should be used if you have a dynamic price that can change due to product variants, shipping options, etc.

The value should be a CSS selector that targets the specific HTML element that contains the price.

```html
<span class=".variant-price">500.00 kr.</span>
```

The Price Widget will do its best to locate the nearest element matching the given selector. In the example above, the Price Widget would find the `.variant-price` span and extract the price from the element. If the element contains a currency, it is ignored.

Additionally, when using the `total-price-selector` attribute, the Price Widget monitors the element and automatically recalculates whenever the price changes within the element. This means that if the price changes dynamically, such as when changing product variants, the Price Widget will recalculate and update to reflect the price defined by the selected variant.