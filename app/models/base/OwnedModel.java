package models.base;

import models.User;
import play.data.format.Formats.DateTime;

import javax.persistence.MappedSuperclass;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import java.util.Date;

@MappedSuperclass
public class OwnedModel extends GeneratedIdentityModel {

	@Temporal(TemporalType.TIMESTAMP)
    @DateTime(pattern="yyyy/MM/dd")
    protected Date created;

	@OneToOne
    protected User creator;

    @Temporal(TemporalType.TIMESTAMP)
    protected Date modified;

	@OneToOne
    protected User modifier;

	public Date getCreated() {
		return created;
	}

    public void setCreated(Date created) {
		this.created = created;
	}

    public User getCreator() {
		return creator;
	}

    public void setCreator(User creator) {
		this.creator = creator;
	}

    public Date getModified() {
		return modified;
	}

    public void setModified(Date modified) {
		this.modified = modified;
	}

    public User getModifier() {
		return modifier;
	}

    public void setModifier(User modifier) {
		this.modifier = modifier;
	}

}
