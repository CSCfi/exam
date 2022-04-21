import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { Organisation } from '../calendar.component';

@Component({
    selector: 'xm-calendar-organisation-picker',
    template: `
        <div class="row student-enrolment-wrapper details-view row" [ngClass]="selectedOrganisation ? '' : 'notactive'">
            <div class="col-md-12">
                <div class="row">
                    <span class="col-md-11 col-9">
                        <span class="calendar-phase-title">
                            {{ sequenceNumber }}. {{ 'sitnet_choose_institution' | translate }}
                            <small class="col-12 pl-0">
                                <button class="btn btn-sm btn-outline-dark" (click)="makeInternalReservation()">
                                    {{ 'sitnet_internal_reservation' | translate }}&nbsp;
                                </button>
                            </small>
                        </span>
                    </span>
                    <span class="col-md-1 col-3">
                        <span class="calendar-phase-icon float-right" *ngIf="selectedOrganisation">
                            <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="choose institution" />
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

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http
            .get<Organisation[]>('/app/iop/organisations')
            .subscribe(
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
