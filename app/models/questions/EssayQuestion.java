package models.questions;

import org.apache.commons.codec.digest.DigestUtils;
import play.Logger;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@DiscriminatorValue("EssayQuestion")
public class EssayQuestion extends AbstractQuestion {

    public EssayQuestion() {
        this.type = this.getClass().getSimpleName();
    }

    // probably HTML formatted text
    private String answer;

    private Long maxCharacters;

    private Long answerLength;

    private Long getAnswerLength() {
        this.answerLength = new Long(answer.length());
        return this.answerLength;
    }

    public String toString()
    {
        return "EssayQuestion "+ super.toString();
    }


    @Override
    public String getType() {
        return this.type;
    }

    @Override
    public String generateHash() {

        String attributes = question + instruction;

        this.hash = DigestUtils.md5Hex(attributes);
        Logger.debug("Question hash: " + this.hash);
        return hash;
    }


}

