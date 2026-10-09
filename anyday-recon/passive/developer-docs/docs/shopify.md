---
updatedAt: 2025-07-14T11:18:33.000Z
agentTools:
  projectIndex: https://developer.anyday.io/llms.txt
---

# Shopify (New!)

## What's New?

We're excited to announce that Anyday has partnered directly with Shopify to offer our own native payment app! This partnership means we can now provide you with a payment solution that meets Shopify's highest standards for security and reliability.

**What does this mean for you?**

* **Faster updates and improvements** - We can now roll out new features and fixes directly, without waiting for third-party developers
* **Better support** - When you need help, you're talking directly to the Anyday team who built the app
* **Enhanced security** - Built to Shopify's strict security requirements with automatic, secure credential handling
* **Future-proof** - We can quickly adapt to new Shopify features and requirements as they're released

## Before You Start

Make sure you have:

* ✅ An active Anyday merchant account
* ✅ Completed AML document submission and approval
* ✅ Admin access to your Shopify store

## Installation Steps

### Step 1: Access the App

<Image align="center" src="https://files.readme.io/7b533444d46d2ad76eaa5ce324acfed13183cf05ca3d696f050eb8f44f1ee0c3-install-app.png" />

Visit our Shopify app installation page: [Install Anyday Payment App](https://accounts.shopify.com/store-login?no_redirect=true\&redirect=%2Fadmin%2Fsettings%2Fpayments%2Falternative-providers%2F105578497)

Click **Install** to proceed.

### Step 2: Review and Install

<Image align="center" alt="image.png" src="https://files.readme.io/1dfb884eccebdf14c8a66b53dc4d7ba7638d75830b0c821a32ad690d38d78fbf-install-app-permissions.png" />

You'll see a screen showing the app permissions:

* View personal data (Store owner)
* View and edit store data

Click **Install** to proceed.

### Step 3: Connect Your Anyday Account

<Image align="center" alt="image.png" src="https://files.readme.io/2e0de9b784c0b54b12050a43b487b75959fbbcb779e7824708be611bfa9b5f5c-authenticate-anyday-merchant-account.png" />

You'll be redirected to Anyday's secure login page. Enter your Anyday merchant account credentials (username and password) and click **Sign in**.

This step automatically and securely retrieves your API credentials - no need to copy and paste sensitive information!

### Step 4: Return to Shopify

![](https://files.readme.io/13e2bae5b9d731c35be2895114a2906080813eab0cb133213238a14302fd0199-return-to-shopify.png)

Once your account is confirmed, click **Continue to Shopify** to return to your store admin.

### Step 5: Activate the Payment Method

<Image align="center" alt="image.png" src="https://files.readme.io/8c4110ab88ff46079c9340a8014ba5e78a161231edf808314bf44b39420c51be-activate-app.png" />

Back in your Shopify admin, you'll see the Anyday app is now installed. Click **Activate** to enable Anyday as a payment option for your customers.

That's it! Anyday is now live on your store.

## Optional: Test Mode

![](https://files.readme.io/6829dc2fe6bc68b67e5316040a02e87ebe9cc9dfeaa47990484cb230e79b41b6-image.png)

**We strongly recommend testing before going live**, especially if you're switching from our previous integration.

**Note:** Testing should be completed by someone with technical experience. If you'd prefer assistance with testing, contact us at **<onboarding@anyday.dk>** after installing and authenticating the app - we're happy to perform the testing for you!

If you require a collaborator code, please include this code in the email so we may request access to your store with neecessary permissions. To learn how to find your collaborator code, please visit: <Anchor label="Shopify Collaborator Request Code" target="_blank" href="https://developer.anyday.io/docs/collaborator-request-code-new">Shopify Collaborator Request Code</Anchor>

1. **Enable Test Mode** - In your Anyday app settings, toggle on "Test mode" and select “Save”.
2. **Run a Test Transaction**:
   * Place a test order on your store
   * Select Anyday at checkout
   * On Anyday's checkout page, you'll see two buttons: "Approve" or "Cancel"
   * Click "Approve Payment" to simulate a successful authorization
   * Test capture, cancel, or refund operations from your Shopify admin

![](https://files.readme.io/69a94c40e6facdf10ef9b1cb9ae250708b24de1998e77124780901b58666cf51-image.png)

**Important:** Only test during off-peak hours or on a development store to avoid confusing real customers.

**Return to Live Mode** - Once testing is complete, make sure to:

* Disable test mode in your Anyday app settings
* Re-save the settings to enable live transactions

## Need Help?

If you run into any issues during installation, please contact our team at **<onboarding@anyday.dk>**.

When reaching out, please include:

* Detailed description of the issue
* Screenshots of any error messages
* Your Shopify store URL
* The step where you encountered the problem

We're here to help make your transition as smooth as possible!