// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors;

import controllers.iop.collaboration.api.CollaborativeExamLoader;
import io.ebean.DB;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import javax.inject.Inject;
import models.Exam;
import models.ExamParticipation;
import org.apache.pekko.actor.AbstractActor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CollaborativeAssessmentSenderActor extends AbstractActor {

    private final Logger logger = LoggerFactory.getLogger(CollaborativeAssessmentSenderActor.class);

    private final CollaborativeExamLoader collaborativeExamLoader;

    @Inject
    public CollaborativeAssessmentSenderActor(CollaborativeExamLoader collaborativeExamLoader) {
        this.collaborativeExamLoader = collaborativeExamLoader;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Starting collaborative assessment sending check ->");
                    Query<ExamParticipation> query = DB.find(ExamParticipation.class);
                    PathProperties pp = collaborativeExamLoader.getAssessmentPath();
                    pp.apply(query);
                    List<ExamParticipation> enrolments = query
                        .where()
                        .isNotNull("collaborativeExam")
                        .in("exam.state", Exam.State.ABORTED, Exam.State.REVIEW)
                        .isNull("sentForReview")
                        .isNotNull("started")
                        .isNotNull("ended")
                        .findList();
                    enrolments.forEach(collaborativeExamLoader::createAssessmentWithAttachments);
                    logger.debug("<- done");
                }
            )
            .build();
    }
}
