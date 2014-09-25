package models;

import annotations.NonCloneable;
import play.Logger;
import play.data.format.Formats;
import play.db.ebean.Model;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;

@MappedSuperclass
abstract public class SitnetModel extends Model implements Cloneable {

	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
    protected Long id;
	
	@Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;
	
//	@CreatedTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    @Formats.DateTime(pattern="yyyy/MM/dd")
    protected Timestamp created;
	
	@OneToOne
    @NonCloneable
	protected User creator;
	
//	@UpdatedTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp modified;
	
	@OneToOne
    @NonCloneable
	protected User modifier;
	
	public SitnetModel() {
		super();
	}
	
	public SitnetModel(User creator) {
		super();
		this.creator = creator;
	}

	public Long getId() {
		return id;
	}

    public void setId(Long id) {
		this.id = id;
	}

    public Timestamp getCreated() {
		return created;
	}

    public void setCreated(Timestamp created) {
		this.created = created;
	}

    public User getCreator() {
		return creator;
	}

    public void setCreator(User creator) {
		this.creator = creator;
	}

    public Timestamp getModified() {
		return modified;
	}

    public void setModified(Timestamp modified) {
		this.modified = modified;
	}

    public User getModifier() {
		return modifier;
	}

    public void setModifier(User modifier) {
		this.modifier = modifier;
	}

    @Override
    protected Object clone() throws CloneNotSupportedException {

        SitnetModel copy = (SitnetModel)SitnetUtil.getClone(this);

        Logger.debug("clone: " + copy);

        return copy;
    }
}
