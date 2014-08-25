(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("AdminReservationResource", ['$resource', function ($resource) {
            return {
                reservationListing: $resource(
                    "/reservations/list/:userId/:roomId/:examId",
                    {
                        userId: "@userId",
                        roomId: "@roomId",
                        examId: "@examId"
                    },
                    {
                        "get": {method: "GET", params: {userId: "userId", roomId: "roomId", examId: "examId"}}
                    }),
                reservationDeletion: $resource(
                    "/reservations/delete/:reservationid",
                    {
                        id: "@reservationId"
                    },
                    {
                        "remove": {method: "DELETE", params: { id: "id"}}
                    }),
                students: $resource(
                    "/admin/students", null,
                    {

                    })
            }
        }]);
}());