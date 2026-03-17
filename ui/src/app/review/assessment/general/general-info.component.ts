// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';

import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { NoShowComponent } from './no-show.component';
import { ParticipationComponent } from './participation.component';

type Participation = Omit<ExamParticipation, 'exam'> & { exam: Partial<Exam> };

@Component({
    selector: 'xm-r-general-info',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './general-info.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [ParticipationComponent, NoShowComponent, MathDirective, DatePipe, TranslateModule, ApplyDstPipe],
})
export class GeneralInfoComponent {
    readonly exam = input.required<Exam>();
    readonly participation = input.required<Participation>();
    readonly collaborative = input(false);

    readonly student = computed(() => this.participation().user as User | undefined);
    readonly duration = computed(() =>
        DateTime.fromISO(this.participation().duration as string)
            .set({ second: 0, millisecond: 0 })
            .toJSDate(),
    );
    readonly studentName = computed(() => {
        const s = this.student();
        if (s) return `${s.lastName} ${s.firstName}`;
        return this.collaborative() ? (this.participation()._id as string) : this.exam().id.toString();
    });
    readonly enrolment = computed(() => this.exam().examEnrolments[0] as ExamEnrolment | undefined);
    readonly reservation = computed(() => this.enrolment()?.reservation);
    readonly participations = signal<ExamParticipation[]>([]);
    readonly noShows = signal<ExamEnrolment[]>([]);

    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly Attachment = inject(AttachmentService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        const id = this.route.snapshot.params.id;
        const ref = this.route.snapshot.params.ref;
        const url = this.collaborative()
            ? `/app/iop/reviews/${id}/participations/${ref}`
            : `app/examparticipations/${id}`;
        this.http
            .get<ExamParticipation[]>(url)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(this.handleParticipations);
    }

    downloadExamAttachment = () => {
        const examValue = this.exam();
        if (this.collaborative() && examValue.attachment) {
            const attachment = examValue.attachment;
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId as string, attachment.fileName);
        } else {
            this.Attachment.downloadExamAttachment(examValue);
        }
    };

    private handleParticipations = (data: ExamParticipation[]) => {
        const participationValue = this.participation();
        const examValue = this.exam();
        if (this.collaborative()) {
            // TODO: Add collaborative support for noshows.
            this.participations.set(data);
            return;
        }
        // Filter out the participation we are looking into
        this.participations.set(data.filter((p) => p.id !== participationValue.id));
        this.http.get<ExamEnrolment[]>(`/app/usernoshows/${examValue.id}`).subscribe((enrolments) => {
            this.noShows.set(enrolments.map((ee) => ({ ...ee, exam: { ...ee.exam, state: 'no_show' } })));
        });
    };
}
