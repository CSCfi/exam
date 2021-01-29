import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Organisation } from '../calendar.component';

@Component({
    selector: 'calendar-organisation-picker',
    template: `
        <div class="student-enrolment-wrapper details-view row" [ngClass]="selectedOrganisation ? '' : 'notactive'">
            <span class="col-md-12">
                <span class="calendar-phase-title">
                    {{ sequenceNumber }}. {{ 'sitnet_choose_institution' | translate }}
                    <small>
                        <button class="btn btn-sm btn-success btn-link" (click)="makeInternalReservation()">
                            {{ 'sitnet_internal_reservation' | translate }}&nbsp;
                            <i class="bi-chevron-double-right"></i>
                        </button>
                    </small>
                </span>
                <span class="calendar-phase-icon pull-right">
                    <img class="arrow_icon" src="/assets/assets/images/icon-phase.png" alt="choose institution" />
                </span>
            </span>
            <div class="col-md-12">
                <div class="row">
                    <div class="col-1 student-exam-row-title">
                        <span ngbDropdown>
                            <button
                                [disabled]="disabled"
                                ngbDropdownToggle
                                class="btn btn-default"
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
                </div>
            </div>
        </div>

        <!-- Selected organisation  -->
        <div id="calendar" class="row selected-room-container" *ngIf="selectedOrganisation">
            <div class="col-md-12">
                <div class="calendar-room-title">
                    <span>{{ selectedOrganisation.name }}&nbsp;({{ selectedOrganisation.code }})</span>
                </div>
            </div>
        </div>
    `,
})
export class OrganisationPickerComponent {
    @Input() sequenceNumber: number;
    @Input() disabled: boolean;
    @Output() onSelection = new EventEmitter<Organisation>();
    @Output() onCancel = new EventEmitter<void>();

    organisations: Organisation[] = [];
    selectedOrganisation?: Organisation;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http
            .get<Organisation[]>('/integration/iop/organisations')
            .subscribe(resp => (this.organisations = resp.filter(org => !org.homeOrg && org.facilities.length > 0)));
    }

    setOrganisation = (organisation: Organisation) => {
        this.organisations.forEach(o => (o.filtered = false));
        organisation.filtered = true;
        this.selectedOrganisation = organisation;
        this.onSelection.emit(organisation);
    };

    makeInternalReservation = () => this.onCancel.emit();
}
