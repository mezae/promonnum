'use strict';

angular.module('core').controller('HomeController', ['$scope', '$modal', 'Authentication',
    function($scope, $modal, Authentication) {
        // This provides Authentication context.
        $scope.authentication = Authentication;

        $scope.theColors = ['#a095ff', '#95bfff', '#95ffd5', '#ff95bf'];

        function processProjects(rows, headers) {
            var required_fields = ['Start Date', 'Campaign', 'Service Type', 'Capacity', 'Attendance', 'Fullness'];
            var modal = $modal.open({
                templateUrl: 'modules/core/views/mapping.client.view.html',
                controller: 'ModalInstanceCtrl',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    arrays: function() {
                        return {
                            type: 'Projects',
                            required_fields: required_fields,
                            headers: headers
                        };
                    }
                }
            });

            modal.result.then(function(csvheaders) {
                headers = {
                    sdate_col: headers.indexOf(csvheaders[0].label),
                    campaign_col: headers.indexOf(csvheaders[1].label),
                    service_col: headers.indexOf(csvheaders[2].label),
                    capacity_col: headers.indexOf(csvheaders[3].label),
                    attendance_col: headers.indexOf(csvheaders[4].label),
                    fullness_col: headers.indexOf(csvheaders[5].label)
                };

                $scope.myProjects = [];

                var i = 0;
                while (i < rows.length) {
                    var record = rows[i].split(',');
                    if (!record[0]) {
                        i = rows.length;
                    } else {
                        $scope.myProjects.push({
                            start_date: new Date(record[headers.sdate_col]),
                            campaign: record[headers.campaign_col],
                            service_type: record[headers.service_col],
                            capacity: parseInt(record[headers.capacity_col], 10),
                            attendance: parseInt(record[headers.attendance_col], 10),
                            fullness: parseFloat(record[headers.fullness_col])
                        });

                        var group = _.find($scope.results, {
                            'service_type': record[headers.service_col]
                        });
                        if (group) {
                            group.totalCapacity += parseInt(record[headers.capacity_col], 10);
                            group.totalAttendance += parseInt(record[headers.attendance_col], 10);
                            if (parseFloat(record[headers.fullness_col]) < 50) group.lowFullness++;
                            group.totalProjects++;
                        } else {
                            $scope.results.push({
                                service_type: record[headers.service_col],
                                totalCapacity: parseInt(record[headers.capacity_col], 10),
                                totalAttendance: parseInt(record[headers.attendance_col], 10),
                                lowFullness: parseFloat(record[headers.fullness_col]) < 50 ? 1 : 0,
                                totalProjects: 1
                            });
                        }
                        i++;
                    }
                }
            });
        }

        function processImpacts(rows, headers) {
            var required_fields = ['Start Date', 'Campaign', 'Service Type', 'Impact Type', 'Impact Quantity'];
            var modal = $modal.open({
                templateUrl: 'modules/core/views/mapping.client.view.html',
                controller: 'ModalInstanceCtrl',
                backdrop: 'static',
                size: 'lg',
                resolve: {
                    arrays: function() {
                        return {
                            type: 'Impacts',
                            required_fields: required_fields,
                            headers: headers
                        };
                    }
                }
            });

            modal.result.then(function(csvheaders) {

                headers = {
                    sdate_col: headers.indexOf(csvheaders[0].label),
                    campaign_col: headers.indexOf(csvheaders[1].label),
                    service_col: headers.indexOf(csvheaders[2].label),
                    itype_col: headers.indexOf(csvheaders[3].label),
                    iquantity_col: headers.indexOf(csvheaders[4].label)
                };

                $scope.myImpacts = [];

                var i = 0;
                while (i < rows.length) {
                    var record = rows[i].split(',');
                    if (!record[0]) {
                        i = rows.length;
                    } else {
                        var services = _.find($scope.results, {
                            'service_type': record[headers.service_col],
                        });
                        if (services) {
                            var impacts_index;
                            if (!services.hasOwnProperty('impacts')) {
                                services.impacts = [];
                                impacts_index = -1;
                            } else {
                                impacts_index = _.findIndex(services.impacts, {
                                    'impact_type': record[headers.itype_col]
                                });
                            }
                            if (impacts_index > -1) {
                                services.impacts[impacts_index].total += parseInt(record[headers.iquantity_col], 10);
                            } else {
                                services.impacts.push({
                                    impact_type: record[headers.itype_col],
                                    total: parseInt(record[headers.iquantity_col], 10)
                                });
                            }
                        }
                        i++;
                    }
                }
                $scope.removeDropzone = true;
            });
        }

        $scope.handleFileSelect = function(files, event, reject) {
            if (files.length) {
                if ('application/vnd.ms-excel, text/csv'.indexOf(files[0].type) === -1) {
                    $scope.alert = {
                        active: true,
                        type: 'danger',
                        msg: 'Must be a csv file!'
                    };
                } else {
                    var file = files[0];
                    var reader = new FileReader();
                    reader.onload = function(file) {
                        var content = file.target.result;
                        var rows = content.split(/[\r\n|\n]+/);
                        var headers = rows.shift();
                        headers = headers.split(',');
                        if (headers.indexOf('Fullness Rate') > -1) {
                            $scope.results = [];
                            processProjects(rows, headers);

                        } else {
                            processImpacts(rows, headers);
                        }

                    };
                    reader.readAsText(file);
                }
                files[0] = undefined;
            }
        };

    }
])

.controller('ModalInstanceCtrl', ['$state', '$scope', '$filter', '$modalInstance', 'Authentication', 'arrays', 'Mapping',
    function($state, $scope, $filter, $modalInstance, Authentication, arrays, Mapping) {
        $scope.user = Authentication.user;
        $scope.required_fields = arrays.required_fields;
        $scope.model = {
            lists: {
                A: [],
                B: []
            }
        };

        for (var i = 0; i < arrays.headers.length; ++i) {
            var field = {
                label: arrays.headers[i]
            };
            var isValidColumn = $scope.required_fields.indexOf(field.label);
            if (isValidColumn > -1) {
                $scope.model.lists.B.push(field);
            } else {
                $scope.model.lists.A.push(field);
            }
        }

        $scope.create = function() {
            var article = new Mapping({
                type: arrays.type,
                map: $scope.model.lists.B
            });
            article.$save(function(response) {
                console.log('map saved');
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        $scope.getMapping = function() {
            if ($scope.model.lists.B.length) {
                $scope.model.lists.A = $scope.model.lists.A.concat($scope.model.lists.B);
            }
            $scope.model.lists.B = [];
            Mapping.query(function(map) {
                var index = _.findIndex(map, {
                    'type': arrays.type
                });
                var savedMap = map[index].map;
                for (var i = 0; i < $scope.required_fields.length; i++) {
                    var isValidColumn = _.findIndex($scope.model.lists.A, {
                        'label': savedMap[i].label
                    });
                    if (isValidColumn > -1) {
                        $scope.model.lists.B.push(savedMap[i]);
                        $scope.model.lists.A.splice(isValidColumn, 1);
                    }
                }
                if ($scope.model.lists.B.length < $scope.required_fields.length) {
                    console.log('some required fields appear to be missing from your csv file');
                } else {
                    $scope.isSavedMapping = true;
                }

            });
        };

        $scope.exitModal = function() {
            if ($scope.model.lists.B.length === $scope.required_fields.length) {
                $modalInstance.close($scope.model.lists.B);
            } else {
                $modalInstance.close();
            }
        };
    }
]);
