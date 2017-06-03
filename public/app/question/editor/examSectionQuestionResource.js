'use strict';
angular.module('app.question')
    .factory("ExamSectionQuestionRes", ['$resource', function ($resource) {
        return {
            undistributed: $resource("/app/examquestions/undistributed/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT", params: {id: "@id"}}
                }),
            distributed: $resource("/app/examquestions/distributed/:id",
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
