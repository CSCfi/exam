import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { addWeeks } from 'date-fns';

import { ExamRoom } from '../../reservation/reservation.model';
import { CalendarService } from '../calendar.service';

import type { ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { OpeningHours } from '../calendar.service';

@Component({
    selector: 'calendar-selected-room',
    template: `
        <div class="row">
            <div class="col-md-3 col-12">
                <strong>{{ room.name }}</strong>
            </div>
            <div class="col-md-9 col-12">
                {{ room.mailAddress.street }} {{ room.mailAddress.zip }}
                {{ room.mailAddress.city }}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3 col-12">
                <div>{{ 'sitnet_room_default_working_hours' | translate }}</div>
                <div>
                    <small class="text-muted">({{ room.localTimezone }})</small>
                </div>
            </div>
            <div class="col-md-9 col-12">
                <div *ngFor="let oh of openingHours">{{ oh.name | uppercase }}: {{ oh.periodText }}</div>
                <div></div>
            </div>
        </div>
        <div class="row mt-2" *ngIf="exceptionHours?.length > 0">
            <div class="col-md-3 col-12">{{ 'sitnet_exception_datetimes' | translate }}:</div>
            <div class="col-md-9 col-12">
                <div
                    *ngFor="let eh of exceptionHours"
                    [ngClass]="eh.outOfService ? 'text-danger' : 'text-success'"
                    triggers="mouseenter:mouseleave"
                    ngbPopover="{{ eh.description | translate }}"
                >
                    {{ eh.start }} - {{ eh.end }}
                </div>
            </div>
        </div>
        <div class="row mt-2" *ngIf="getRoomInstructions()">
            <div class="col-md-3 col-12">{{ 'sitnet_instructions' | translate }}:</div>
            <div class="col-md-9 col-12">{{ getRoomInstructions() }}</div>
        </div>
        <div class="row mt-2" *ngIf="getRoomAccessibility()">
            <div class="col-md-3 col-12">{{ 'sitnet_accessibility' | translate }}:</div>
            <div class="col-md-9 col-12">{{ getRoomAccessibility() }}</div>
        </div>
    `,
})
export class SelectedRoomComponent {
    @Input() room: ExamRoom;
    @Input() viewStart: Date;

    openingHours: OpeningHours[] = [];
    exceptionHours: (ExceptionWorkingHours & { start: string; end: string; description: string })[] = [];

    constructor(private translate: TranslateService, private Calendar: CalendarService) {}

    private init() {
        this.openingHours = this.Calendar.processOpeningHours(this.room);
        this.exceptionHours = this.Calendar.getExceptionHours(this.room, this.viewStart, addWeeks(this.viewStart, 1));
    }

    ngOnInit() {
        this.translate.onLangChange.subscribe(() => {
            this.openingHours = this.Calendar.processOpeningHours(this.room);
        });
    }

    ngOnChanges() {
        this.init();
    }

    getRoomInstructions(): string | undefined {
        switch (this.translate.currentLang) {
            case 'fi':
                return this.room.roomInstruction;
            case 'sv':
                return this.room.roomInstructionSV;
            case 'en':
            /* falls through */
            default:
                return this.room.roomInstructionEN;
        }
    }

    getRoomAccessibility = () =>
        this.room.accessibilities ? this.room.accessibilities.map((a) => a.name).join(', ') : '';
}
