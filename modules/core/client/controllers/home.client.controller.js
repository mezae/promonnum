'use strict';

angular.module('core').controller('HomeController', ['$scope', '$modal', 'Authentication',
    function($scope, $modal, Authentication) {
        // This provides Authentication context.
        $scope.authentication = Authentication;

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

        //Allow user to upload file to add accounts in bulk
        //Makes sure CSV file includes required fields, otherwise lets user which fields are missing
        $scope.handleFileSelect = function() {
            if ($scope.file.length) {
                if ($scope.file[0].type !== 'text/csv') {
                    $scope.alert = {
                        active: true,
                        type: 'danger',
                        msg: 'Must be a csv file!'
                    };
                } else {
                    var file = $scope.file[0];
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
                $scope.file[0] = undefined;
            }
        };

    }
])

.controller('ModalInstanceCtrl', ['$state', '$scope', '$filter', '$modalInstance', 'Authentication', 'arrays', 'Mapping',
    function($state, $scope, $filter, $modalInstance, Authentication, arrays, Mapping) {
        $scope.user = Authentication.user;
        $scope.required_fields = arrays.required_fields;
        $scope.model = {
            selected: null,
            lists: {
                A: [],
                B: []
            }
        };

        for (var i = 0; i < arrays.headers.length; ++i) {
            $scope.model.lists.A.push({
                label: arrays.headers[i]
            });
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
            Mapping.query(function(map) {
                var index = arrays.type === 'Projects' ? 1 : 0;
                $scope.model.lists.B = map[index].map;
                console.log(map[index].map);
            });

        };

        $scope.ok = function() {
            $modalInstance.close($scope.model.lists.B);
        };
    }
]);