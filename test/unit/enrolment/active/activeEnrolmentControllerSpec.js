describe('ActiveEnrolmentController', function () {
    beforeEach(module('app.enrolment'));

    var ctrl;
    var scope;
    var translate;
    var mockEnrolment;

    beforeEach(module('pascalprecht.translate', function ($translateProvider) {
        $translateProvider
            .translations('en', {})
            .preferredLanguage('fi');
    }));

    beforeEach(inject(function ($rootScope, $componentController, $translate) {
        scope = $rootScope.$new();
        translate = $translate;
        mockEnrolment = getMockEnrolment();
        ctrl = $componentController('activeEnrolment', {
                $scope: scope,
                dialogs: {},
                Enrolment: {},
                Reservation: {},
                toast: {}
            }, {
                enrolment: mockEnrolment
            }
        );
    }));

    it('should have room instructions', function () {
        expect(ctrl.getRoomInstruction()).toBe('Room instruction');
    });

    it('should have room instructions in english', function () {
        translate.use("en");
        expect(ctrl.getRoomInstruction()).toBe('Room instruction EN');
    });

    it('should have external room instructions', function () {
        mockEnrolment.reservation.machine = null;
        mockEnrolment.reservation.externalReservation = getMockExternalReservation();
        expect(ctrl.getRoomInstruction()).toBe('External room instruction');
    });

    it('should have external room instructions in english', function () {
        translate.use("en");
        mockEnrolment.reservation.machine = null;
        mockEnrolment.reservation.externalReservation = getMockExternalReservation();
        expect(ctrl.getRoomInstruction()).toBe('External room instruction EN');
    });

    function getMockEnrolment() {
        return {
            id: 1,
            enrolledOn: 1512989481814,
            exam: {
                id: 1,
                created: 1511434280192
            },
            externalExam: null,
            information: null,
            objectVersion: 1,
            reservation: {
                id: 1,
                startAt: 1513321620000,
                endAt: 1513324320000,
                externalRef: null,
                externalReservation: null,
                machine: {
                    id: 1,
                    name: "Machine1",
                    room: {
                        id: 1,
                        name: "Room1",
                        roomCode: "1234",
                        roomInstruction: "Room instruction",
                        roomInstructionEN: "Room instruction EN",
                        roomInstructionSV: "Room instruction SV",
                        localTimezone: "Europe/Helsinki"
                    }
                },
                occasion: {
                    startAt: "09:07",
                    endAt: "09:52"
                }
            }
        }
    }

    function getMockExternalReservation() {
        return {
            id: 541,
            orgRef: "ee48cddc0543130b34e091470b001a7f",
            roomRef: "f471545f1bb003cd962c4ec176001c90",
            machineName: "Markka",
            roomName: "Markan konesali",
            roomCode: "code123",
            roomInstruction: "External room instruction",
            roomInstructionEN: "External room instruction EN",
            roomInstructionSV: "External room instruction SV"
        }
    }

});