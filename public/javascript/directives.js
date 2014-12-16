(function () {
    'use strict';
    angular.module('sitnet.directives')
        .directive('ckEditor', function () {
            return {
                require: '?ngModel',
                link: function (scope, elm, attr, ngModel) {
                    var ck = CKEDITOR.replace(elm[0]);
                    var tmp;

                    if (!ngModel) return;

                    ck.on('instanceReady', function () {
                        ck.setData(tmp);
                        //ck.setData(ngModel.$viewValue);
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
                        tmp = ngModel.$modelValue;
                        ck.setData(ngModel.$viewValue);
                    };
                }
            };
        })

        .directive('uiBlur', function () {
            return function (scope, elem, attrs) {

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
                        scope.answerState = $translate("sitnet_multiplechoice_question_incorrect");
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
                    elem.css('height', winHeight - 15);
                 }
            };
        })

        .directive('fileModel', ['$parse', function ($parse) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var model = $parse(attrs.fileModel);
                    var modelSetter = model.assign;

                    element.bind('change', function () {
                        scope.$apply(function () {
                            modelSetter(scope.$parent, element[0].files[0]);
                        });
                    });
                }
            };
        }])

        .directive('mathjax',function(){
            return {
                restrict: 'EA',
                link: function(scope, element, attrs) {
                    scope.$watch(attrs.ngModel, function () {
                        MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)]);
                    });
                }
            };
        })

        // http://developer.the-hideout.de/?p=119
        .directive('dateFix', ['dateFilter', 'datepickerPopupConfig', function(dateFilter, datepickerPopupConfig) {
            // return the directive link function. (compile function not needed)
            return {
                restrict: 'EA',
                require: 'ngModel', // get a hold of NgModelController

                link: function(scope, element, attrs, ngModel) {

                    var format = attrs.datepickerPopup;
                    var maxDate = scope[attrs.max];
                    var minDate = scope[attrs.min];
                    var datefilter = dateFilter;
                    var model = ngModel;

                    ngModel.$parsers.push(function(viewValue) {
                        var newDate = model.$viewValue;
                        var date = null;

                        // pass through if we clicked date from popup
                        if (typeof newDate === "object" || newDate == "") return newDate;

                        // build a new date according to initial localized date format
                        if (format === "dd.MM.yyyy") {
                            // extract day, month and year
                            var splitted = newDate.split('.');

                            var month = parseInt(splitted[1]) - 1;
                            date = new Date(splitted[2], month, splitted[0]);
                            // if maxDate,minDate is set make sure we do not allow greater values
                            if (maxDate && date > maxDate) date = maxDate;
                            if (minDate && date < minDate) date = minDate;

                            model.$setValidity('date', true);
                            model.$setViewValue(date);
                        }
                        return date ? date : viewValue;
                    });

                    element.on('keydown', {scope: scope, varOpen: attrs.isOpen}, function(e) {
                        var response = true;
                        // the scope of the date control
                        var scope = e.data.scope;
                        // the variable name for the open state of the popup (also controls it!)
                        var openId = e.data.varOpen;

                        switch (e.keyCode) {
                            case 13: // ENTER
                                scope[openId] = !scope[openId];
                                // update manually view
                                if (!scope.$$phase) scope.$apply();
                                response = false;
                                break;

                            case 9: // TAB
                                scope[openId] = false;
                                // update manually view
                                if (!scope.$$phase) scope.$apply();
                                break;
                        }

                        return response;
                    });

                    // set input to the value set in the popup, which can differ if input was manually!
                    element.on('blur', {scope: scope}, function(e) {
                        // the value is an object if date has been changed! Otherwise it was set as a string.
                        if (typeof model.$viewValue === "object") {
                            element.context.value = isNaN(model.$viewValue) ? "" : dateFilter(model.$viewValue, format);
                            if (element.context.value == "") model.$setValidity('required', false);
                        }
                    });
                }
            };
        }]);
}());
