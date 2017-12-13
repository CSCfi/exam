'use strict';
angular.module('app.question')
    .component('library', {
        templateUrl: '/assets/app/question/library/library.template.html',
        controller: ['$location', '$translate', 'toast', function ($location, $translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.questions = [];
            };

            vm.resultsUpdated = function (results) {
                vm.questions = results;
            };

            vm.questionSelected = function (selections) {
                vm.selections = selections;
            };

            vm.questionCopied = function (copy) {
                toast.info($translate.instant('sitnet_question_copied'));
                $location.path('/questions/' + copy.id);
            };

        }]
    });

