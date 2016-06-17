(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("AttachmentRes", ['$resource', function ($resource) {
            return {
                questionAttachment: $resource(
                    "/app/attachment/question/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", params: {id: "@id"}},
                        "insert": {method: "POST", params: {id: "@id"}},
                        "remove": {method: "DELETE", params: {id: "@id"}}
                    }),
                questionAnswerAttachment: $resource(
                    "/app/attachment/question/:qid/answer/:hash",
                    {
                        qid: "@qid",
                        hash: "@hash"
                    },
                    {
                        "get": {method: "GET", params: {qid: "@qid", hash: "@hash"}},
                        "insert": {method: "POST", params: {qid: "@qid", hash: "@hash"}},
                        "remove": {method: "DELETE", params: {qid: "@qid", hash: "@hash"}}
                    }),
                examAttachment: $resource(
                    "/app/attachment/exam/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", params: {id: "@id"}},
                        "insert": {method: "POST", params: {id: "@id"}},
                        "remove": {method: "DELETE", params: {id: "@id"}}
                    }),
                feedbackAttachment: $resource(
                    "/app/attachment/exam/:id/feedback",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", params: {eid: "@id"}},
                        "insert": {method: "POST", params: {eid: "@id"}},
                        "remove": {method: "DELETE", params: {eid: "@id"}}
                    }),
                statementAttachment: $resource(
                    "/app/attachment/exam/:id/statement",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", params: {eid: "@id"}},
                        "insert": {method: "POST", params: {eid: "@id"}},
                        "remove": {method: "DELETE", params: {eid: "@id"}}
                    })
            };
        }]);
}());
