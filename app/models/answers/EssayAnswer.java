package models.answers;

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


    // probably HTML formatted text
    private String answer;

    // actual lenght of the answer
    private Long answerLength;



    @Override
    public String generateHash() {
        return "Implement me";
    }
}
