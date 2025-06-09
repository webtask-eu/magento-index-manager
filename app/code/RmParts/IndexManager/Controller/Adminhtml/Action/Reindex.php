<?php
/**
 * Reindex Action Controller
 * v1.0.0 - AJAX controller for manual index operations
 *
 * @author RmParts Team
 * @version 1.0.0
 */

namespace RmParts\IndexManager\Controller\Adminhtml\Action;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\Controller\Result\JsonFactory;
use Magento\Indexer\Model\IndexerFactory;
use Magento\Framework\Exception\LocalizedException;

class Reindex extends Action
{
    const ADMIN_RESOURCE = 'RmParts_IndexManager::manage';

    protected $resultJsonFactory;
    protected $indexerFactory;

    /**
     * v1.0.0 - Constructor with dependency injection
     */
    public function __construct(
        Context $context,
        JsonFactory $resultJsonFactory,
        IndexerFactory $indexerFactory
    ) {
        parent::__construct($context);
        $this->resultJsonFactory = $resultJsonFactory;
        $this->indexerFactory = $indexerFactory;
    }

    /**
     * v1.0.0 - Execute reindex operation
     */
    public function execute()
    {
        $result = $this->resultJsonFactory->create();
        
        try {
            $indexerId = $this->getRequest()->getParam('indexer_id');
            
            if (!$indexerId) {
                throw new LocalizedException(__('Indexer ID is required'));
            }

            $indexer = $this->indexerFactory->create();
            $indexer->load($indexerId);
            
            if (!$indexer->getId()) {
                throw new LocalizedException(__('Invalid indexer ID: %1', $indexerId));
            }

            // Start reindexing in background
            $indexer->reindexAll();
            
            return $result->setData([
                'success' => true,
                'message' => __('Indexer "%1" started successfully', $indexer->getTitle()),
                'indexer_id' => $indexerId,
                'status' => $indexer->getStatus()
            ]);
            
        } catch (\Exception $e) {
            return $result->setData([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
}