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


    // not really max length, Just a recommendation
    private Long maxCharacters;


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

    public Long getMaxCharacters() {
        return maxCharacters;
    }

    public void setMaxCharacters(Long maxCharacters) {
        this.maxCharacters = maxCharacters;
    }

}

