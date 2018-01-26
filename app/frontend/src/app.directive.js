/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';
import _ from 'lodash';
import moment from 'moment';

angular.module('app')

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
                            const d = Date.parse(value);
                            // it is a date
                            if (isNaN(d)) {
                                ngModel.$setValidity('badDate', false);
                            }
                        } else {
                            if (!moment(value, 'DD.MM.YYYY').isValid()) {
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
                items: '=',
                property: '@property'
            },
            link: function (scope, elem, attrs, ngModel) {
                function validate(value) {
                    const values = !scope.items ? [] : scope.items.map(function (i) {
                        return i[scope.property];
                    }).filter(function (i) {
                        return i === value;
                    });
                    ngModel.$setValidity('uniqueness', values.length < 2);
                }

                scope.$watch('items', function (items) {
                    validate(ngModel.$viewValue);
                }, true);

            }
        };
    })

    .directive('ckEditor', ['$rootScope', function ($rootScope) {
        return {
            require: 'ngModel',
            scope: {
                enableClozeTest: '=?'
            },
            link: function (scope, elm, attr, ngModel) {
                const ck = CKEDITOR.replace(elm[0]);

                if (!ngModel) {
                    return;
                }

                ck.on('instanceReady', function () {
                    ck.setData(tmp);
                    if (!scope.enableClozeTest) {
                        ck.getCommand('insertCloze').disable();
                    }
                });

                scope.$watch('enableClozeTest', function (value) {
                    const cmd = ck.getCommand('insertCloze');
                    if (cmd) {
                        if (!value) {
                            cmd.disable();
                        } else {
                            cmd.enable();
                        }
                    }
                });

                function updateModel() {
                    _.defer(function () {
                        scope.$apply(function () {
                            ngModel.$setViewValue(ck.getData());
                        });
                    });
                }

                ck.on('change', _.debounce(updateModel, 100)); // This can bring down the UI if not scaled down
                ck.on('dataReady', updateModel);
                ck.on('key', _.debounce(updateModel, 100));
                ck.on('mode', updateModel); // Editing mode change

                let tmp;

                ngModel.$render = function (value) {
                    tmp = ngModel.$modelValue;
                    ck.setData(ngModel.$viewValue);
                };
            }
        };
    }])

    .directive('fixedPrecision', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attrs, ngModel) {
                const toFixed = function (input) {
                    if (!input) {
                        input = 0;
                    }
                    const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
                    if (!input.toString().match(re)) {
                        const fixed = parseFloat(input.toFixed(2));
                        ngModel.$setViewValue(fixed);
                        ngModel.$render();
                        return fixed;
                    }
                    return input;
                };
                ngModel.$parsers.push(toFixed);
            }
        };
    })

    .directive('clozeTest', function ($compile) {
        return {
            restrict: 'E',
            scope: {
                results: '=',
                content: '=',
                editable: '=?'
            },
            link: function (scope, element, attrs) {
                const editable = angular.isUndefined(scope.editable) || scope.editable; // defaults to true
                const replacement = angular.element(scope.content);
                const inputs = replacement.find('input');
                for (let i = 0; i < inputs.length; ++i) {
                    const input = inputs[i];
                    const id = input.attributes.id.value;
                    const answer = scope.results ? scope.results[input.id] : null;
                    if (answer) {
                        input.setAttribute('size', answer.length);
                    }
                    input.setAttribute('ng-model', 'results.' + id);
                    if (!editable) {
                        input.setAttribute('ng-disabled', 'true');
                    }
                }
                element.replaceWith(replacement);
                $compile(replacement)(scope);
            }
        };
    })
    .directive('uiBlur', ['$parse', function ($parse) {
        return {
            restrict: 'A', // only activate on element attribute
            link: function (scope, elem, attrs) {
                const parser = $parse(attrs.uiBlur);
                elem.bind('blur', function () {
                    parser(scope);
                });
            }
        };
    }])

    .directive('uiChange', ['$parse', function ($parse) {
        return {
            restrict: 'A', // only activate on element attribute
            link: function (scope, elem, attrs) {
                const parser = $parse(attrs.uiChange);
                elem.bind('change', function () {
                    parser(scope);
                });
            }
        };
    }])

    .directive('fileModel', ['$parse', function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                const model = $parse(attrs.fileModel);
                const modelSetter = model.assign;

                element.bind('change', function () {
                    scope.$apply(function () {
                        modelSetter(scope.$parent, element[0].files[0]);
                    });
                });
            }
        };
    }])

    .directive('fileSelector', [function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                element.bind('change', function () {
                    ngModel.$setViewValue(element[0].files[0]);
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
                const toLowerCase = function (input) {
                    if (input === undefined) {
                        input = '';
                    }
                    const lc = input.toLowerCase();
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

    .directive('sort', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            template: '<span class="pointer"' +
                'ng-click="sort()">{{ text | translate }}&nbsp;' +
                '<i class="fa" ng-class="getSortClass()"></i>' +
                '</span>',
            scope: {
                predicate: '=',
                by: '@by',
                text: '@text',
                reverse: '=',
                onSort: '&?'
            }, link: function (scope, element, attrs) {
                scope.sort = function () {
                    scope.predicate = scope.by;
                    scope.reverse = !scope.reverse;
                    if (scope.onSort) {
                        $timeout(scope.onSort);
                    }
                };
                scope.getSortClass = function () {
                    return scope.predicate === scope.by ?
                        (scope.reverse ? 'fa-caret-down' : 'fa-caret-up') : 'fa-sort';
                };
            }
        };
    }])
    .directive('teacherList', [function () {
        return {
            restrict: 'E',
            replace: false,
            transclude: false,
            template: '<div>' +
                '<span ng-repeat="owner in exam.examOwners">' +
                '<strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>' +
                '</span>' +
                '<span ng-repeat="inspection in exam.examInspections">{{$first ? ", " : "";}}' +
                '{{inspection.user.firstName}} {{inspection.user.lastName}}{{$last ? "" : ", ";}}' +
                '</span></div>',
            scope: {
                exam: '=exam',
                addEnrolmentInformation: '&'
            }
        };
    }])
    .directive('assessmentTeacherList', [function () {
        return {
            restrict: 'E',
            replace: true,
            template: '<div>' +
                '<span ng-repeat="owner in exam.parent.examOwners">' +
                '<strong>{{owner.firstName}} {{owner.lastName}}{{$last ? "" : ", ";}}</strong>' +
                '</span><br />' +
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
                '<li ng-class="previousPageDisabled()"><a href="" ng-click="previousPage()">&#60;</a></li>' +
                '<li ng-repeat="n in range()" ng-class="{active: isCurrent(n)}" ng-click="setPage(n)"><a href="">{{ printRange(n) }}</a></li>' +
                '<li ng-class="nextPageDisabled()"><a target="_blank" ng-click="nextPage()">&#62;</a></li>' +
                '</ul>',
            scope: {
                items: '=items',
                pageSize: '=pageSize',
                currentPage: '=currentPage'
            }, // We might want to wire this with the table this paginates upon. The question is: HOW :)
            link: function (scope, element, attrs) {
                let pageCount = 0;
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
                        return n + 1;
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
                    return scope.currentPage === 0 ? 'disabled' : '';
                };


                scope.nextPage = function () {
                    if (scope.currentPage < pageCount) {
                        scope.currentPage++;
                    }
                };

                scope.nextPageDisabled = function () {
                    return scope.currentPage === pageCount ? 'disabled' : '';
                };

                scope.range = function () {
                    const ret = [];
                    for (let x = 0; x <= pageCount; ++x) {
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

