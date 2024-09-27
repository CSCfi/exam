import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Organisation } from 'src/app/calendar/calendar.service';
import { CalendarService } from 'src/app/calendar/calendar.service';

@Component({
    selector: 'xm-calendar-organisation-picker',
    template: `
        <div
            class="row m-2 details-view"
            [ngClass]="selectedOrganisation() ? 'xm-study-item-container' : 'xm-study-item-container--inactive'"
        >
            <div class="col-md-12">
                <div class="row">
                    <span class="col-md-11 col-9">
                        <h2 class="calendar-phase-title">
                            {{ sequenceNumber }}. {{ 'i18n_choose_institution' | translate }}
                        </h2>
                    </span>
                    <span class="col-md-1 col-3">
                        @if (selectedOrganisation()) {
                            <span class="calendar-phase-icon float-end">
                                <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                            </span>
                        }
                    </span>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="row mt-2">
                            <div class="col student-exam-row-title">
                                <span ngbDropdown>
                                    <button
                                        [disabled]="disabled"
                                        ngbDropdownToggle
                                        class="btn btn-outline-secondary"
                                        type="button"
                                        id="dropDownMenu21"
                                        aria-haspopup="true"
                                        aria-expanded="true"
                                    >
                                        {{ 'i18n_faculty_name' | translate }}&nbsp;
                                    </button>
                                    <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu21">
                                        @for (org of organisations(); track org.code) {
                                            <li
                                                ngbDropdownItem
                                                [hidden]="org.filtered"
                                                role="presentation"
                                                (click)="setOrganisation(org)"
                                            >
                                                <a role="menuitem">{{ org.code }}&nbsp;({{ org.name }})</a>
                                            </li>
                                        }
                                    </ul>
                                </span>
                            </div>
                            <div class="col">
                                <div class="col-12 ps-0">
                                    <button class="btn btn-outline-secondary" (click)="makeInternalReservation()">
                                        {{ 'i18n_internal_reservation' | translate }}&nbsp;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Selected organisation  -->
                @if (selectedOrganisation()) {
                    <div class="row">
                        <div class="col-md-12">
                            <div class="calendar-room-title">
                                <span
                                    >{{ selectedOrganisation()?.name }}&nbsp;({{ selectedOrganisation()?.code }})</span
                                >
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    `,
    styleUrls: ['../calendar.component.scss'],
    standalone: true,
    imports: [NgClass, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, TranslateModule],
})
export class OrganisationPickerComponent implements OnInit {
    @Input() sequenceNumber = 0;
    @Input() disabled = false;
    @Output() selected = new EventEmitter<Organisation>();
    @Output() cancelled = new EventEmitter<void>();

    organisations = signal<Organisation[]>([]);
    selectedOrganisation = signal<Organisation | undefined>(undefined);

    constructor(private Calendar: CalendarService) {}

    ngOnInit() {
        this.Calendar.listOrganisations$().subscribe((resp) =>
            this.organisations.set(resp.filter((org) => !org.homeOrg && org.facilities.length > 0)),
        );
    }

    setOrganisation = (organisation: Organisation) => {
        const orgs = this.organisations().map((o) => ({ ...o, filtered: false }));
        const i = this.organisations().findIndex((o) => o._id === organisation._id);
        this.organisations.set(orgs.splice(i, 1, { ...orgs[i], filtered: true }));
        this.selectedOrganisation.set({ ...organisation, filtered: true });
        this.selected.emit(organisation);
    };

    makeInternalReservation = () => this.cancelled.emit();
}
