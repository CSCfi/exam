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

                sectionquestions: $resource("/exams/:eid/section/:sid/:seq/question/:qid",
                {
                    eid: "@eid", sid: "@sid", seq: "@seq", qid: "@qid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , sid: "@sid", seq: "@seq", qid: "@qid"}}

                }),
                reordersection: $resource("/exams/:eid/section/:sid/:from/:to",
                {
                    eid: "@eid", sid: "@sid", from: "@from", to: "@to"
                },
                {
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@sid", from: "@from", to: "@to"}}
                }),
                clearsection: $resource("/clearsection/:sid",
                {
                    sid: "@sid"
                },
                {
                	"clear": {method: "DELETE", params: {sid: "@sid"}}
                }),

                course: $resource("/exams/:eid/course/:cid",
                {
                    eid: "@eid", sid: "@cid"
                },
                {
                    "update": {method: "PUT", params: { eid: "@eid" , cid: "@cid"}}
                }),

                courses: $resource("/courses/insert/:code",
                {
                    code: "@code"
                },
                {
                    "insert": {method: "POST", params: { code: "@code"}}
                }),

                room: $resource("/exams/:eid/room/:rid",
                {
                    eid: "@eid", rid: "@rid"
                },
                {
                    "update": {method: "PUT", params: { eid: "@eid" , cid: "@cid"}}
                }),

                examType: $resource("/exams/:eid/examtype/:etid",
                {
                    eid: "@eid", etid: "@etid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid", etid: "@etid" }}
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

                activeExams: $resource("/activeexams", null,
                {
                }),

                reviewerExams: $resource("/reviewerexams", null,
                {
                }),

                reviewerExam: $resource("/reviewerexams/:eid",
                {
                    eid: "@eid"

                }),
                finishedExams: $resource("/finishedexams", null,
                {
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

                examReviews: $resource("/reviews/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                comment: $resource("/review/:eid/comment/:cid",
                {
                    id: "@eid", cid: "@cid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" }},
                    "update": {method: "PUT", params: { eid: "@eid" , sid: "@cid"}}
                
                }),

                credit: $resource("/exam/:eid/credit/:credit",
                    {
                        id: "@eid", credit: "@credit"
                    },
                    {
                        "update": {method: "PUT", params: { eid: "@eid" , credit: "@credit"}}
                    }),

                inspections: $resource("/exam/:id/inspections",
                {
                    id: "@id"
                },
                {
                    "get": {method: "GET", isArray: true, params: { id: "@id" }}
                }),

                inspection: $resource("/exams/:eid/inspector/:uid",
                {
                    eid: "@eid", uid: "@uid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , uid: "@uid"}},
                    "remove": {method: "DELETE", params: { eid: "@eid" , uid: "@uid"}},
                    "update": {method: "PUT", params: { eid: "@eid" , uid: "@uid"}}
                }),

                inspectionReady: $resource("/exams/inspection/:id/:ready",
                {
                    id: "@id", ready: "@ready"
                },
                {
                    "update": {method: "PUT", params: { id: "@id" , ready: "@ready"}}
                }),


                localInspection: $resource("/exams/localInspection/:eid/:uid",
                {
                    eid: "@eid", uid: "@uid"
                },
                {
                    "insert": {method: "POST", params: { eid: "@eid" , uid: "@uid"}}
                }),

                inspector: $resource("/exams/inspector/:id",
                {
                    id: "@id"
                },
                {
                    "remove": {method: "DELETE", params: { id: "@id"}}
                }),

                examEnrolments: $resource("/examenrolments/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                examEnrolmentsWithReservations: $resource("/examenrolmentswithreservations/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                examParticipations: $resource("/examparticipations/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),
                examParticipationsOfUser: $resource("/examparticipations/:eid/:uid",
                {
                    eid: "@eid",
                    uid: "@uid"
                },
                {
                   "get": {method: "GET", params: { eid: "@eid", uid: "@uid"}}
                }),
                examParticipationsAndReviews: $resource("/examparticipationsandreviews/:eid",
                {
                    eid: "@eid"
                },
                {
                    "get": {method: "GET", params: { eid: "@eid" }}
                }),

                studentInfo: $resource("/review/info/:id",
                {
                    id: "@id"
                }),
                email: $resource("/email/inspection/:eid/:msg",
                {
                    eid: "@eid",
                    msg: "@msg"
                },
                {
                    inspection: {method: "POST", params: { eid: "@eid", msg: "@msg" }}
                }),

                saveRecord: $resource("/exam/record", null,
                {
                    "add": {method: "POST"}
                }),
                machines: $resource("exam/resetsoftware/:eid",
                {
                    eid: "@eid"
                },
                {
                    "reset": {method: "PUT"}
                }),

                languages: $resource("exam/:eid/languages",
                {
                    eid: "@eid"
                },
                {
                    "reset": {method: "DELETE"}
                }),

                machine: $resource("/exam/:eid/software/:sid",
                {
                    eid: "@eid",
                    sid: "@sid"
                },
                {
                    "add": {method: "PUT"}
                }),
                language: $resource("/exam/:eid/language/:code",
                {
                    eid: "@eid",
                    code: "@code"
                },
                {
                    "add": {method: "PUT"}
                })
            };
        }]);
}());