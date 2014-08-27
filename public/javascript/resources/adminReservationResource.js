(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("AdminReservationResource", ['$resource', function ($resource) {
            return {
                reservationListing: $resource(
                    "/admin/reservations/list/:userId/:roomId/:examId",
                    {
                        userId: "@userId",
                        roomId: "@roomId",
                        examId: "@examId"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {userId: "userId", roomId: "roomId", examId: "examId"}}
                    }),
                reservationListingByStudent: $resource(
                    "/admin/reservations/list/student/:userId/",
                    {
                        userId: "@userId"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {userId: "userId"}}
                    }),
                reservationListingByRoom: $resource(
                    "/admin/reservations/list/room/:roomId/",
                    {
                        roomId: "@roomId"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {roomId: "roomId"}}
                    }),
                reservationListingByExam: $resource(
                    "/admin/reservations/list/exam/:examId/",
                    {
                        examId: "@examId"
                    },
                    {
                        "query": {method: "GET", isArray:true, params: {examId: "examId"}}
                    }),


                reservationDeletion: $resource(
                    "/admin/reservations/delete/:id",
                    {
                        id: "@id"
                    },
                    {
                        "remove": {method: "DELETE", params: { id: "id"}}

                    }),
                students: $resource(
                    "/admin/students", null,
                    {

                    }),
                exams: $resource(
                    "/admin/exams", null,
                    {

                    }),
                examrooms: $resource(
                    "/admin/examrooms", null,
                    {

                    })
            }
        }]);
}());