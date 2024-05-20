// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.base;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import miscellaneous.datetime.DateTimeAdapter;
import models.user.User;
import org.joda.time.DateTime;

@MappedSuperclass
public class OwnedModel extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    protected DateTime created;

    @ManyToOne
    @JoinColumn(name = "creator_id")
    protected User creator;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    protected DateTime modified;

    @ManyToOne
    @JoinColumn(name = "modifier_id")
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

    public void setCreatorWithDate(User user) {
        setCreator(user);
        setCreated(DateTime.now());
    }

    public void setModifierWithDate(User user) {
        setModifier(user);
        setModified(DateTime.now());
    }
}
