package models.json;

import com.avaje.ebean.Model;
import com.avaje.ebean.annotation.DbJsonB;
import models.User;
import org.joda.time.DateTime;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import java.util.Map;

@Entity
public class ExternalExam extends Model {

    @Id
    String hash;

    @Temporal(TemporalType.TIMESTAMP)
    public DateTime created;

    @OneToOne
    public User creator;

    @DbJsonB
    Map<String, Object> content;

    @Version
    private long objectVersion;

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

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

    public long getObjectVersion() {
        return objectVersion;
    }

    public void setObjectVersion(long objectVersion) {
        this.objectVersion = objectVersion;
    }

    public Map<String, Object> getContent() {
        return content;
    }

    public void setContent(Map<String, Object> content) {
        this.content = content;
    }
}
