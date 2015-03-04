package models.answers;

import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

@Entity
@DiscriminatorValue("EssayAnswer")
public class EssayAnswer extends AbstractAnswer {

    public EssayAnswer() {
        type = getClass().getSimpleName();
    }

    @Column(columnDefinition = "TEXT")
    private String answer;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
