<?php
declare(strict_types=1);

namespace Anyday\Payment\Service\Anyday;

use Anyday\Payment\Api\Anyday\ManagerInterface;
use Anyday\Payment\Api\Data\Anydaytag\SettingsInterface;
use Anyday\Payment\Api\Data\Payment\UrlDataInterface;
use Anyday\Payment\Block\Adminhtml\Config\Store;
use Anyday\Payment\Gateway\Http\Client\Curl;
use Magento\Framework\App\Config\Storage\WriterInterface;
use Anyday\Payment\Lib\Serialize\Serializer\JsonHexTag;
use Magento\Store\Model\ScopeInterface;

class Manager implements ManagerInterface
{
    /**
     * @var JsonHexTag
     */
    private $json;

    /**
     * @var WriterInterface
     */
    private $writer;

    /**
     * @var Curl
     */
    private $curlAnyday;

    /**
     * @param JsonHexTag $json
     * @param WriterInterface $writer
     * @param Curl $curlAnyday
     */
    public function __construct(
        JsonHexTag $json,
        WriterInterface $writer,
        Curl $curlAnyday
    ) {
        $this->json         = $json;
        $this->writer       = $writer;
        $this->curlAnyday   = $curlAnyday;
    }

    /**
     * Update Credentials
     *
     * @param string $data
     * @return bool|mixed|string
     */
    public function getCredentialsFromAnyday(string $data)
    {
        $data = $this->json->unserialize($data);
        $params['Username'] = $data['email'];
        $params['Password'] = $data['password'];

        $url = UrlDataInterface::URL_ANYDAY.'/api/v1/authentication/login';
        $data_string = json_encode($params);
        $this->curlAnyday->setBody($data_string);
        $this->curlAnyday->setUrl($url);

        $result = $this->curlAnyday->request();
        if (isset($result['errors']) && is_array($result['errors'])) {
            $returnArr['code'] = 'error';
            $returnArr['result'] = implode(' ', $result['errors']);
        } else {
            $returnArr['code'] = 'ok';
            $returnArr['token'] = $result['access_token'];
            $url = UrlDataInterface::URL_ANYDAY.'/api/v1/webshop/mine';

            $this->curlAnyday->setUrl($url);
            $this->curlAnyday->setAuthorization((string)$result['access_token']);
            $result = $this->curlAnyday->request(true);

            if (isset($result['data']) && isset($result['data'][0]) && isset($result['data'][0]['apiKey'])
                    && isset($result['data'][0]['testAPIKey'])) {
                $returnArr['live'] = $result['data'][0]['apiKey'];
                $returnArr['sandbox'] = $result['data'][0]['testAPIKey'];
                $returnArr['priceTagToken'] = $result['data'][0]['priceTagToken'];
                $returnArr['privateKey'] = $result['data'][0]['privateKey'];
            } else {
                $returnArr['code'] = 'error';
                $returnArr['result'] = implode(' ', $result['errors']);
            }
        }

        return $this->json->serialize($returnArr);
    }
}
