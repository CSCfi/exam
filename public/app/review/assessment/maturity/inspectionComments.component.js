'use strict';

angular.module('app.review')
    .component('rInspectionComments', {
        templateUrl: '/assets/app/review/assessment/maturity/inspectionComments.template.html',
        bindings: {
            exam: '<',
            addingDisabled: '<',
            addingVisible: '<'
        },
        controller: ['$uibModal', 'ExamRes',
            function ($modal, ExamRes) {

                var vm = this;

                vm.addInspectionComment = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'rInspectionComment'
                    }).result.then(function (params) {
                        ExamRes.inspectionComment.create({
                            id: vm.exam.id,
                            comment: params.comment
                        }, function (comment) {
                            vm.exam.inspectionComments.unshift(comment);
                        });
                    });
                };

            }

        ]
    });
