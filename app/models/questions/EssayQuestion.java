package models.questions;

import org.springframework.beans.BeanUtils;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

@Entity
@DiscriminatorValue("EssayQuestion")
public class EssayQuestion extends AbstractQuestion {

    public EssayQuestion() {
        type = getClass().getSimpleName();
    }

    // not really max length, Just a recommendation
    private Long maxCharacters;

    // Points, Select
    private String evaluationType;

    public Long getMaxCharacters() {
        return maxCharacters;
    }

    public void setMaxCharacters(Long maxCharacters) {
        this.maxCharacters = maxCharacters;
    }

    public String getEvaluationType() {
        return evaluationType;
    }

    public void setEvaluationType(String evaluationType) {
        this.evaluationType = evaluationType;
    }

    @Override
    public EssayQuestion copy() {
        EssayQuestion question = new EssayQuestion();
        BeanUtils.copyProperties(this, question, new String[] {"id"});
        question.setParent(this);
        return question;
    }

}

