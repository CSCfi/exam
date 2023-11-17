/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbDropdownModule, NgbTimepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';
import { AttachmentService } from './attachment/attachment.service';
import { AttachmentSelectorComponent } from './attachment/dialogs/attachment-picker.component';
import { CKEditorComponent } from './ckeditor/ckeditor.component';
import { ApplyDstPipe } from './date/apply-dst.pipe';
import { DatePickerComponent } from './date/date-picker.component';
import { DateTimePickerComponent } from './date/date-time-picker.component';
import { DateTimeService } from './date/date.service';
import { DiffInDaysPipe } from './date/day-diff.pipe';
import { DiffInMinutesPipe } from './date/minute-diff.pipe';
import { ConfirmationDialogComponent } from './dialogs/confirmation-dialog.component';
import { ConfirmationDialogService } from './dialogs/confirmation-dialog.service';
import { FileService } from './file/file.service';
import { FilterByPipe } from './filter/filter-by.pipe';
import { HistoryBackComponent } from './history/history-back.component';
import { SanitizedHtmlPipe } from './html/sanitized-html.pipe';
import { LanguageService } from './language/language.service';
import { MathJaxDirective } from './math/math-jax.directive';
import { CommonExamService } from './miscellaneous/common-exam.service';
import { CourseCodeComponent } from './miscellaneous/course-code.component';
import { CourseCodeService } from './miscellaneous/course-code.service';
import { PageFillPipe } from './paginator/page-fill.pipe';
import { PaginatorComponent } from './paginator/paginator.component';
import { AutoFocusDirective } from './select/auto-focus.directive';
import { DropdownSelectComponent } from './select/dropdown-select.component';
import { OrderByPipe } from './sorting/order-by.pipe';
import { TableSortComponent } from './sorting/table-sort.component';
import { TeacherListComponent } from './user/teacher-list.component';
import { UserService } from './user/user.service';
import { FixedPrecisionValidatorDirective } from './validation/fixed-precision.directive';
import { LowerCaseValidatorDirective } from './validation/lowercase.directive';
import { MaxDirective } from './validation/max-value.directive';
import { MinDirective } from './validation/min-value.directive';
import { UniqueValuesValidatorDirective } from './validation/unique-values.directive';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        ToastrModule,
        NgbDatepickerModule,
        NgbTimepickerModule,
        NgbDropdownModule,
        CKEditorComponent,
        CourseCodeComponent,
        DatePickerComponent,
        DateTimePickerComponent,
        HistoryBackComponent,
        PaginatorComponent,
        DropdownSelectComponent,
        MathJaxDirective,
        TableSortComponent,
        TeacherListComponent,
        PageFillPipe,
        ApplyDstPipe,
        UniqueValuesValidatorDirective,
        FixedPrecisionValidatorDirective,
        LowerCaseValidatorDirective,
        SanitizedHtmlPipe,
        DiffInMinutesPipe,
        DiffInDaysPipe,
        FilterByPipe,
        AutoFocusDirective,
        MinDirective,
        MaxDirective,
        OrderByPipe,
    ],
    exports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        ToastrModule,
        CKEditorComponent,
        DatePickerComponent,
        DateTimePickerComponent,
        ApplyDstPipe,
        DropdownSelectComponent,
        PageFillPipe,
        HistoryBackComponent,
        TeacherListComponent,
        TableSortComponent,
        PaginatorComponent,
        MathJaxDirective,
        UniqueValuesValidatorDirective,
        FixedPrecisionValidatorDirective,
        LowerCaseValidatorDirective,
        CourseCodeComponent,
        SanitizedHtmlPipe,
        DiffInMinutesPipe,
        DiffInDaysPipe,
        FilterByPipe,
        AutoFocusDirective,
        MinDirective,
        MaxDirective,
        OrderByPipe,
    ],
    declarations: [AttachmentSelectorComponent, ConfirmationDialogComponent],
    bootstrap: [ConfirmationDialogComponent, AttachmentSelectorComponent],
    providers: [
        AttachmentService,
        ConfirmationDialogService,
        DateTimeService,
        FileService,
        LanguageService,
        CommonExamService,
        UserService,
        CourseCodeService,
    ],
})
export class SharedModule {}
