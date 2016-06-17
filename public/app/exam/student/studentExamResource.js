(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("StudentExamRes", ['$resource', function ($resource) {
            return {
                examInfo: $resource("/app/student/exam/:eid", {eid: "@eid"}),
                exams: $resource("/app/student/exams/:hash",
                {
                    hash: "@hash"
                },
                {
                    "update": {
                        method: "PUT",
                        params: { hash: "@hash" }}
                }),

                finishedExams: $resource("/app/student/finishedexams"),
                enrolments: $resource("/app/enrolments"),
                enrolment: $resource("/app/enrolments/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }},
                    "update": {method: "PUT", params: { eid: "@eid" }}
                }),

                exam: $resource("/app/student/exam/abort/:hash",
                {
                    hash: "@hash"
                },
                {
                    "abort": {
                        method: "PUT",
                        params: { hash: "@hash" }}
                }),

                feedback: $resource("/app/feedback/exams/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),
                scores: $resource("/app/feedback/exams/:eid/score", {eid: "@eid"}),
                multipleChoiceAnswer: $resource("/app/student/exams/:hash/question/:qid/option/",
                {
                    hash: "@hash", qid: "@qid"
                },
                {
                    "saveMultipleChoice": {
                        method: "POST", params: { hash: "@hash", qid: "@qid"}, isArray: true
                    }
                }),

                essayAnswer: $resource("/app/student/exams/:hash/question/:qid", {
                    hash: "@hash", qid: "@qid", oid: "@oid"
                },
                {
                    "saveEssay": {
                        method: "POST", params: { hash: "@hash", qid: "@qid" }
                    }
                }),
                teachers: $resource("/app/student/inspectors/exam/:id",
                {
                    id: "@id"
                },
                {
                    "get": { method: "GET", isArray:true, params: { id: "@id" }}
                }),
                reservationInstructions: $resource("/app/student/exams/:id",
                {
                    id: "@id"
                },
                {
                    "get": { method: "GET", isArray:false, params: { id: "@id" }}
                })
            };
        }]);
}());
