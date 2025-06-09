<?php
/**
 * Dashboard Block
 * v1.0.0 - Main dashboard block for index management interface
 *
 * @author RmParts Team
 * @version 1.0.0
 */

namespace RmParts\IndexManager\Block\Adminhtml;

use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;
use RmParts\IndexManager\Model\StatusProvider;

class Dashboard extends Template
{
    protected $statusProvider;

    /**
     * v1.0.0 - Constructor with dependencies
     */
    public function __construct(
        Context $context,
        StatusProvider $statusProvider,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->statusProvider = $statusProvider;
    }

    /**
     * v1.0.0 - Get AJAX URL for status updates
     */
    public function getStatusUrl()
    {
        return $this->getUrl('indexmanager/action/status');
    }

    /**
     * v1.0.0 - Get AJAX URL for reindex actions
     */
    public function getReindexUrl()
    {
        return $this->getUrl('indexmanager/action/reindex');
    }

    /**
     * v1.0.0 - Get initial indexers data
     */
    public function getInitialIndexersData()
    {
        try {
            $data = $this->statusProvider->getIndexersStatus();
            return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (\Exception $e) {
            return '[]';
        }
    }

    /**
     * v1.0.0 - Get initial Elasticsearch data
     */
    public function getInitialElasticsearchData()
    {
        try {
            $data = $this->statusProvider->getElasticsearchStatus();
            return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (\Exception $e) {
            return '{"error": "Failed to load Elasticsearch data"}';
        }
    }

    /**
     * v1.0.0 - Get form key for AJAX requests
     */
    public function getFormKey()
    {
        return $this->formKey->getFormKey();
    }
}
