package models.questions;

import play.Logger;
import util.SitnetUtil;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@DiscriminatorValue("EssayQuestion")
public class EssayQuestion extends AbstractQuestion implements QuestionInterface {

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

        this.hash = SitnetUtil.encodeMD5(attributes);
        Logger.debug("Question hash: " + this.hash);
        return hash;
    }

    public Long getMaxCharacters() {
        return maxCharacters;
    }

    public void setMaxCharacters(Long maxCharacters) {
        this.maxCharacters = maxCharacters;
    }

	@Override
    public Object clone() {

        return SitnetUtil.getClone(this);
    }

}

