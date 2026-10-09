---
updatedAt: 2025-05-28T00:29:27.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Setup Guides

For Magento 1 stores without the Quickpay module installed, this guide walks you through the installation and configuration process, setting the stage for activating Anyday.

### Quickpay Module Installation and Configuration:

1. **Download and Upload the Module:**
   * Download the Quickpay Magento 1 Module.
   * Unzip the file and upload it to the root of your Magento folder via FTP.
2. **Activate Quickpay in Magento:**
   * Navigate to **System > Configuration** in the Magento admin panel.
   * In the left menu, go to **Sales > Payment Methods** and select **Quickpay Payment**.
   * Enable the module by selecting “Yes” under **Enabled**.
3. **Configure Quickpay Settings:**
   * In Quickpay Manager, go to **Settings > Integration** to find your “Agreement ID”, “Private key”, and “API key”.
   * Enter these details in the Magento admin under Quickpay settings.
4. **Set Order Status:**
   * For **New order status (After the payment is made)**, choose “Processing”.
   * For **New order status (Before the payment is made)**, choose “Pending”.
5. **Save Configuration:**
   * Click on “Save config” to apply your settings.

***

### Activating Anyday:

If you already have the Quickpay module installed, activate Anyday directly in your Quickpay Manager. For detailed instructions, visit [Anyday Quickpay Setup](https://developer.anyday.io/docs/quickpay).

For other gateway instructions, visit [Gateway Activation](https://developer.anyday.io/docs/general-gateway-activation)

This guide ensures that Magento 1 users can successfully install and configure the Quickpay module as a precursor to offering Anyday's split payment solutions, providing a comprehensive pathway to enhance the checkout experience for customers.