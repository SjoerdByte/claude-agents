<?php
namespace Anyday\Payment\Gateway\Command;

use Anyday\Payment\Api\Data\Payment\UrlDataInterface;
use Anyday\Payment\Gateway\Exception\NoData;
use Anyday\Payment\Gateway\Http\Client\Curl;
use Anyday\Payment\Service\Settings\Config;
use Magento\Framework\Exception\AlreadyExistsException;
use Magento\Framework\Exception\InputException;
use Magento\Framework\Exception\NoSuchEntityException;
use Anyday\Payment\Lib\Serialize\Serializer\JsonHexTag;
use Magento\Payment\Gateway\CommandInterface;
use Magento\Payment\Gateway\Validator\ResultInterface;
use Magento\Payment\Gateway\Validator\ResultInterfaceFactory;
use Magento\Sales\Model\Order\Payment;
use Magento\Store\Model\StoreManagerInterface;
use Anyday\Payment\Service\Anyday\Order;
use Magento\Framework\UrlInterface;
use Anyday\Payment\Controller\Payment\Webhook;
use Magento\Store\Model\ScopeInterface;

class InitializeStrategyCommand implements CommandInterface
{
    const NAME_URL          = 'url';
    const NAME_TRANSACTION  = 'transactionId';
    const NAME_QUOTE        = 'quoteId';
    const NAME_AMOUNT       = 'amount';

    /**
     * @var ResultInterfaceFactory
     */
    private $resultInterfaceFactory;

    /**
     * @var Config
     */
    private $config;

    /**
     * @var JsonHexTag
     */
    private $json;

    /**
     * @var Curl
     */
    private $curlAnyday;

    /**
     * @var \Anyday\Payment\Service\Anyday\Order
     */
    private $serviceAnydayOrder;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var UrlInterface
     */
    private $urlInterface;

    /**
     * InitializeStrategyCommand constructor.
     *
     * @param ResultInterfaceFactory $resultInterfaceFactory
     * @param Config $config
     * @param JsonHexTag $json
     * @param Curl $curlAnyday
     * @param Order $serviceAnydayOrder
     * @param UrlInterface $urlInterface
     */
    public function __construct(
        ResultInterfaceFactory $resultInterfaceFactory,
        Config $config,
        JsonHexTag $json,
        Curl $curlAnyday,
        Order $serviceAnydayOrder,
        StoreManagerInterface $storeManager,
        UrlInterface $urlInterface
    ) {
        $this->config                   = $config;
        $this->json                     = $json;
        $this->curlAnyday               = $curlAnyday;
        $this->resultInterfaceFactory   = $resultInterfaceFactory;
        $this->serviceAnydayOrder       = $serviceAnydayOrder;
        $this->storeManager             = $storeManager;
        $this->urlInterface             = $urlInterface;
    }

    /**
     * Initialize order
     *
     * @param array $commandSubject
     * @return ResultInterface
     * @throws AlreadyExistsException
     * @throws InputException
     * @throws NoSuchEntityException
     */
    public function execute(array $commandSubject)
    {
        /**
         * @var $order Order
         */
        $order = $commandSubject['payment']->getPayment()->getOrder();
        if ($order) {
            /** @var Payment $payment */
            $payment = $commandSubject['payment']->getPayment();
            if ($this->isNotVerifed($payment)) {
                try {
                    $sendParam = [
                        'amount' => $order->getGrandTotal(),
                        'currency' => $order->getBaseCurrencyCode(),
                        'orderId' => (string)$order->getIncrementId(),
                        'successRedirectUrl' => $this->config->getSuccesRedirect($order->getQuoteId()),
                        'cancelRedirectUrl' => $this->config->getCancelRedirect(
                            $order->getQuoteId()
                        ),
                        'callbackUrl' => $this->urlInterface->getUrl(
                            Webhook::URI
                        )
                    ];
                    $this->curlAnyday->setBody($this->json->serialize($sendParam));
                    $this->curlAnyday->setUrl(UrlDataInterface::URL_ANYDAY . UrlDataInterface::URL_AUTORIZE);
                    $this->curlAnyday->setAuthorization(
                        $this->config->getPaymentAutorizeKey(
                            ScopeInterface::SCOPE_STORE,
                            $order->getStoreId()
                        )
                    );
                    $result = $this->curlAnyday->request();

                    if ($result['errorCode'] == 0 && isset($result['purchaseOrderId'])) {
                        $payment->setAdditionalInformation(
                            'quote_' . $order->getQuoteId(),
                            [
                                self::NAME_URL => UrlDataInterface::URL_ANYDAY . $result['checkoutUrl'],
                                self::NAME_TRANSACTION => $result['purchaseOrderId'],
                                self::NAME_QUOTE => (int)$order->getQuoteId(),
                                self::NAME_AMOUNT => (double)$order->getGrandTotal()
                            ]
                        );
                    } else {
                        $errorText = __('Anyday payment Error.');
                        if (isset($result['errorMessage'])) {
                            $errorText = __($result['errorMessage']);
                        }
                        return $this->createResult(false, [$errorText]);
                    }
                } catch (NoData $exception) {
                    return $this->createResult(false, [$exception->getMessage()]);
                }

                $this->serviceAnydayOrder->setOrderStatus(
                    $order,
                    $this->config->getConfigValue(
                        Config::PATH_TO_NEW_ORDER_STATUS,
                        ScopeInterface::SCOPE_STORE,
                        $order->getStoreId()
                    ),
                    false
                );
            }
            return $this->createResult(true, [__('ok')]);
        }

        return $this->createResult(false, [__('No Find order')]);
    }

    /**
     * Validate order is validate
     *
     * @param Payment $payment
     * @return bool
     */
    private function isNotVerifed(Payment $payment): bool
    {
        $stepDataBilling = $payment->getAdditionalInformation('quote_' . $payment->getOrder()->getQuoteId());
        if ($stepDataBilling) {
            if (isset($stepDataBilling[self::NAME_AMOUNT]) &&
                (double)$stepDataBilling[self::NAME_AMOUNT] == (double)$payment->getOrder()->getGrandTotal()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Factory method
     *
     * @param bool $isValid
     * @param array $fails
     * @param array $errorCodes
     * @return ResultInterface
     */
    protected function createResult(bool $isValid, array $fails = [], array $errorCodes = []): ResultInterface
    {
        return $this->resultInterfaceFactory->create(
            [
                'isValid' => (bool)$isValid,
                'failsDescription' => $fails,
                'errorCodes' => $errorCodes
            ]
        );
    }
}
