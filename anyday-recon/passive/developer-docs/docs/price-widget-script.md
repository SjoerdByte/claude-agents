---
updatedAt: 2025-05-28T00:28:32.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Price Widget Script

The Price Widget works by adding a script to the page and an HTML element where you'd like to render the price widget.

## Script

```Text html
<script src="https://my.anyday.io/price-widget/anyday-price-widget.js" type="module" async></script>
```

The script must be added to the page where you would like to render the Price Widget. To achieve the best performance, we recommend that you add the script directly before the closing HTML `</body>` tag. If you would like to display the Price Widget on many pages such as on every product page, we recommend including the script directly before the closing HTML `</body>` tag in a template so that it only needs to be maintained in one location.

However, we advise that the script is not included in a global `<head>` element as the script would then load on all pages, including pages where the Price Widget may not be rendered.

## Webshop URL

The domain of the shop where you would like to render the Anyday Price Widget must be configured as a shop URL in the shop settings found in your Anyday Merchant account, otherwise, the Price Widget will not render and you will see an error in the browser console.

You can access your shop settings by visiting the following page after signing in to your Anyday Merchant account: <https://my.anyday.io/en/merchant/dashboard/webshop/webshop>

![](https://files.readme.io/da91b8e-image.png)