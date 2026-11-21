// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { WorkingHour } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';
import { vi } from 'vitest';
import { StartingTimeComponent } from './starting-time.component';

describe('StartingTimeComponent', () => {
    let component: StartingTimeComponent;
    let fixture: ComponentFixture<StartingTimeComponent>;
    const rooms = { updateStartingHours$: vi.fn(() => of(undefined)) };

    const create = (startingHours: WorkingHour[] = []) => {
        fixture = TestBed.createComponent(StartingTimeComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('roomIds', [3]);
        fixture.componentRef.setInput('startingHours', startingHours);
        fixture.detectChanges();
    };

    const selected = () =>
        component
            .examStartingHours()
            .filter((h) => h.selected)
            .map((h) => h.startingHour);

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [StartingTimeComponent, TranslateModule.forRoot()],
            providers: [provideZonelessChangeDetection(), { provide: RoomService, useValue: rooms }],
        });
    });

    it('should select every full hour of a room without starting hours', () => {
        create();

        expect(component.examStartingHours().length).toBe(24);
        expect(selected().length).toBe(24);
        expect(component.examStartingHourOffset()).toBe(0);
    });

    it('should show the room hours with their offset', () => {
        create([
            { startingHour: '8:15', selected: true },
            { startingHour: '12:15', selected: true },
        ]);

        expect(component.examStartingHourOffset()).toBe(15);
        expect(selected()).toEqual(['8:15', '12:15']);
        expect(component.examStartingHours()[0].startingHour).toBe('0:15');
    });

    it('should move every hour to a new offset', () => {
        create();

        component.setExamStartingHourOffset(5);
        component.setStartingHourOffset();

        expect(component.examStartingHours()[9].startingHour).toBe('9:05');
    });

    it('should toggle all hours off and on', () => {
        create([{ startingHour: '8:00', selected: true }]);

        component.toggleAllExamStartingHours();
        expect(component.anyStartingHoursSelected()).toBe(false);
        expect(component.unsavedProgress()).toBe(true);

        component.toggleAllExamStartingHours();
        expect(selected().length).toBe(24);
    });

    it('should toggle one hour', () => {
        create();

        component.toggleHourSelected(component.examStartingHours()[3]);

        expect(selected()).not.toContain('3:00');
        expect(component.unsavedProgress()).toBe(true);
    });

    it('should save the hours and clear the unsaved state', () => {
        create();
        component.toggleHourSelected(component.examStartingHours()[3]);

        component.updateStartingHours();

        expect(rooms.updateStartingHours$).toHaveBeenCalledWith(component.examStartingHours(), [3]);
        expect(component.unsavedProgress()).toBe(false);
    });
});
