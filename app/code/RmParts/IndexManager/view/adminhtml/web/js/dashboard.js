/**
 * Index Manager Dashboard JavaScript
 * v1.0.0 - Interactive dashboard functionality
 *
 * @author RmParts Team
 * @version 1.0.0
 */

define([
    'jquery',
    'Magento_Ui/js/modal/confirm',
    'Magento_Ui/js/modal/alert',
    'mage/translate'
], function ($, confirmation, alert, $t) {
    'use strict';

    return function (config) {
        var dashboard = {
            statusUrl: config.statusUrl,
            reindexUrl: config.reindexUrl,
            formKey: config.formKey,
            autoRefreshInterval: null,
            autoRefreshEnabled: false,
            refreshFrequency: 30000, // 30 seconds

            /**
             * v1.0.0 - Initialize dashboard functionality
             */
            init: function () {
                this.bindEvents();
                this.loadInitialData(config.initialIndexers, config.initialElasticsearch);
                this.updateTimestamp();
            },

            /**
             * v1.0.0 - Bind UI events
             */
            bindEvents: function () {
                var self = this;

                $('#refresh-status-btn').on('click', function () {
                    self.refreshStatus();
                });

                $('#auto-refresh-toggle').on('click', function () {
                    self.toggleAutoRefresh();
                });

                $('#reindex-all-btn').on('click', function () {
                    self.confirmReindexAll();
                });

                $(document).on('click', '.reindex-btn', function () {
                    var indexerId = $(this).data('indexer-id');
                    var indexerTitle = $(this).data('indexer-title');
                    self.confirmReindex(indexerId, indexerTitle);
                });
            },

            /**
             * v1.0.0 - Load initial data from server response
             */
            loadInitialData: function (indexers, elasticsearch) {
                try {
                    if (indexers && typeof indexers === 'string') {
                        indexers = JSON.parse(indexers);
                    }
                    if (elasticsearch && typeof elasticsearch === 'string') {
                        elasticsearch = JSON.parse(elasticsearch);
                    }

                    this.updateIndexersTable(indexers || []);
                    this.updateElasticsearchStatus(elasticsearch || {});
                } catch (e) {
                    console.error('Error loading initial data:', e);
                    this.refreshStatus();
                }
            },

            /**
             * v1.0.0 - Refresh all status data
             */
            refreshStatus: function () {
                var self = this;
                this.showLoading();

                $.ajax({
                    url: this.statusUrl,
                    type: 'GET',
                    dataType: 'json',
                    success: function (response) {
                        self.hideLoading();
                        if (response.success) {
                            self.updateIndexersTable(response.data.indexers);
                            self.updateElasticsearchStatus(response.data.elasticsearch);
                            self.updateActiveProcesses(response.data.processes);
                            self.updateTimestamp();
                        } else {
                            self.showError($t('Error updating status: ') + response.message);
                        }
                    },
                    error: function () {
                        self.hideLoading();
                        self.showError($t('Network error while updating status'));
                    }
                });
            },

            /**
             * v1.0.0 - Toggle auto-refresh functionality
             */
            toggleAutoRefresh: function () {
                var button = $('#auto-refresh-toggle');
                var span = button.find('span');

                if (this.autoRefreshEnabled) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshEnabled = false;
                    span.text($t('Auto-Refresh: OFF'));
                    button.removeClass('enabled').addClass('disabled');
                } else {
                    var self = this;
                    this.autoRefreshInterval = setInterval(function () {
                        self.refreshStatus();
                    }, this.refreshFrequency);
                    this.autoRefreshEnabled = true;
                    span.text($t('Auto-Refresh: ON'));
                    button.removeClass('disabled').addClass('enabled');
                }
            },

            /**
             * v1.0.0 - Update indexers table
             */
            updateIndexersTable: function (indexers) {
                var tbody = $('#indexers-tbody');
                tbody.empty();

                if (!indexers || indexers.length === 0) {
                    tbody.append('<tr><td colspan=\"5\">' + $t('No indexers found') + '</td></tr>');
                    return;
                }

                $.each(indexers, function (index, indexer) {
                    var statusClass = indexer.status.toLowerCase().replace(' ', '-');
                    var statusBadge = '<span class=\"status-badge ' + statusClass + '\">' + $t(indexer.status) + '</span>';
                    
                    var updatedTime = indexer.updated ? new Date(indexer.updated).toLocaleString() : $t('Never');
                    
                    var actionButton = indexer.status !== 'Ready' ? 
                        '<button class=\"action-secondary reindex-btn\" data-indexer-id=\"' + indexer.id + '\" data-indexer-title=\"' + indexer.title + '\">' + $t('Reindex') + '</button>' :
                        '<span class=\"up-to-date\">' + $t('Up to date') + '</span>';

                    var row = '<tr>' +
                        '<td>' + indexer.title + '</td>' +
                        '<td>' + statusBadge + '</td>' +
                        '<td>' + indexer.mode + '</td>' +
                        '<td>' + updatedTime + '</td>' +
                        '<td>' + actionButton + '</td>' +
                        '</tr>';
                    
                    tbody.append(row);
                });
            },

            /**
             * v1.0.0 - Update Elasticsearch status
             */
            updateElasticsearchStatus: function (elasticsearch) {
                var indicator = $('#es-status-indicator');
                var clusterHealth = $('#es-cluster-health .value');
                var indicesCount = $('#es-indices-count .value');
                var totalDocs = $('#es-total-docs .value');

                if (elasticsearch.error) {
                    indicator.removeClass('healthy warning error').addClass('error');
                    clusterHealth.text($t('Error: ') + elasticsearch.error);
                    indicesCount.text($t('N/A'));
                    totalDocs.text($t('N/A'));
                } else if (elasticsearch.health) {
                    var health = elasticsearch.health.status;
                    indicator.removeClass('healthy warning error unknown').addClass(health);
                    clusterHealth.text(health.toUpperCase());
                    
                    var indicesCount = elasticsearch.indices ? elasticsearch.indices.length : 0;
                    $('#es-indices-count .value').text(indicesCount);
                    
                    var totalDocuments = 0;
                    if (elasticsearch.indices) {
                        $.each(elasticsearch.indices, function (index, indice) {
                            totalDocuments += parseInt(indice['docs.count'] || 0);
                        });
                    }
                    totalDocs.text(totalDocuments.toLocaleString());
                }

                this.updateIndicesTable(elasticsearch.indices || []);
                this.updateAliasesTable(elasticsearch.aliases || []);
            },

            /**
             * v1.0.0 - Update indices table
             */
            updateIndicesTable: function (indices) {
                var tbody = $('#indices-tbody');
                tbody.empty();

                if (!indices || indices.length === 0) {
                    tbody.append('<tr><td colspan=\"5\">' + $t('No indices found') + '</td></tr>');
                    return;
                }

                $.each(indices, function (index, indice) {
                    var healthClass = indice.health || 'unknown';
                    var healthBadge = '<span class=\"health-badge ' + healthClass + '\">' + (indice.health || $t('Unknown')).toUpperCase() + '</span>';
                    
                    var row = '<tr>' +
                        '<td>' + (indice.index || $t('Unknown')) + '</td>' +
                        '<td>' + healthBadge + '</td>' +
                        '<td>' + (indice.status || $t('Unknown')) + '</td>' +
                        '<td>' + (parseInt(indice['docs.count'] || 0)).toLocaleString() + '</td>' +
                        '<td>' + (indice['store.size'] || $t('N/A')) + '</td>' +
                        '</tr>';
                    
                    tbody.append(row);
                });
            },

            /**
             * v1.0.0 - Update aliases table
             */
            updateAliasesTable: function (aliases) {
                var tbody = $('#aliases-tbody');
                tbody.empty();

                if (!aliases || aliases.length === 0) {
                    tbody.append('<tr><td colspan=\"3\">' + $t('No aliases found') + '</td></tr>');
                    return;
                }

                $.each(aliases, function (index, alias) {
                    var row = '<tr>' +
                        '<td>' + (alias.alias || $t('Unknown')) + '</td>' +
                        '<td>' + (alias.index || $t('Unknown')) + '</td>' +
                        '<td><span class=\"status-badge active\">' + $t('Active') + '</span></td>' +
                        '</tr>';
                    
                    tbody.append(row);
                });
            },

            /**
             * v1.0.0 - Update active processes
             */
            updateActiveProcesses: function (processes) {
                var container = $('#active-processes-list');
                var countBadge = $('#processes-count');

                if (!processes || processes.length === 0) {
                    container.html('<div class=\"no-processes\">' + $t('No active indexing processes') + '</div>');
                    countBadge.text('0');
                    return;
                }

                countBadge.text(processes.length);
                
                var html = '';
                $.each(processes, function (index, process) {
                    html += '<div class=\"process-item\">' +
                        '<div class=\"process-info\">' +
                        '<span class=\"pid\">PID: ' + process.pid + '</span>' +
                        '<span class=\"cpu\">CPU: ' + process.cpu + '%</span>' +
                        '<span class=\"memory\">MEM: ' + process.memory + '%</span>' +
                        '<span class=\"time\">' + process.time + '</span>' +
                        '</div>' +
                        '<div class=\"process-command\">' + process.command + '</div>' +
                        '</div>';
                });
                
                container.html(html);
            },

            /**
             * v1.0.0 - Confirm individual reindex
             */
            confirmReindex: function (indexerId, indexerTitle) {
                var self = this;
                
                confirmation({
                    title: $t('Confirm Reindex'),
                    content: $t('Are you sure you want to reindex this indexer? This may take some time.'),
                    actions: {
                        confirm: function () {
                            self.performReindex(indexerId);
                        }
                    }
                });
            },

            /**
             * v1.0.0 - Confirm reindex all invalid
             */
            confirmReindexAll: function () {
                var self = this;
                
                confirmation({
                    title: $t('Confirm Reindex All'),
                    content: $t('Are you sure you want to reindex all invalid indexers? This may take a long time.'),
                    actions: {
                        confirm: function () {
                            self.performReindexAll();
                        }
                    }
                });
            },

            /**
             * v1.0.0 - Perform individual reindex
             */
            performReindex: function (indexerId) {
                var self = this;
                this.showLoading();

                $.ajax({
                    url: this.reindexUrl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        'indexer_id': indexerId,
                        'form_key': this.formKey
                    },
                    success: function (response) {
                        self.hideLoading();
                        if (response.success) {
                            self.showSuccess(response.message);
                            setTimeout(function () {
                                self.refreshStatus();
                            }, 2000);
                        } else {
                            self.showError(response.message);
                        }
                    },
                    error: function () {
                        self.hideLoading();
                        self.showError($t('Network error while performing reindex'));
                    }
                });
            },

            /**
             * v1.0.0 - Perform reindex all invalid
             */
            performReindexAll: function () {
                // Get all invalid indexers and reindex them
                var invalidIndexers = [];
                $('#indexers-tbody tr').each(function () {
                    var statusBadge = $(this).find('.status-badge');
                    if (statusBadge.hasClass('reindex-required') || statusBadge.hasClass('processing')) {
                        var reindexBtn = $(this).find('.reindex-btn');
                        if (reindexBtn.length > 0) {
                            invalidIndexers.push(reindexBtn.data('indexer-id'));
                        }
                    }
                });

                if (invalidIndexers.length === 0) {
                    this.showMessage($t('No invalid indexers found'));
                    return;
                }

                // Reindex each invalid indexer
                var self = this;
                this.showLoading();
                var completed = 0;
                
                $.each(invalidIndexers, function (index, indexerId) {
                    $.ajax({
                        url: self.reindexUrl,
                        type: 'POST',
                        dataType: 'json',
                        data: {
                            'indexer_id': indexerId,
                            'form_key': self.formKey
                        },
                        success: function (response) {
                            completed++;
                            if (completed === invalidIndexers.length) {
                                self.hideLoading();
                                self.showSuccess($t('All invalid indexers started successfully'));
                                setTimeout(function () {
                                    self.refreshStatus();
                                }, 2000);
                            }
                        },
                        error: function () {
                            completed++;
                            if (completed === invalidIndexers.length) {
                                self.hideLoading();
                                self.showError($t('Some indexers failed to start'));
                            }
                        }
                    });
                });
            },

            /**
             * v1.0.0 - Update timestamp
             */
            updateTimestamp: function () {
                $('#last-updated').text(new Date().toLocaleTimeString());
            },

            /**
             * v1.0.0 - Show loading overlay
             */
            showLoading: function () {
                $('#loading-overlay').show();
            },

            /**
             * v1.0.0 - Hide loading overlay
             */
            hideLoading: function () {
                $('#loading-overlay').hide();
            },

            /**
             * v1.0.0 - Show success message
             */
            showSuccess: function (message) {
                this.showMessage(message, 'success');
            },

            /**
             * v1.0.0 - Show error message
             */
            showError: function (message) {
                this.showMessage(message, 'error');
            },

            /**
             * v1.0.0 - Show message
             */
            showMessage: function (message, type) {
                type = type || 'info';
                var messageHtml = '<div class=\"message message-' + type + '\">' +
                    '<div class=\"message-content\">' + message + '</div>' +
                    '</div>';
                
                var container = $('#messages-container');
                container.html(messageHtml);
                
                setTimeout(function () {
                    container.empty();
                }, 5000);
            }
        };

        // Initialize dashboard
        dashboard.init();
        
        return dashboard;
    };
});