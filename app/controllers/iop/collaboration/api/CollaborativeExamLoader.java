// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.inject.ImplementedBy;
import controllers.iop.collaboration.impl.CollaborativeExamLoaderImpl;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import models.enrolment.ExamParticipation;
import models.exam.Exam;
import models.iop.CollaborativeExam;
import models.user.User;
import play.mvc.Result;

@ImplementedBy(CollaborativeExamLoaderImpl.class)
public interface CollaborativeExamLoader {
    CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce);

    CompletionStage<Optional<JsonNode>> downloadAssessment(String examRef, String assessmentRef);

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, User sender);

    CompletionStage<Result> uploadExam(
        CollaborativeExam ce,
        Exam content,
        User sender,
        Model resultModel,
        PathProperties pp
    );

    CompletionStage<Optional<String>> uploadAssessment(CollaborativeExam ce, String ref, JsonNode payload);

    CompletionStage<Result> deleteExam(CollaborativeExam ce);

    CompletionStage<Boolean> createAssessment(ExamParticipation participation);

    CompletionStage<Boolean> createAssessmentWithAttachments(ExamParticipation participation);

    PathProperties getAssessmentPath();
}
