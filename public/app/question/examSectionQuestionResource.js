(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("ExamSectionQuestionRes", ['$resource', function ($resource) {
            return {
                questions: $resource("/app/examquestions/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT", params: {id: "@id"}}
                    }),
                options: $resource("/app/examquestions/:qid/option/:oid",
                    {
                        qid: "@qid", oid: "@oid"
                    },
                    {
                        "update": {method: "PUT", params: {oid: "@oid"}}
                    })
            };
        }]);
}());
