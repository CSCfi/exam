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
                    "deleteSection": {
                        method: "DELETE", params: { sectionId: "@sectionId"}
                    }

                }),
                
                userexams: $resource("/exams/user",
                {
                }),
                
                draft: $resource("/draft", null,
        		{
        		}),
 
        		events: $resource("/events/:id",
                {
        			id: "@id"
                },
                {
                    "insertEvent": 	{method: "POST", params: { id: "@id"}},
                    "update": 		{method: "PUT", params: { id: "@id"}}

                })
            }
        }]);
}());