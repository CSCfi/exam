/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package models.base;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import models.User;
import org.joda.time.DateTime;
import util.DateTimeAdapter;

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
