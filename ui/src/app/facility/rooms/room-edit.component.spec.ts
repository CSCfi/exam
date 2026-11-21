// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { RoomEditComponent } from './room-edit.component';

describe('RoomEditComponent', () => {
    let component: RoomEditComponent;
    let fixture: ComponentFixture<RoomEditComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };

    const room = {
        id: 3,
        name: 'Pegasus',
        roomCode: 'IT101',
        buildingName: 'Main',
        campus: 'Linnanmaa',
        externalRef: null,
        examMachines: [],
        defaultWorkingHours: [],
        calendarExceptionEvents: [],
        examStartingHours: [],
        accessibilities: [],
        mailAddress: { id: 1, street: '', zip: '', city: '' },
    };

    const create = (loaded: object = room) => {
        fixture = TestBed.createComponent(RoomEditComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/settings/iop/examVisit').flush({ isExamVisitSupported: true });
        http.expectOne('/app/rooms/3').flush(loaded);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [RoomEditComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn() } },
                { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 3 } } } },
            ],
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should load the room and whether exam visits are supported', () => {
        create();

        expect(component.room()?.name).toBe('Pegasus');
        expect(component.room()?.availableForExternals).toBe(false);
        expect(component.isInteroperable()).toBe(true);
        expect(component.roomDetailsForm.roomCode().value()).toBe('IT101');
    });

    it('should mark a shared room available for externals', () => {
        create({ ...room, externalRef: 'facility-1' });
        expect(component.room()?.availableForExternals).toBe(true);
    });

    describe('saving', () => {
        beforeEach(() => create());

        it('should save the form values and return to the rooms', () => {
            component.roomDetailsForm.campus().value.set('Kontinkangas');

            component.saveRoom();
            const req = http.expectOne('/app/rooms/3');
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toMatchObject({ roomCode: 'IT101', campus: 'Kontinkangas' });
            req.flush('');

            expect(router.navigate).toHaveBeenCalledWith(['/staff/rooms']);
        });

        it('should remind about a room without machines', () => {
            component.saveRoom();
            http.expectOne('/app/rooms/3').flush('');

            expect(toast.error).toHaveBeenCalledWith('i18n_dont_forget_to_add_machines Pegasus');
        });

        it('should require a room code', () => {
            component.roomDetailsForm.roomCode().value.set('');

            component.saveRoom();
            component.validateAndUpdateRoom();

            http.expectNone('/app/rooms/3');
        });

        it('should save going out of service at once', () => {
            component.updateOutOfService(true);

            const req = http.expectOne('/app/rooms/3');
            expect(req.request.body.outOfService).toBe(true);
            req.flush('');
            expect(toast.info).toHaveBeenCalledWith('i18n_room_updated');
        });
    });

    describe('sharing with other organisations', () => {
        beforeEach(() => create());

        it('should take the reference XM gives', () => {
            component.updateRoomProperty('availableForExternals', true);
            component.updateInteroperability();

            http.expectOne('/app/iop/facilities/3').flush({ externalRef: 'facility-1' });
            expect(component.room()?.externalRef).toBe('facility-1');
            expect(component.room()?.availableForExternals).toBe(true);
        });

        it('should undo the switch and show why when sharing fails', () => {
            component.updateRoomProperty('availableForExternals', true);
            component.updateInteroperability();

            http.expectOne('/app/iop/facilities/3').flush('i18n_connection_refused', {
                status: 500,
                statusText: 'Error',
            });
            expect(component.room()?.availableForExternals).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('i18n_connection_refused');
        });
    });

    it('should toggle the password fields between hidden and shown', () => {
        create();

        component.toggleInternalPasswordInputType();
        expect(component.internalPasswordInputType()).toBe('text');
        component.toggleInternalPasswordInputType();
        expect(component.internalPasswordInputType()).toBe('password');
    });
});
