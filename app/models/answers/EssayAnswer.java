package models.answers;

import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * Created by avainik on 3/20/14.
 */
@Entity
@DiscriminatorValue("EssayAnswer")
public class EssayAnswer extends AbstractAnswer {

    public EssayAnswer() {
        this.type = this.getClass().getSimpleName();
    }

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Override
    public String generateHash() {
        return "Implement me";
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
