/*
 * Copyright (c) 2017 Exam Consortium
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

package models.questions;

import models.Attachment;
import models.api.AttachmentContainer;
import models.base.OwnedModel;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Transient;

@Entity
public class EssayAnswer extends OwnedModel implements AttachmentContainer {

    @Column(columnDefinition = "TEXT")
    private String answer;

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    @Column
    private Double evaluatedScore;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public Double getEvaluatedScore() {
        return evaluatedScore;
    }

    public void setEvaluatedScore(Double evaluatedScore) {
        this.evaluatedScore = evaluatedScore;
    }

    @Transient
    public EssayAnswer copy() {
        EssayAnswer essayAnswer = new EssayAnswer();
        essayAnswer.setAnswer(answer);
        essayAnswer.save();
        return essayAnswer;
    }
}
