'use strict';

angular.module('app.review')
    .component('rInspection', {
        templateUrl: '/assets/app/review/assessment/grading/inspection.template.html',
        bindings: {
            inspection: '<',
            user: '<',
            disabled: '<',
            onInspection: '&'
        },
        controller: ['$translate', 'ExamRes',
            function ($translate, ExamRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviewStatuses = [
                        {
                            'key': true,
                            'value': $translate.instant('sitnet_ready')
                        },
                        {
                            'key': false,
                            'value': $translate.instant('sitnet_in_progress')
                        }
                    ];
                };

                vm.setInspectionStatus = function () {
                    if (vm.inspection.user.id === vm.user.id) {
                        ExamRes.inspectionReady.update({
                            id: vm.inspection.id,
                            ready: vm.inspection.ready
                        }, function (result) {
                            toastr.info($translate.instant('sitnet_exam_updated'));
                            vm.inspection.ready = result.ready;
                            vm.onInspection();
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

            }

        ]
    });
