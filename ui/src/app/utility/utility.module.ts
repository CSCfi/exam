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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { AttachmentService } from './attachment/attachment.service';
import { AttachmentSelectorComponent } from './attachment/dialogs/attachmentSelector.component';
import { CKEditorComponent } from './ckeditor/ckeditor.component';
import { ApplyDstPipe } from './date/applyDst.pipe';
import { DateTimeService } from './date/date.service';
import { DatePickerComponent } from './date/datePicker.component';
import { DateTimePickerComponent } from './date/dateTimePicker.component';
import { DiffInDaysPipe } from './date/dayDiff.pipe';
import { DiffInMinutesPipe } from './date/minuteDiff.pipe';
import { ConfirmationDialogComponent } from './dialogs/confirmationDialog.component';
import { ConfirmationDialogService } from './dialogs/confirmationDialog.service';
import { FileService } from './file/file.service';
import { FilterByPipe } from './filter/filterBy.pipe';
import { DynamicFormComponent } from './forms/dynamicForm.component';
import { DynamicFormQuestionComponent } from './forms/dynamicFormQuestion.component';
import { QuestionControlService } from './forms/questionControl.service';
import { HistoryBackComponent } from './history/historyBack.component';
import { SanitizedHtmlPipe } from './html/sanitizedHtml.pipe';
import { LanguageService } from './language/language.service';
import { MathJaxDirective } from './math/mathJax.directive';
import { CourseCodeComponent } from './miscellaneous/courseCode.component';
import { PageFillPipe } from './paginator/pageFill.pipe';
import { PaginatorComponent } from './paginator/paginator.component';
import { DropdownSelectComponent } from './select/dropDownSelect.component';
import { OrderByPipe } from './sorting/orderBy.pipe';
import { TableSortComponent } from './sorting/tableSort.component';
import { TeacherListComponent } from './user/teacherList.component';
import { UserService } from './user/user.service';
import { FixedPrecisionValidatorDirective } from './validation/fixedPrecision.directive';
import { MaxDirective } from './validation/maxValue.directive';
import { MinDirective } from './validation/minValue.directive';
import { UniqueValuesValidatorDirective } from './validation/uniqueValues.directive';
import { WindowRef } from './window/window.service';

@NgModule({
    imports: [CommonModule, TranslateModule, FormsModule, ReactiveFormsModule, NgbModule],
    exports: [
        CommonModule,
        TranslateModule,
        FormsModule,
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
        CourseCodeComponent,
        SanitizedHtmlPipe,
        DiffInMinutesPipe,
        DiffInDaysPipe,
        DynamicFormComponent,
        FilterByPipe,
        MinDirective,
        MaxDirective,
        OrderByPipe,
    ],
    declarations: [
        AttachmentSelectorComponent,
        CKEditorComponent,
        ConfirmationDialogComponent,
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
        SanitizedHtmlPipe,
        DiffInMinutesPipe,
        DiffInDaysPipe,
        DynamicFormComponent,
        DynamicFormQuestionComponent,
        FilterByPipe,
        MinDirective,
        MaxDirective,
        OrderByPipe,
    ],
    providers: [
        AttachmentService,
        ConfirmationDialogService,
        DateTimeService,
        FileService,
        LanguageService,
        UserService,
        WindowRef,
        QuestionControlService,
    ],
})
export class UtilityModule {}
