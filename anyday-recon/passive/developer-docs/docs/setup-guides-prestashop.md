---
updatedAt: 2025-05-28T00:29:23.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Setup Guides

Our setup guides offer detailed, step-by-step instructions for integrating Anyday into your PrestaShop store, covering everything from installation to configuration.

## Installation and Configuration when using Quickpay:

This guide requires that you are using a Quickpay for handling the payments. If you do not have a QuickPay account, please contact <onboarding@anyday.io> and we will be happy to create a QuickPay account for you at no cost.

### If you don't have you own Quickpay

1. **Download and Install the Quickpay Module:**

   * Access the Quickpay module for PrestaShop and download it to your computer. [Go to Quickpay integration page for Prestashop](https://learn.quickpay.net/helpdesk/en/articles/integrations/prestashop/) in order to download the newest version.
   * Log in to your PrestaShop admin panel, navigate to Modules > Modules catalog or Modules > Modules manager and click **“Upload a module”** and upload the Quickpay module.

     <Image align="center" className="border" border={true} src="https://files.readme.io/4e45e60-prestashop-1.png" />

     <Image align="center" className="border" border={true} src="https://files.readme.io/64f965d-prestashop-2.png" />
2. **Configure Quickpay Settings:**

   * After installation, find the module in your list of modules and click "Configure."
   * In Quickpay Manager go to Settings > Integration find **“Private Key”** and **“API key”**. Insert **“Private Key”** under Quickpay private key and **“API key”** under Quickpay user key.

     <Image align="center" className="border" border={true} src="https://files.readme.io/142244b-prestashop-3.png" />
   * Change the settings to fit your shop’s needs in **Settings**, select which payment methods you will accept and specify the order in which their logos will be shown in the payment window by dragging them in the **Card list.**
   * Save settings by clicking **“Save”** in the bottom right corner of the Settings section and you’re ready to accept payments
3. **Test and Launch:**
   * Conduct test transactions to ensure the Anyday payment option is working correctly.
   * Once testing is successful, activate Anyday payments to allow your customers to start using the service.

***

### If you have your own Quickpay

1. Make sure your Quickpay Module is updated to the newest version.
2. Go to your Quickpay Module **Settings**
3. Select Anyday on the list on the **Card list.**