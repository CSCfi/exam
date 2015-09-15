(function () {
    'use strict';
    angular.module("exam.resources")
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

                enrolments: $resource("/enrolments"),
                enrolment: $resource("/enrolments/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }},
                    "update": {method: "PUT", params: { eid: "@eid" }}
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

                multipleChoiceAnswer: $resource("/student/exams/:hash/question/:qid/option/:oids",
                {
                    hash: "@hash", qid: "@qid", oid: "@oids"
                },
                {
                    "saveMultipleChoice": {
                        method: "POST", params: { hash: "@hash", qid: "@qid", oids: "@oids" }
                    }
                }),

                essayAnswer: $resource("/student/exams/:hash/question/:qid", {
                    hash: "@hash", qid: "@qid", oid: "@oid"
                },
                {
                    "saveEssay": {
                        method: "POST", params: { hash: "@hash", qid: "@qid" }
                    }
                }),
                teachers: $resource("/student/inspectors/exam/:id",
                {
                    id: "@id"
                },
                {
                    "get": { method: "GET", isArray:true, params: { id: "@id" }}
                }),
                reservationInstructions: $resource("/student/exams/:id",
                {
                    id: "@id"
                },
                {
                    "get": { method: "GET", isArray:false, params: { id: "@id" }}
                })
            };
        }]);
}());