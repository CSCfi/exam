// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import com.google.inject.ImplementedBy;
import java.util.Optional;
import models.assessment.AutoEvaluationConfig;
import models.assessment.ExamFeedbackConfig;
import models.exam.Exam;
import models.user.Role;
import models.user.User;
import play.mvc.Result;

@ImplementedBy(ExamUpdaterImpl.class)
public interface ExamUpdater {
    Optional<Result> updateTemporalFieldsAndValidate(Exam exam, User user, Exam payload);
    Optional<Result> updateStateAndValidate(Exam exam, User user, Exam payload);
    boolean isPermittedToUpdate(Exam exam, User user);
    boolean isAllowedToUpdate(Exam exam, User user);
    boolean isAllowedToRemove(Exam exam);
    void update(Exam exam, Exam payload, Role.Name loginRole);
    void updateAutoEvaluationConfig(Exam exam, AutoEvaluationConfig newConfig);
    Optional<Result> updateLanguage(Exam exam, String code, User user);
    void preparePreview(Exam exam);
    void updateExamFeedbackConfig(Exam exam, ExamFeedbackConfig examFeedbackConfig);
}
