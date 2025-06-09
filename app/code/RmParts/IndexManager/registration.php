<?php
/**
 * RmParts IndexManager Module Registration
 * v1.0.0 - Initial release with full index monitoring and management
 *
 * @author RmParts Team
 * @version 1.0.0
 */

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(
    ComponentRegistrar::MODULE,
    'RmParts_IndexManager',
    __DIR__
);