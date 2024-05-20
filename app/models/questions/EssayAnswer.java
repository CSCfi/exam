// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import models.attachment.Attachment;
import models.attachment.AttachmentContainer;
import models.base.OwnedModel;

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

    public EssayAnswer copy() {
        EssayAnswer essayAnswer = new EssayAnswer();
        essayAnswer.setAnswer(answer);
        essayAnswer.save();
        if (attachment != null) {
            final Attachment copy = attachment.copy();
            copy.save();
            essayAnswer.setAttachment(copy);
        }
        return essayAnswer;
    }
}
