<?php
/**
 * Status Provider Model
 * v1.0.0 - Provides comprehensive system status information
 *
 * @author RmParts Team
 * @version 1.0.0
 */

namespace RmParts\IndexManager\Model;

use Magento\Indexer\Model\Indexer\CollectionFactory;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\HTTP\Client\Curl;
use Magento\Framework\Serialize\SerializerInterface;

class StatusProvider
{
    protected $indexerCollectionFactory;
    protected $scopeConfig;
    protected $curl;
    protected $serializer;

    /**
     * v1.0.0 - Constructor with dependencies
     */
    public function __construct(
        CollectionFactory $indexerCollectionFactory,
        ScopeConfigInterface $scopeConfig,
        Curl $curl,
        SerializerInterface $serializer
    ) {
        $this->indexerCollectionFactory = $indexerCollectionFactory;
        $this->scopeConfig = $scopeConfig;
        $this->curl = $curl;
        $this->serializer = $serializer;
    }

    /**
     * v1.0.0 - Get status of all indexers
     */
    public function getIndexersStatus()
    {
        $indexers = [];
        $collection = $this->indexerCollectionFactory->create();
        
        foreach ($collection as $indexer) {
            $indexers[] = [
                'id' => $indexer->getId(),
                'title' => $indexer->getTitle(),
                'status' => $this->getIndexerStatusText($indexer->getStatus()),
                'status_code' => $indexer->getStatus(),
                'updated' => $indexer->getUpdated(),
                'mode' => $indexer->isScheduled() ? 'Schedule' : 'Save',
                'is_working' => $indexer->isWorking(),
                'is_valid' => $indexer->isValid()
            ];
        }
        
        return $indexers;
    }

    /**
     * v1.0.0 - Get Elasticsearch status and statistics
     */
    public function getElasticsearchStatus()
    {
        try {
            $host = $this->getElasticsearchHost();
            
            if (!$host) {
                return ['error' => 'Elasticsearch host not configured'];
            }

            // Get cluster health
            $this->curl->get($host . '/_cluster/health');
            $healthResponse = $this->curl->getBody();
            $health = $this->parseJsonSafely($healthResponse);

            // Get indices info
            $this->curl->get($host . '/_cat/indices?format=json');
            $indicesResponse = $this->curl->getBody();
            $indices = $this->parseJsonSafely($indicesResponse);

            // Get aliases info
            $this->curl->get($host . '/_cat/aliases?format=json');
            $aliasesResponse = $this->curl->getBody();
            $aliases = $this->parseJsonSafely($aliasesResponse);

            return [
                'health' => $health ?: ['status' => 'unknown'],
                'indices' => $this->filterMagentoIndices($indices ?: []),
                'aliases' => $this->filterMagentoAliases($aliases ?: []),
                'host' => $host,
                'status' => 'connected'
            ];

        } catch (\Exception $e) {
            return [
                'error' => $e->getMessage(),
                'status' => 'error'
            ];
        }
    }

    /**
     * v1.0.0 - Get active indexing processes
     */
    public function getActiveProcesses()
    {
        $processes = [];
        
        try {
            $output = shell_exec("ps aux | grep -E '(indexer|reindex)' | grep -v grep");
            
            if ($output) {
                $lines = explode("\n", trim($output));
                foreach ($lines as $line) {
                    if (empty($line)) continue;
                    
                    $parts = preg_split('/\s+/', $line);
                    if (count($parts) >= 11) {
                        $processes[] = [
                            'pid' => $parts[1],
                            'cpu' => $parts[2],
                            'memory' => $parts[3],
                            'time' => $parts[9],
                            'command' => implode(' ', array_slice($parts, 10))
                        ];
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore errors in process listing
        }
        
        return $processes;
    }

    /**
     * v1.0.0 - Get human-readable indexer status
     */
    protected function getIndexerStatusText($status)
    {
        switch ($status) {
            case \Magento\Framework\Indexer\StateInterface::STATUS_VALID:
                return 'Ready';
            case \Magento\Framework\Indexer\StateInterface::STATUS_INVALID:
                return 'Reindex Required';
            case \Magento\Framework\Indexer\StateInterface::STATUS_WORKING:
                return 'Processing';
            default:
                return 'Unknown';
        }
    }

    /**
     * v1.0.0 - Get Elasticsearch host from configuration
     */
    protected function getElasticsearchHost()
    {
        $host = $this->scopeConfig->getValue('catalog/search/elasticsearch7_server_hostname');
        $port = $this->scopeConfig->getValue('catalog/search/elasticsearch7_server_port');
        
        if ($host && $port) {
            return "http://{$host}:{$port}";
        }
        
        return 'http://localhost:9200'; // fallback
    }

    /**
     * v1.0.0 - Filter only Magento-related indices
     */
    protected function filterMagentoIndices($indices)
    {
        if (!is_array($indices)) {
            return [];
        }
        
        return array_filter($indices, function($index) {
            return isset($index['index']) && 
                   (strpos($index['index'], 'magento2') !== false || 
                    strpos($index['index'], 'catalog') !== false);
        });
    }

    /**
     * v1.0.0 - Filter only Magento-related aliases
     */
    protected function filterMagentoAliases($aliases)
    {
        if (!is_array($aliases)) {
            return [];
        }
        
        return array_filter($aliases, function($alias) {
            return isset($alias['alias']) && 
                   (strpos($alias['alias'], 'magento2') !== false || 
                    strpos($alias['alias'], 'catalog') !== false);
        });
    }

    /**
     * v1.0.0 - Safely parse JSON with error handling
     */
    protected function parseJsonSafely($jsonString)
    {
        if (empty($jsonString)) {
            return null;
        }

        try {
            // Clean the JSON string
            $jsonString = trim($jsonString);
            
            // Check if it's valid JSON
            $data = json_decode($jsonString, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('JSON decode error: ' . json_last_error_msg());
            }
            
            return $data;
            
        } catch (\Exception $e) {
            // Log the error for debugging
            error_log('JSON Parse Error in IndexManager: ' . $e->getMessage() . ' | JSON: ' . substr($jsonString, 0, 200));
            return null;
        }
    }
}
