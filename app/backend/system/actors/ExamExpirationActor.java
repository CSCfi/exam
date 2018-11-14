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

import java.util.List;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;

import backend.models.Exam;
import backend.models.ExamRecord;
import backend.util.ConfigUtil;

public class ExamExpirationActor extends AbstractActor {

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running exam expiration check ...", getClass().getCanonicalName());
            List<Exam> exams = Ebean.find(Exam.class)
                    .where()
                    .disjunction()
                    .eq("state", Exam.State.GRADED_LOGGED)
                    .eq("state", Exam.State.ARCHIVED)
                    .eq("state", Exam.State.ABORTED)
                    .eq("state", Exam.State.REJECTED)
                    .endJunction()
                    .findList();

            DateTime now = DateTime.now();
            for (Exam exam : exams) {
                DateTime expirationDate = exam.getState() == Exam.State.ABORTED ?
                        exam.getExamParticipation().getEnded() : exam.getGradedTime();
                if (expirationDate == null) {
                    Logger.error("no grading time for exam #" + exam.getId().toString());
                    continue;
                }
                if (ConfigUtil.getExamExpirationDate(expirationDate).isBefore(now)) {
                    cleanExamData(exam);
                    Logger.info("{}: ... Marked exam {} as expired", getClass().getCanonicalName(), exam.getId());
                }
            }
            Logger.debug("{}: ... Done", getClass().getCanonicalName());
        }).build();
    }

    /**
     * Disassociate exam from its creator, set state to deleted and erase any associated exam records
     */
    private void cleanExamData(Exam exam) {
        exam.setState(Exam.State.DELETED);
        exam.setCreator(null);
        exam.update();
        Ebean.find(ExamRecord.class).where().eq("exam", exam).findList().forEach(ExamRecord::delete);
    }

}
