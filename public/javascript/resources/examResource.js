(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("ExamRes", ['$resource', function ($resource) {
            return {
                exams: $resource("/exams/:id", 
                {
                	id: "@id"
                },
                {
                    "update": {method: "PUT"},
                    "remove": {method: "DELETE"}
                }),
                
                questions: $resource("/exams/:eid/section/:sid/question/:qid", 
                {
                	eid: "@eid", sid: "@sid", qid: "@qid"
                },
                {
                    "query":  {method: "GET"},
                    "get":    {method: "GET", params: {eid: "@eid"}},
                    "update": {method: "PUT"},
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid", qid: "@qid"}},
                    "remove": {method: "DELETE", params: { eid: "@eid" , sid: "@sid", qid: "@qid"}}
                }),
                
                sections: $resource("/exams/:eid/section/:sid",
                {
                    eid: "@eid", sid: "@sid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid"}},
                	"remove": {method: "DELETE", params: { eid: "@eid" , sid: "@sid"}},
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@sid"}}

                }),
                section: $resource("/section/:sectionId",
                {
                    sectionId: "@sectionId"
                },
                {
                    "deleteSection": {method: "DELETE", params: { sectionId: "@sectionId"}}

                }),

                examsByState: $resource("/exams/state/:state",
                {
                    state: "@state"
                }),
                
                draft: $resource("/draft", null,
        		{
        		}),

                review: $resource("/review/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"}
                }),

                comment: $resource("/review/:eid/comment/:cid",
                {
                    id: "@eid", cid: "@cid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" }},
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@cid"}}
                })
            }
        }]);
}());