(function () {
    'use strict';
    angular.module('sitnet.directives')
        .directive('ckEditor', function () {
            return {
                require: '?ngModel',
                link: function (scope, elm, attr, ngModel) {
                    var ck = CKEDITOR.replace(elm[0]);

                    if (!ngModel) return;

                    ck.on('instanceReady', function () {
                        ck.setData(ngModel.$viewValue);
//                        console.log(ngModel.$viewValue);
                    });

                    function updateModel() {
                        scope.$apply(function () {
                            ngModel.$setViewValue(ck.getData());
                        });
                    }

                    ck.on('change', updateModel);
                    ck.on('key', updateModel);
                    ck.on('dataReady', updateModel);

                    ngModel.$render = function (value) {
                        ck.setData(ngModel.$viewValue);
                    };
                }
            };
        })

        .directive('uiBlur', function () {
            return function (scope, elem, attrs) {

                var newExam = scope.newExam;

                elem.bind('blur', function () {
                    scope.$apply(attrs.uiBlur);
                });
            };
        })

        .directive('answerState', ['$translate',  function ($translate) {
            return {
                link: function (scope, elem, attrs, ngModel) {

                    if (scope.option.correctOption === true) {
                        scope.answerState = $translate("sitnet_multiplechoice_question_correct");
                    } else {
                        scope.answerState = $translate("sitnet_multiplechoice_question_incorrect");;
                    }

                    elem.bind('change', function () {
                        scope.$apply(attrs.uiChange);
                    });
                }
            };
        }])

//        .directive('examScore', function () {
//            return {
//                link: function (scope, elem, attrs, ngModel) {
//
//                    if (scope.option.correctOption == true) {
//                        scope.maxScore = scope.question.maxScore;
//                    } else {
//                        scope.answerState = $translate("sitnet_multiplechoice_question_incorrect");;
//                    }
//
//                    elem.bind('blur', function () {
//                        scope.$apply(attrs.uiBlur);
//                    });
//                }
//            };
//        }])

        .directive('uiChange', function () {
            return {
                restrict: 'A', // only activate on element attribute

                link: function (scope, elem, attrs) {

                    elem.bind('change', function () {
                        scope.$apply(attrs.uiChange);
                    });
                }
            }
        })

        .directive('snLibrary', function ($window) {

            return {
                restrict: 'A',

                link: function (scope, elem, attrs) {

                    var winHeight = $window.innerHeight;

                    var headerHeight = attrs.banner ? attrs.banner : 0;

                    elem.css('height', winHeight - 10);
                }
            };
        });
}());
