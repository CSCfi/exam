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
                    "update": {
                        method: "PUT",
                        params: { id: "@id" }}
                }),

                finishedExams: $resource("/student/finishedexams/:uid",
                {
                    uid: "@uid"
                },
                {
                    "get": {method: "GET", params: { uid: "@uid" }}
                }),

                enrolments: $resource("/enrolments/:uid",
                {
                    uid: "@uid"
                },
                {
                    "get": {method: "GET", params: { uid: "@uid" }}
                }),

                exam: $resource("/student/exam/abort/:id",
                {
                    id: "@id"
                },
                {
                    "abort": {
                        method: "PUT",
                        params: { id: "@id" }}
                }),

                feedback: $resource("/feedback/exams/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),
                
                multipleChoiseAnswer: $resource("/student/exams/:hash/question/:qid/option/:oid",
                {
                    hash: "@hash", qid: "@qid", oid: "@oid"
                },
                {
                    "saveMultipleChoice": {
                        method: "POST", params: { hash: "@hash", qid: "@qid", oid: "@oid" }
                    }
                }),

                essayAnswer: $resource("/student/exams/:hash/question/:qid", {
                    hash: "@hash", qid: "@qid", oid: "@oid"
                },
                {
                    "saveEssay": {
                        method: "POST", params: { hash: "@hash", qid: "@qid" }
                    }
                })
            }
        }]);
}());