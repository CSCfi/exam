// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, NEVER, of, Subject } from 'rxjs';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { RoomService } from './room.service';

describe('RoomService', () => {
    let service: RoomService;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };
    const dialogs = { open$: vi.fn() };
    const modalResult = new Subject<unknown>();
    const modalRef = {
        componentInstance: { outOfService: { set: vi.fn() }, exceptions: { set: vi.fn() }, timeZone: { set: vi.fn() } },
    };
    const modal = { openRef: vi.fn(() => modalRef), result$: vi.fn(() => modalResult) };

    const room = () => ({ id: 3, state: 'ACTIVE', examMachines: [] }) as unknown as ExamRoom;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: ModalService, useValue: modal },
            ],
        });
        service = TestBed.inject(RoomService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('disabling a room', () => {
        it('should inactivate it once confirmed', () => {
            dialogs.open$.mockReturnValue(of(true));
            const r = room();

            service.disableRoom(r);
            const req = http.expectOne('/app/rooms/3');
            expect(req.request.method).toBe('DELETE');
            req.flush({});

            expect(r.state).toBe('INACTIVE');
            expect(toast.info).toHaveBeenCalledWith('i18n_room_inactivated');
        });

        it('should do nothing unless confirmed', () => {
            dialogs.open$.mockReturnValue(NEVER);
            const r = room();

            service.disableRoom(r);

            http.expectNone('/app/rooms/3');
            expect(r.state).toBe('ACTIVE');
        });

        it('should keep the state and show the error when it fails', () => {
            dialogs.open$.mockReturnValue(of(true));
            const r = room();

            service.disableRoom(r);
            http.expectOne('/app/rooms/3').flush('i18n_error', { status: 500, statusText: 'Error' });

            expect(r.state).toBe('ACTIVE');
            expect(toast.error).toHaveBeenCalledWith('i18n_error');
        });
    });

    it('should activate a room', () => {
        const r = { ...room(), state: 'INACTIVE' } as ExamRoom;

        service.enableRoom(r);
        const req = http.expectOne('/app/rooms/3');
        expect(req.request.method).toBe('POST');
        req.flush({});

        expect(r.state).toBe('ACTIVE');
    });

    it('should send only the selected starting hours', async () => {
        const hours = [
            { startingHour: '8:00', selected: true },
            { startingHour: '9:00', selected: false },
            { startingHour: '10:00', selected: true },
        ];

        const done = firstValueFrom(service.updateStartingHours$(hours, [3, 4]));
        const req = http.expectOne('/app/startinghours');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ hours: ['8:00', '10:00'], roomIds: [3, 4] });
        req.flush({});
        await done;

        expect(toast.info).toHaveBeenCalledWith('i18n_exam_starting_hours_updated');
    });

    it('should show why saving starting hours failed', async () => {
        const failed = firstValueFrom(service.updateStartingHours$([], [3]));
        http.expectOne('/app/startinghours').flush('i18n_error_access_forbidden', {
            status: 403,
            statusText: 'Forbidden',
        });

        await expect(failed).rejects.toBeDefined();
        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
    });

    it('should add exceptions to the given rooms', async () => {
        const exception = {
            id: 0,
            startDate: '2030-06-12T08:00:00Z',
            endDate: '2030-06-12T12:00:00Z',
            outOfService: true,
        };

        const done = firstValueFrom(service.addExceptions$([3, 4], [exception]));
        const req = http.expectOne('/app/exception');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ roomIds: [3, 4], exceptions: [exception] });
        req.flush([]);
        await done;

        expect(toast.info).toHaveBeenCalledWith('i18n_exception_time_added');
    });

    it('should delete an exception', async () => {
        const done = firstValueFrom(service.deleteException$(3, 9));
        const req = http.expectOne('/app/rooms/3/exception/9');
        expect(req.request.method).toBe('DELETE');
        req.flush('');
        await done;

        expect(toast.info).toHaveBeenCalledWith('i18n_exception_time_removed');
    });

    it('should open the exception dialog with the given state and pass on its result', () => {
        const callback = vi.fn();
        const existing = [{ id: 1, startDate: 'a', endDate: 'b', outOfService: false }];

        service.openExceptionDialog(callback, false, existing, 'Asia/Tokyo');
        modalResult.next([{ id: 2 }]);

        expect(modalRef.componentInstance.outOfService.set).toHaveBeenCalledWith(false);
        expect(modalRef.componentInstance.exceptions.set).toHaveBeenCalledWith(existing);
        expect(modalRef.componentInstance.timeZone.set).toHaveBeenCalledWith('Asia/Tokyo');
        expect(callback).toHaveBeenCalledWith([{ id: 2 }]);
    });

    it('should tell whether a room has machines', () => {
        expect(service.isAnyExamMachines(room())).toBe(false);
        expect(service.isAnyExamMachines({ ...room(), examMachines: [{ id: 1 }] } as ExamRoom)).toBe(true);
    });
});
