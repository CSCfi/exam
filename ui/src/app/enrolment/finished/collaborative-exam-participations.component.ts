// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CollaborativeParticipation } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ExamParticipationComponent } from './exam-participation.component';

@Component({
    selector: 'xm-collaborative-exam-participations',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './exam-participations.component.html',
    imports: [
        FormsModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        ExamParticipationComponent,
        PaginatorComponent,
        SlicePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class CollaborativeParticipationsComponent {
    collaborative = true;
    originals = signal<CollaborativeParticipation[]>([]);
    participations = signal<CollaborativeParticipation[]>([]);
    pageSize = signal(10);
    currentPage = signal(0);
    filter = signal({ ordering: 'ended' as 'exam.name' | 'ended', reverse: true, text: '' });
    searchDone = signal(false);

    private toast = inject(ToastrService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.Enrolment.listStudentParticipations$().subscribe({
            next: (participations: CollaborativeParticipation[]) => {
                participations
                    .filter((p) => typeof p.ended == 'number')
                    .forEach((p) => (p.ended = new Date(p.ended).toISOString()));
                this.originals.set(participations);
                this.search('');
            },
            error: (err) => this.toast.error(err),
        });
    }

    // Getter/setter for filter.text to work with ngModel
    get filterText(): string {
        return this.filter().text;
    }
    set filterText(value: string) {
        this.filter.update((f) => ({ ...f, text: value }));
    }

    pageSelected = ($event: { page: number }) => this.currentPage.set($event.page);

    search(text: string) {
        if (!text || text.length < 1) {
            this.participations.set(this.originals());
        } else {
            this.participations.set(
                this.originals().filter((participation) => {
                    const exam = participation.exam;
                    return exam.name?.toLowerCase().includes(text.toLowerCase());
                }),
            );
        }
        this.searchDone.set(true);
    }

    updateFilterOrdering(ordering: 'exam.name' | 'ended', reverse: boolean) {
        this.filter.update((f) => ({ ...f, ordering, reverse }));
    }
}
