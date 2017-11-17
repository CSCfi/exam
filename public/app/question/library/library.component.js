'use strict';
angular.module('app.question')
    .component('library', {
        templateUrl: '/assets/app/question/library/library.template.html',
        controller: [function () {

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

        }]
    });

