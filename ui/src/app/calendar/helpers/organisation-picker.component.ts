import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { Organisation } from '../calendar.service';
import { CalendarService } from '../calendar.service';

@Component({
    selector: 'xm-calendar-organisation-picker',
    template: `
        <div class="row student-enrolment-wrapper details-view row" [ngClass]="selectedOrganisation ? '' : 'notactive'">
            <div class="col-md-12">
                <div class="row">
                    <span class="col-md-11 col-9">
                        <h2 class="calendar-phase-title">
                            {{ sequenceNumber }}. {{ 'sitnet_choose_institution' | translate }}
                        </h2>
                    </span>
                    <span class="col-md-1 col-3">
                        <span class="calendar-phase-icon float-end" *ngIf="selectedOrganisation">
                            <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                        </span>
                    </span>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="row mart10">
                            <div class="col student-exam-row-title">
                                <span ngbDropdown>
                                    <button
                                        [disabled]="disabled"
                                        ngbDropdownToggle
                                        class="btn btn-outline-dark"
                                        type="button"
                                        id="dropDownMenu21"
                                        aria-haspopup="true"
                                        aria-expanded="true"
                                    >
                                        {{ 'sitnet_faculty_name' | translate }}&nbsp;
                                    </button>
                                    <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu21">
                                        <li
                                            ngbDropdownItem
                                            *ngFor="let org of organisations"
                                            [hidden]="org.filtered"
                                            role="presentation"
                                            (click)="setOrganisation(org)"
                                        >
                                            <a role="menuitem">{{ org.code }}&nbsp;({{ org.name }})</a>
                                        </li>
                                    </ul>
                                </span>
                            </div>
                            <div class="col">
                                <div class="col-12 ps-0">
                                    <button class="btn btn-outline-dark" (click)="makeInternalReservation()">
                                        {{ 'sitnet_internal_reservation' | translate }}&nbsp;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Selected organisation  -->
                <div class="row" *ngIf="selectedOrganisation">
                    <div class="col-md-12">
                        <div class="calendar-room-title">
                            <span>{{ selectedOrganisation?.name }}&nbsp;({{ selectedOrganisation?.code }})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class OrganisationPickerComponent implements OnInit {
    @Input() sequenceNumber = 0;
    @Input() disabled = false;
    @Output() selected = new EventEmitter<Organisation>();
    @Output() cancelled = new EventEmitter<void>();

    organisations: Organisation[] = [];
    selectedOrganisation?: Organisation;

    constructor(private Calendar: CalendarService) {}

    ngOnInit() {
        this.Calendar.listOrganisations$().subscribe(
            (resp) => (this.organisations = resp.filter((org) => !org.homeOrg && org.facilities.length > 0)),
        );
    }

    setOrganisation = (organisation: Organisation) => {
        this.organisations.forEach((o) => (o.filtered = false));
        organisation.filtered = true;
        this.selectedOrganisation = organisation;
        this.selected.emit(organisation);
    };

    makeInternalReservation = () => this.cancelled.emit();
}
