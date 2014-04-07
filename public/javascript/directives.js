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
                        console.log(ngModel.$viewValue);
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

        .directive('ngModelOnblur', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, elm, attr, ngModelCtrl) {
                if (attr.type === 'radio' || attr.type === 'checkbox') return;

//                elm.unbind('input').unbind('keydown').unbind('change');
//                elm.bind('blur', function() {
//                    scope.$apply(function() {
//                        ngModelCtrl.$setViewValue(elm.val());
//                    });
//                });
                elm.bind("keydown keypress", function(event) {
                    if (event.which === 13) {
                        scope.$apply(function() {
                            ngModelCtrl.$setViewValue(elm.val());
                        });
                    }
                });
            }
        };
    });
}());
