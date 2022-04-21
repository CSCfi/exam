import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { QuestionModule } from '../question/question.module';
import { UtilityModule } from '../utility/utility.module';
import { ExaminationClockComponent } from './clock/examinationClock.component';
import { ExaminationComponent } from './examination.component';
import { ExaminationService } from './examination.service';
import { ExaminationStatusService } from './examinationStatus.service';
import { ExaminationHeaderComponent } from './header/examinationHeader.component';
import { AnswerInstructionsComponent } from './instructions/answerInstructions.component';
import { ExaminationLogoutComponent } from './logout/examinationLogout.component';
import { ExaminationNavigationComponent } from './navigation/examinationNavigation.component';
import { ExaminationToolbarComponent } from './navigation/examinationToolbar.component';
import { ClozeTestDisplayComponent } from './question/clozeTestDisplay.component';
import { ExaminationClozeTestComponent } from './question/examinationClozeTest.component';
import { ExaminationEssayQuestionComponent } from './question/examinationEssayQuestion.component';
import { ExaminationMultiChoiceComponent } from './question/examinationMultiChoice.component';
import { ExaminationQuestionComponent } from './question/examinationQuestion.component';
import { ExaminationWeightedMultiChoiceComponent } from './question/examinationWeightedMultiChoice.component';
import { ExaminationSectionComponent } from './section/examinationSection.component';

/*export function createCompiler(compilerFactory: CompilerFactory) {
    return compilerFactory.createCompiler();
}*/
@NgModule({
    imports: [NgbModule, UIRouterModule, QuestionModule, UtilityModule],
    declarations: [
        AnswerInstructionsComponent,
        ExaminationClockComponent,
        ExaminationClozeTestComponent,
        ExaminationEssayQuestionComponent,
        ExaminationHeaderComponent,
        ExaminationLogoutComponent,
        ExaminationMultiChoiceComponent,
        ExaminationQuestionComponent,
        ExaminationWeightedMultiChoiceComponent,
        ExaminationNavigationComponent,
        ExaminationSectionComponent,
        ExaminationToolbarComponent,
        ExaminationComponent,
        ClozeTestDisplayComponent,
    ],
    providers: [
        ExaminationService,
        ExaminationStatusService,
        //{ provide: COMPILER_OPTIONS, useValue: {}, multi: true },
        //{ provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
        //{ provide: Compiler, useFactory: createCompiler, deps: [CompilerFactory] },
    ],
})
export class ExaminationModule {}
