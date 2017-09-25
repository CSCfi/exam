'use strict';
angular.module('app.question')
    .component('libraryOwnerSelection', {
        templateUrl: '/assets/app/question/library/owners/libraryOwners.template.html',
        bindings: {
            selectionCount: '<',
            ownerUpdated: '&'
        },
        controller: ['$translate', 'Question', 'UserRes',
            function ($translate, Question, UserRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.teachers = UserRes.usersByRole.query({role: 'TEACHER'});
                };

                vm.onTeacherSelect = function ($item, $model, $label) {
                    vm.newTeacher = $item;
                };

                vm.addOwnerForSelected = function () {
                    // check that atleast one has been selected
                    var boxes = angular.element('.questionToUpdate')
                    var ids = [];

                    angular.forEach(boxes, function (input) {
                        if (angular.element(input).prop('checked')) {
                            ids.push(angular.element(input).val());
                        }
                    });

                    if (ids.length === 0) {
                        toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    if (!vm.newTeacher) {
                        toastr.warning($translate.instant('sitnet_add_question_owner'));
                        return;
                    }

                    var data = {
                        'uid': vm.newTeacher.id,
                        'questionIds': ids.toString()
                    };

                    Question.questionOwnerApi.update(data,
                        function () {
                            toastr.info($translate.instant('sitnet_question_owner_added'));
                            vm.ownerUpdated();
                        }, function () {
                            toastr.info($translate.instant('sitnet_update_failed'));
                        });
                };

            }
        ]
    });

