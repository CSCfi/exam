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
                                if (!moment(value, "DD.MM.YYYY").isValid()) {
                                    ngModel.$setValidity('badDate', false);
                                }
                            }
                        }
                    }

                    scope.$watch(function () {
                        return ngModel.$viewValue;
                    }, validate);
                }
            };
        })

        .directive('uniqueValue', function () {
            return {
                require: 'ngModel',
                scope: {
                    items: "=",
                    property: "@property"
                },
                link: function (scope, elem, attrs, ngModel) {
                    function validate(value) {
                        var values = !scope.items ? [] : scope.items.map(function (i) {
                            return i[scope.property];
                        }).filter(function (i) {
                            return i == value;
                        });
                        ngModel.$setValidity('uniqueness', values.length < 2);
                    }

                    scope.$watch('items', function (items) {
                        validate(ngModel.$viewValue);
                    }, true);

                }
            };
        })

        .directive('datetimepicker', [
            function () {

                return {
                    restrict: 'EA',
                    require: 'ngModel',
                    scope: {
                        ngModel: '=',
                        datepickerOptions: "=",
                        dateFormat: "=dateFormat",
                        hourStep: "=",
                        minuteStep: "=",
                        showMeridian: "=",
                        meredians: "=",
                        mousewheel: "=",
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
                            return previousAttrs + createAttr.apply(null, attr);
                        }

                        var tmpl = "<div id=\"datetimepicker\" class=\"datetimepicker-wrapper\">" +
                            "<input type=\"text\" class=\"form-control\" uib-datepicker-popup=\"{{dateFormat}}\" ng-click=\"open($event)\" is-open=\"opened\" ng-model=\"ngModel\" " +
                            "datepicker-options=\"datepickerOptions\" close-text=\"{{'sitnet_close' | translate}}\" " +
                            "current-text=\"{{'sitnet_today' | translate}}\" date-validator />\n" +
                            "</div>\n" +
                            "<div id=\"datetimepicker\" class=\"datetimepicker-wrapper\" ng-model=\"time\" ng-change=\"timeChange()\" style=\"display:inline-block\">\n" +
                            "<uib-timepicker " + [
                                ["hourStep"],
                                ["minuteStep"],
                                ["showMeridian"],
                                ["meredians"],
                                ["mousewheel"]
                            ].reduce(createAttrConcat, '') +
                            createEvalAttr("readonlyInput", "readonlyTime") +
                            "></uib-timepicker>\n" +
                            "</div>";
                        return tmpl;
                    },
                    controller: ['$scope',
                        function ($scope) {
                            $scope.timeChange = function () {
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
                };
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

                    function onChange() {
                        updateModel();
                    }
                    function onKey() {
                        updateModel();
                    }
                    function onDataReady() {
                        updateModel();
                    }
                    function onMode() {
                        updateModel();
                    }

                    // use "$scope.updateProperties" in controllers if needed to save the editor after losing focus a.k.a "onblur"
                    ck.on('blur', function () {
                        if (scope.updateProperties !== undefined) {
                            scope.updateProperties();
                        }
                    });
                    ck.on('change', onChange);
                    ck.on('key', onKey);
                    ck.on('dataReady', onDataReady);
                    ck.on('mode', onMode); // Editing mode change

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

        .directive('lowercase', [function () {
            return {
                require: 'ngModel',
                link: function (scope, element, attrs, modelCtrl) {
                    var toLowerCase = function (input) {
                        if (input === undefined) {
                            input = '';
                        }
                        var lc = input.toLowerCase();
                        if (lc !== input) {
                            modelCtrl.$setViewValue(lc);
                            modelCtrl.$render();
                        }
                        return lc;
                    };
                    modelCtrl.$parsers.push(toLowerCase);
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
        .directive('sort', [function () {
            return {
                restrict: 'A',
                template: '<span ng-class="predicate === by ? \'sorted-column\' : \'\'" class="pointer"' +
                'ng-click="predicate = by; reverse = !reverse">{{ text | translate }}&nbsp;' +
                '<i class="fa" ng-class="getSortClass()"></i>' +
                '</span>',
                scope: {
                    predicate: '=',
                    by: '@by',
                    text: '@text',
                    reverse: '='
                }, link: function (scope, element, attrs) {
                    scope.getSortClass = function () {
                        return scope.predicate === scope.by ?
                            (scope.reverse ? 'fa-sort-down' : 'fa-sort-up') : 'fa-sort';
                    };
                }
            };
        }])
        .directive('teacherList', [function () {
            return {
                restrict: 'E',
                replace: true,
                template: '<div><strong>' +
                '<span ng-repeat="owner in exam.examOwners">' +
                '{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}' +
                '</span><br /></strong>' +
                '<span ng-repeat="inspection in exam.examInspections">' +
                '{{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}' +
                '</span></div>',
                scope: {
                    exam: '=exam'
                }
            };
        }])
        .directive('assessmentTeacherList', [function () {
            return {
                restrict: 'E',
                replace: true,
                template: '<div><strong>' +
                '<span ng-repeat="owner in exam.parent.examOwners">' +
                '{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}' +
                '</span><br /></strong>' +
                '<span ng-repeat="inspection in exam.examInspections">' +
                '{{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}' +
                '</span></div>',
                scope: {
                    exam: '=exam'
                }
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
            };
        });
}());
