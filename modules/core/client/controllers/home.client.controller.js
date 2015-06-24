'use strict';

angular.module('core').controller('HomeController', ['$scope', 'Authentication',
    function($scope, Authentication) {
        // This provides Authentication context.
        $scope.authentication = Authentication;

        function processProjects(rows, headers) {
            headers = {
                sdate_col: headers.indexOf('Start Date'),
                campaign_col: headers.indexOf('Campaign Name'),
                service_col: headers.indexOf('Service Type'),
                capacity_col: headers.indexOf('Capacity'),
                attendance_col: headers.indexOf('Official Attendance'),
                fullness_col: headers.indexOf('Fullness Rate')
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
                    } else {
                        $scope.results.push({
                            service_type: record[headers.service_col],
                            totalCapacity: parseInt(record[headers.capacity_col], 10),
                            totalAttendance: parseInt(record[headers.attendance_col], 10),
                            lowFullness: parseFloat(record[headers.fullness_col]) < 50 ? 1 : 0
                        });
                    }
                    i++;
                }
            }
        }

        function processImpacts(rows, headers) {
            headers = {
                sdate_col: headers.indexOf('Start Date'),
                campaign_col: headers.indexOf('Campaign Name'),
                service_col: headers.indexOf('Service Type'),
                itype_col: headers.indexOf('Impact Type'),
                iquantity_col: headers.indexOf('Impact Quantity')
            };

            $scope.myImpacts = [];

            var i = 0;
            while (i < rows.length) {
                var record = rows[i].split(',');
                if (!record[0]) {
                    i = rows.length;
                } else {
                    var group = _.find($scope.results, {
                        'service_type': record[headers.service_col],
                        'impact_type': record[headers.itype_col]
                    });
                    if (group) {
                        group.total += parseInt(record[headers.iquantity_col], 10);
                    } else {
                        $scope.results.push({
                            service_type: record[headers.service_col],
                            impact_type: record[headers.itype_col],
                            total: parseInt(record[headers.iquantity_col], 10)
                        });
                    }
                    i++;
                }
            }
            $scope.removeDropzone = true;
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
                        $scope.results = [];
                        if (headers.indexOf('Fullness Rate') > -1) {
                            processProjects(rows, headers);

                        } else {
                            processImpacts(rows, headers);
                        }

                    };
                    reader.readAsText(file);
                    console.log($scope.file);
                }
                $scope.file[0] = undefined;
            }
        };

    }
]);