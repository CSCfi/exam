'use strict';
angular.module('app.question')
    .component('libraryOwnerSelection', {
        templateUrl: '/assets/app/question/library/owners/libraryOwners.template.html',
        bindings: {
            selections: '<',
            ownerUpdated: '&'
        },
        controller: ['$translate', 'Question', 'UserRes', 'toast',
            function ($translate, Question, UserRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.teachers = UserRes.usersByRole.query({role: 'TEACHER'});
                };

                vm.onTeacherSelect = function ($item, $model, $label) {
                    vm.newTeacher = $item;
                };

                vm.addOwnerForSelected = function () {
                    // check that atleast one has been selected
                    if (vm.selections.length === 0) {
                        toast.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    if (!vm.newTeacher) {
                        toast.warning($translate.instant('sitnet_add_question_owner'));
                        return;
                    }

                    var data = {
                        'uid': vm.newTeacher.id,
                        'questionIds': vm.selections.join()
                    };

                    Question.questionOwnerApi.update(data,
                        function () {
                            toast.info($translate.instant('sitnet_question_owner_added'));
                            vm.ownerUpdated();
                        }, function () {
                            toast.info($translate.instant('sitnet_update_failed'));
                        });
                };

            }
        ]
    });

