(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("LanguageInspectionRes", ['$resource', function ($resource) {
            return {
                inspections: $resource("/app/inspections"),
                inspection: $resource("/app/inspection", null, {
                        "add": {method: "POST"}
                    }
                ),
                assignment: $resource("/app/inspection/:id", {id: "@id"}, {"update": {method: "PUT"}}),
                approval: $resource("/app/inspection/:id/approval", {id: "@id"}, {"update": {method: "PUT"}}),
                statement: $resource("/app/inspection/:id/statement", {id: "@id"}, {"update": {method: "PUT"}})
            };
        }]);
}());
