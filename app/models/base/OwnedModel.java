package models.base;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import models.User;
import org.joda.time.DateTime;
import util.java.DateTimeAdapter;

import javax.persistence.MappedSuperclass;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

@MappedSuperclass
public class OwnedModel extends GeneratedIdentityModel {

	@Temporal(TemporalType.TIMESTAMP)
	@JsonSerialize(using = DateTimeAdapter.class)
	protected DateTime created;

	@OneToOne
    protected User creator;

    @Temporal(TemporalType.TIMESTAMP)
	@JsonSerialize(using = DateTimeAdapter.class)
	protected DateTime modified;

	@OneToOne
    protected User modifier;

	public DateTime getCreated() {
		return created;
	}

    public void setCreated(DateTime created) {
		this.created = created;
	}

    public User getCreator() {
		return creator;
	}

    public void setCreator(User creator) {
		this.creator = creator;
	}

    public DateTime getModified() {
		return modified;
	}

    public void setModified(DateTime modified) {
		this.modified = modified;
	}

    public User getModifier() {
		return modifier;
	}

    public void setModifier(User modifier) {
		this.modifier = modifier;
	}

}
