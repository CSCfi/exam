import { DatePipe, NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { MaintenancePeriod } from '../../exam/exam.model';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import type { OpeningHours } from '../calendar.service';
import { CalendarService } from '../calendar.service';

@Component({
    selector: 'xm-calendar-selected-room',
    template: `
        <div class="row">
            <div class="col-md-2 col-12 bold max-w-100perc">
                {{ room.name }}
            </div>
            <div class="col-md-10 col-12">
                {{ room.mailAddress.street }} {{ room.mailAddress.zip }}
                {{ room.mailAddress.city }}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-2 col-12">
                <div>{{ 'sitnet_room_default_working_hours' | translate }}</div>
                <div>
                    <small class="text-muted">({{ room.localTimezone }})</small>
                </div>
            </div>
            <div class="col-md-10 col-12">
                <div class="row" *ngFor="let oh of openingHours">
                    <div class="col-md-1 col-6">{{ oh.name | uppercase }}</div>
                    <div class="col-md-11 col-6">{{ oh.periodText }}</div>
                </div>
            </div>
        </div>
        <div class="row mt-2" *ngIf="maintenancePeriods.length > 0">
            <div class="col-md-2 col-12">{{ 'sitnet_maintenance_periods' | translate }}:</div>
            <div class="col-md-10 col-12">
                <div *ngFor="let period of maintenancePeriods | orderBy : 'startsAt'">
                    {{ period.startsAt | date : 'dd.MM.yyyy HH:mm' }} - {{ period.endsAt | date : 'dd.MM.yyyy HH:mm' }}
                    {{ period.description }}
                </div>
            </div>
        </div>
        <div class="row mt-2" *ngIf="exceptionHours.length > 0">
            <div class="col-md-2 col-12">{{ 'sitnet_exception_datetimes' | translate }}:</div>
            <div class="col-md-10 col-12">
                <div
                    *ngFor="let eh of exceptionHours"
                    [ngClass]="eh.outOfService ? 'text-danger' : 'text-success'"
                    triggers="mouseenter:mouseleave"
                    ngbPopover="{{ eh.description | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                >
                    {{ eh.start }} - {{ eh.end }}
                </div>
            </div>
        </div>
        <div class="row mt-2" *ngIf="getRoomInstructions()">
            <div class="col-md-2 col-12">{{ 'sitnet_instructions' | translate }}:</div>
            <div class="col-md-10 col-12">{{ getRoomInstructions() }}</div>
        </div>
        <div class="row mt-2" *ngIf="getRoomAccessibility()">
            <div class="col-md-2 col-12">{{ 'sitnet_room_accessibility' | translate }}:</div>
            <div class="col-md-10 col-12">{{ getRoomAccessibility() }}</div>
        </div>
    `,
    standalone: true,
    imports: [NgFor, NgIf, NgClass, NgbPopover, UpperCasePipe, DatePipe, TranslateModule, OrderByPipe],
})
export class SelectedRoomComponent implements OnInit, OnChanges {
    @Input() room!: ExamRoom;
    @Input() maintenancePeriods: MaintenancePeriod[] = [];
    @Input() viewStart = DateTime.now();

    openingHours: OpeningHours[] = [];
    exceptionHours: (ExceptionWorkingHours & { start: string; end: string; description: string })[] = [];

    constructor(private translate: TranslateService, private Calendar: CalendarService) {}

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
            default:
                return this.room.roomInstructionEN;
        }
    }

    getRoomAccessibility = () =>
        this.room.accessibilities ? this.room.accessibilities.map((a) => a.name).join(', ') : '';

    private init() {
        this.openingHours = this.Calendar.processOpeningHours(this.room);
        this.exceptionHours = this.Calendar.getExceptionHours(
            this.room,
            this.viewStart,
            this.viewStart.plus({ week: 1 }),
        );
    }
}
