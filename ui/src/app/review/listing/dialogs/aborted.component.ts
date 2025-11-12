// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Review } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DiffInMinutesPipe } from 'src/app/shared/date/minute-diff.pipe';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-aborted-exams',
    imports: [
        TranslateModule,
        DatePipe,
        DiffInMinutesPipe,
        ApplyDstPipe,
        LowerCasePipe,
        OrderByPipe,
        TableSortComponent,
    ],
    templateUrl: './aborted.component.html',
    styleUrls: ['../review-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbortedExamsComponent {
    abortedPredicate = signal('started');
    reverse = signal(false);

    private _exam = signal<Exam | undefined>(undefined);
    private _abortedExams = signal<Review[]>([]);

    private modal = inject(NgbActiveModal);
    private translate = inject(TranslateService);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private Session = inject(SessionService);

    get exam() {
        return this._exam()!;
    }

    get abortedExams() {
        return this._abortedExams();
    }

    @Input()
    set exam(value: Exam) {
        this._exam.set(value);
    }

    @Input()
    set abortedExams(value: Review[]) {
        this._abortedExams.set(value);
    }

    showId() {
        return this.Session.getUser().isAdmin && this.exam.anonymous;
    }

    permitRetrial(enrolment: ExamEnrolment) {
        this.http.put(`/app/enrolments/${enrolment.id}/retrial`, {}).subscribe(() => {
            enrolment.retrialPermitted = true;
            this.toast.info(this.translate.instant('i18n_retrial_permitted'));
        });
    }

    cancel() {
        this.modal.dismiss();
    }

    setPredicate(predicate: string) {
        if (this.abortedPredicate() === predicate) {
            this.reverse.update((v) => !v);
        }
        this.abortedPredicate.set(predicate);
    }
}
