<?php
/**
 * IndexManager Dashboard Controller
 * v1.0.0 - Main dashboard for monitoring and managing indexation
 *
 * @author RmParts Team
 * @version 1.0.0
 */

namespace RmParts\IndexManager\Controller\Adminhtml\Dashboard;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;

class Index extends Action
{
    const ADMIN_RESOURCE = 'RmParts_IndexManager::manage';

    protected $resultPageFactory;

    /**
     * v1.0.0 - Constructor with dependency injection
     */
    public function __construct(
        Context $context,
        PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
        $this->resultPageFactory = $resultPageFactory;
    }

    /**
     * v1.0.0 - Execute dashboard page
     */
    public function execute()
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->setActiveMenu('RmParts_IndexManager::indexmanager');
        $resultPage->getConfig()->getTitle()->prepend(__('Index Manager Dashboard'));
        
        return $resultPage;
    }
}