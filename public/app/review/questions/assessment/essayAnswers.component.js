'use strict';

angular.module('app.review')
    .component('essayAnswers', {
        template:
        '<div class="top-row">\n' +
        '    <div class="col-md-12" ng-repeat="answer in $ctrl.answers">\n' +
        '        <essay-answer answer="answer" editable="$ctrl.editable" action="{{$ctrl.actionText}}" on-selection="$ctrl.assessEssay(answer)"></essay-answer>\n' +
        '    </div>\n' +
        '    <div ng-if="$ctrl.answers.length === 0" class="col-md-12">\n' +
        '        <div class="jumbotron padl20"><p class="lead">{{\'sitnet_no_answers_to_assess\' | translate }}</p></div>\n' +
        '    </div>\n' +
        '    <div ng-if="$ctrl.answers.length > 0" class="col-md-12 mart20 marb30">\n' +
        '        <button class="btn btn-success" ng-click="$ctrl.assessSelected()">{{ $ctrl.actionText | translate }} ({{$ctrl.countSelected()}})</button>\n' +
        '    </div>\n' +
        '</div>',
        bindings: {
            editable: '<',
            answers: '<',
            isPremature: '<',
            actionText: '@',
            onAssessed: '&'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                vm.countSelected = function () {
                    if (!vm.answers) {
                        return 0;
                    }
                    return vm.answers.filter(QuestionReview.isAssessed).length;
                };

                vm.assessSelected = function () {
                    vm.onAssessed({answers: vm.answers.filter(QuestionReview.isAssessed)});
                };

                vm.assessEssay = function (answer) {
                    if (QuestionReview.isAssessed(answer)) {
                        vm.onAssessed({answers: [answer]});
                    }
                };


            }
        ]
    });
