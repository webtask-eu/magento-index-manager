<?php
/**
 * Status Action Controller
 * v1.0.0 - AJAX controller for getting indexing and Elasticsearch status
 *
 * @author RmParts Team
 * @version 1.0.0
 */

namespace RmParts\IndexManager\Controller\Adminhtml\Action;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\JsonFactory;
use RmParts\IndexManager\Model\StatusProvider;

class Status extends Action
{
    const ADMIN_RESOURCE = 'RmParts_IndexManager::manage';

    protected $resultJsonFactory;
    protected $statusProvider;

    /**
     * v1.0.0 - Constructor with dependency injection
     */
    public function __construct(
        Context $context,
        JsonFactory $resultJsonFactory,
        StatusProvider $statusProvider
    ) {
        parent::__construct($context);
        $this->resultJsonFactory = $resultJsonFactory;
        $this->statusProvider = $statusProvider;
    }

    /**
     * v1.0.0 - Get current status of indexers and Elasticsearch
     */
    public function execute()
    {
        $result = $this->resultJsonFactory->create();
        
        try {
            $statusData = [
                'indexers' => $this->statusProvider->getIndexersStatus(),
                'elasticsearch' => $this->statusProvider->getElasticsearchStatus(),
                'processes' => $this->statusProvider->getActiveProcesses(),
                'timestamp' => time()
            ];
            
            return $result->setData([
                'success' => true,
                'data' => $statusData
            ]);
            
        } catch (\Exception $e) {
            return $result->setData([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
}