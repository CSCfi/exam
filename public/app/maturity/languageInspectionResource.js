(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("LanguageInspectionRes", ['$resource', function ($resource) {
            return {
                inspections: $resource("/inspections"),
                inspection: $resource("/inspection", null, {
                        "add": {method: "POST"}
                    }
                )
            };
        }]);
}());
