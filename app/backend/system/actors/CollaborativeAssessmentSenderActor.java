/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package backend.system.actors;

import akka.actor.AbstractActor;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.models.Exam;
import backend.models.ExamParticipation;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import javax.inject.Inject;
import play.Logger;

public class CollaborativeAssessmentSenderActor extends AbstractActor {
    private static final Logger.ALogger logger = Logger.of(CollaborativeAssessmentSenderActor.class);

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
                    Query<ExamParticipation> query = Ebean.find(ExamParticipation.class);
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
