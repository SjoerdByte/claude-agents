<?php
declare(strict_types=1);

namespace Anyday\Payment\Api\Data\Payment;

interface UrlDataInterface
{
    const URL_ANYDAY            = 'https://my.anyday.io';
    const URL_AUTORIZE          = '/api/v1/orders';
    const URL_CAPTURE           = '/api/v1/orders/{id}/capture';
    const URL_REFUND            = '/api/v1/orders/{id}/refund';
    const URL_CANCEL            = '/api/v1/orders/{id}/cancel';

    /**
     * Get Autorize Url
     *
     * @return string
     */
    public function getAutorizeUrl(): string;

    /**
     * Get Capture Url
     *
     * @param string $idPayment
     * @return string
     */
    public function getCaptureUrl(string $idPayment): string;

    /**
     * Get Refund Url
     *
     * @param string $idPayment
     * @return string
     */
    public function getRefundUrl(string $idPayment): string;
}
