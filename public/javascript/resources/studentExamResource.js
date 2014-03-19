(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("StudentExamRes", ['$resource', function ($resource) {
            return {
                exams: $resource("/student/exams/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"}
                }),

                answer: $resource("/student/exams/:hash/question/:qid/option/:oid",
                {
                    hash: "@hash", qid: "@qid", oid: "@oid"
                },
                {
                    "insertAnswer": {
                        method: "POST", params: { hash: "@hash", qid: "@qid", oid: "@oid" }
                    }
                })
            }
        }]);
}());