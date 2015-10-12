(function () {
    'use strict';
    angular.module('exam.directives')

        .directive('dateValidator', function () {
            return {
                require: 'ngModel',
                link: function (scope, elem, attr, ngModel) {
                    function validate(value) {
                        if (value) {
                            ngModel.$setValidity('badDate', true);
                            ngModel.$setValidity('date', true);
                            ngModel.$setValidity('required', true);
                            if (value instanceof Date) {
                                var d = Date.parse(value);
                                // it is a date
                                if (isNaN(d)) {
                                    ngModel.$setValidity('badDate', false);
                                }
                            } else {
                                if (!moment(value).isValid()) {
                                    ngModel.$setValidity('badDate', false);
                                }
                            }
                        }
                    }

                    scope.$watch(function () {
                        return ngModel.$viewValue;
                    }, validate);
                }
            }
        })

        .directive('datepickerPopup', function () {
            return {
                restrict: 'EAC',
                require: 'ngModel',
                link: function (scope, element, attr, controller) {
                    //remove the default formatter from the input directive to prevent conflict
                    controller.$formatters.shift();
                }
            }
        })
        .directive('datetimepicker', [
            function () {
                if (angular.version.full < '1.1.4') {
                    return {
                        restrict: 'EA',
                        template: "<div class=\"alert alert-danger\">Angular 1.1.4 or above is required for datetimepicker to work correctly</div>"
                    };
                }
                return {
                    restrict: 'EA',
                    require: 'ngModel',
                    scope: {
                        ngModel: '=',
                        dayFormat: "=",
                        monthFormat: "=",
                        yearFormat: "=",
                        dayHeaderFormat: "=",
                        dayTitleFormat: "=",
                        monthTitleFormat: "=",
                        showWeeks: "=",
                        startingDay: "=",
                        yearRange: "=",
                        dateFormat: "=",
                        minDate: "=",
                        maxDate: "=",
                        dateOptions: "=",
                        dateDisabled: "&",
                        hourStep: "=",
                        minuteStep: "=",
                        showMeridian: "=",
                        meredians: "=",
                        mousewheel: "=",
                        placeholder: "=",
                        readonlyTime: "@"
                    },
                    template: function (elem, attrs) {
                        function dashCase(name, separator) {
                            return name.replace(/[A-Z]/g, function (letter, pos) {
                                return (pos ? '-' : '') + letter.toLowerCase();
                            });
                        }

                        function createAttr(innerAttr, dateTimeAttrOpt) {
                            var dateTimeAttr = angular.isDefined(dateTimeAttrOpt) ? dateTimeAttrOpt : innerAttr;
                            if (attrs[dateTimeAttr]) {
                                return dashCase(innerAttr) + "=\"" + dateTimeAttr + "\" ";
                            } else {
                                return '';
                            }
                        }

                        function createFuncAttr(innerAttr, funcArgs, dateTimeAttrOpt) {
                            var dateTimeAttr = angular.isDefined(dateTimeAttrOpt) ? dateTimeAttrOpt : innerAttr;
                            if (attrs[dateTimeAttr]) {
                                return dashCase(innerAttr) + "=\"" + dateTimeAttr + "({" + funcArgs + "})\" ";
                            } else {
                                return '';
                            }
                        }

                        function createEvalAttr(innerAttr, dateTimeAttrOpt) {
                            var dateTimeAttr = angular.isDefined(dateTimeAttrOpt) ? dateTimeAttrOpt : innerAttr;
                            if (attrs[dateTimeAttr]) {
                                return dashCase(innerAttr) + "=\"" + attrs[dateTimeAttr] + "\" ";
                            } else {
                                return dashCase(innerAttr);
                            }
                        }

                        function createAttrConcat(previousAttrs, attr) {
                            return previousAttrs + createAttr.apply(null, attr)
                        }

                        var tmpl = "<div id=\"datetimepicker\" class=\"datetimepicker-wrapper\">" +
                            "<input class=\"form-control\" type=\"text\" ng-click=\"open($event)\" is-open=\"opened\" ng-model=\"ngModel\" " + [
                                ["minDate"],
                                ["maxDate"],
                                ["dayFormat"],
                                ["monthFormat"],
                                ["yearFormat"],
                                ["dayHeaderFormat"],
                                ["dayTitleFormat"],
                                ["monthTitleFormat"],
                                ["startingDay"],
                                ["yearRange"],
                                ["datepickerOptions", "dateOptions"]
                            ].reduce(createAttrConcat, '') +
                            createFuncAttr("dateDisabled", "date: date, mode: mode") +
                            createEvalAttr("datepickerPopup", "dateFormat") +
                            createEvalAttr("placeholder", "placeholder") +
                            "/>\n" +
                            "</div>\n" +
                            "<div id=\"datetimepicker\" class=\"datetimepicker-wrapper\" ng-model=\"time\" ng-change=\"time_change()\" style=\"display:inline-block\">\n" +
                            "<timepicker " + [
                                ["hourStep"],
                                ["minuteStep"],
                                ["showMeridian"],
                                ["meredians"],
                                ["mousewheel"]
                            ].reduce(createAttrConcat, '') +
                            createEvalAttr("readonlyInput", "readonlyTime") +
                            "></timepicker>\n" +
                            "</div>";
                        return tmpl;
                    },
                    controller: ['$scope',
                        function ($scope) {
                            $scope.time_change = function () {
                                if ($scope.ngModel && $scope.time) {
                                    // convert from ISO format to Date
                                    if (typeof $scope.ngModel == "string") $scope.ngModel = new Date($scope.ngModel);
                                    $scope.ngModel.setHours($scope.time.getHours(), $scope.time.getMinutes());
                                }
                            };
                            $scope.open = function ($event) {
                                $event.preventDefault();
                                $event.stopPropagation();
                                $scope.opened = true;
                            };
                        }
                    ],
                    link: function (scope, element) {
                        scope.$watch(function () {
                            return scope.ngModel;
                        }, function (ngModel) {
                            // if a time element is focused, updating its model will cause hours/minutes to be formatted by padding with leading zeros
                            if (!element[0].contains(document.activeElement)) {
                                scope.time = new Date(ngModel);
                            }
                        }, true);
                    }
                }
            }])


        .directive('ckEditor', function () {
            return {
                require: '?ngModel',
                link: function (scope, elm, attr, ngModel) {
                    var tmp;

                    var ck = CKEDITOR.replace(elm[0]);

                    if (!ngModel) {
                        return;
                    }

                    ck.on('instanceReady', function () {
                        ck.setData(tmp);
                    });

                    function updateModel() {
                        scope.$apply(function () {
                            ngModel.$setViewValue(ck.getData());
                        });
                    }

                    // use "$scope.updateProperties" in controllers if needed to save the editor after losing focus a.k.a "onblur"
                    ck.on('blur', function () {
                        if (scope.updateProperties !== undefined) {
                            scope.updateProperties();
                        }
                    });
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

        .directive('uiChange', function () {
            return {
                restrict: 'A', // only activate on element attribute

                link: function (scope, elem, attrs) {

                    elem.bind('change', function () {
                        scope.$apply(attrs.uiChange);
                    });
                }
            };
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

        .directive('mathjax', function () {
            return {
                restrict: 'EA',
                link: function (scope, element, attrs) {
                    scope.$watch(attrs.ngModel, function () {
                        MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)]);
                    });
                }
            };
        })

        .directive('focusOn', function () {
            return function (scope, elem, attr) {
                scope.$on('focusOn', function (e, name) {
                    if (name === attr.focusOn) {
                        elem[0].focus();
                    }
                });
            };
        })

        // http://developer.the-hideout.de/?p=119
        .directive('dateFix', ['dateFilter', 'datepickerPopupConfig', function (dateFilter, datepickerPopupConfig) {
            // return the directive link function. (compile function not needed)
            return {
                restrict: 'EA',
                require: 'ngModel', // get a hold of NgModelController

                link: function (scope, element, attrs, ngModel) {

                    var format = attrs.datepickerPopup;
                    var maxDate = scope[attrs.max];
                    var minDate = scope[attrs.min];
                    var datefilter = dateFilter;
                    var model = ngModel;

                    ngModel.$parsers.push(function (viewValue) {
                        var newDate = model.$viewValue;
                        var date = null;

                        // pass through if we clicked date from popup
                        if (typeof newDate === "object" || newDate == "") {
                            return newDate;
                        }

                        // build a new date according to initial localized date format
                        if (format === "dd.MM.yyyy") {
                            // extract day, month and year
                            var splitted = newDate.split('.');

                            var month = parseInt(splitted[1]) - 1;
                            date = new Date(splitted[2], month, splitted[0]);
                            // if maxDate,minDate is set make sure we do not allow greater values
                            if (maxDate && date > maxDate) {
                                date = maxDate;
                            }
                            if (minDate && date < minDate) {
                                date = minDate;
                            }

                            model.$setValidity('date', true);
                            model.$setViewValue(date);
                        }
                        return date ? date : viewValue;
                    });

                    element.on('keydown', {scope: scope, varOpen: attrs.isOpen}, function (e) {
                        var response = true;
                        // the scope of the date control
                        var scope = e.data.scope;
                        // the variable name for the open state of the popup (also controls it!)
                        var openId = e.data.varOpen;

                        switch (e.keyCode) {
                            case 13: // ENTER
                                scope[openId] = !scope[openId];
                                // update manually view
                                if (!scope.$$phase) {
                                    scope.$apply();
                                }
                                response = false;
                                break;

                            case 9: // TAB
                                scope[openId] = false;
                                // update manually view
                                if (!scope.$$phase) {
                                    scope.$apply();
                                }
                                break;
                        }

                        return response;
                    });

                    // set input to the value set in the popup, which can differ if input was manually!
                    element.on('blur', {scope: scope}, function (e) {
                        // the value is an object if date has been changed! Otherwise it was set as a string.
                        if (typeof model.$viewValue === "object") {
                            element.context.value = isNaN(model.$viewValue) ? "" : dateFilter(model.$viewValue, format);
                            if (element.context.value == "") {
                                model.$setValidity('required', false);
                            }
                        }
                    });
                }
            };
        }])
        .directive('sitnetHeader', [function () {
            return {
                restrict: 'E',
                replace: true,
                template: '<div id="sitnet-header" class="header">' +
                '<div class="col-md-12 header-wrapper">' +
                '<span class="header-text">{{ "sitnet_welcome" | translate }}, {{getUsername()}}</span>' +
                '</div>' +
                '</div>'
            };
        }])
        .directive('paginator', function () {
            return {
                restrict: 'E',
                replace: true,
                template: '<ul class="pagination pagination-sm">' +
                '<li ng-class="previousPageDisabled()"><a href="" ng-click="previousPage()">&larr;</a></li>' +
                '<li ng-repeat="n in range()" ng-class="{active: isCurrent(n)}" ng-click="setPage(n)"><a href="">{{ printRange(n) }}</a></li>' +
                '<li ng-class="nextPageDisabled()"><a target="_blank" ng-click="nextPage()">&rarr;</a></li>' +
                '</ul>',
                scope: {
                    items: '=items',
                    pageSize: '=pageSize',
                    currentPage: '=currentPage'
                }, // We might want to wire this with the table this paginates upon. The question is: HOW :)
                link: function (scope, element, attrs) {
                    var pageCount = 0;
                    scope.currentPage = 0;
                    scope.$watch('items', function (items) {
                        if (items) {
                            pageCount = Math.ceil(items.length / scope.pageSize) - 1;
                        }
                        // Go to first page always when the underlying collection gets modified
                        scope.currentPage = 0;
                    });

                    scope.printRange = function (n) {
                        if (scope.items) {
                            var begin = n * scope.pageSize + 1;
                            var end = Math.min(scope.items.length, (n + 1) * scope.pageSize);
                            return begin + " - " + end;
                        }
                    };

                    scope.previousPage = function () {
                        if (scope.currentPage > 0) {
                            scope.currentPage--;
                        }
                    };

                    scope.isCurrent = function (n) {
                        return n === scope.currentPage;
                    };

                    scope.previousPageDisabled = function () {
                        return scope.currentPage === 0 ? "disabled" : "";
                    };


                    scope.nextPage = function () {
                        if (scope.currentPage < pageCount) {
                            scope.currentPage++;
                        }
                    };

                    scope.nextPageDisabled = function () {
                        return scope.currentPage === pageCount ? "disabled" : "";
                    };

                    scope.range = function () {
                        var ret = [];
                        for (var x = 0; x <= pageCount; ++x) {
                            ret.push(x);
                        }
                        return ret;
                    };

                    scope.setPage = function (n) {
                        scope.currentPage = n;
                    };
                }
            }
        });
}());
