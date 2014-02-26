package models;


/*
 * Opetuksen toteutus
 * http://tietomalli.csc.fi/Opetuksen%20toteutus-kaavio.html
 * 
 * <Opetustapahtuman tyyppi> voi olla esim luento tai tentti.
 * 
 */
public class ExamType {

	// TDOD: miten erilaiset tenttityypit määritellään?
	
	// kaikille avoin, vain kutsusta, jne
	private String type;

    public ExamType(String type) {
        this.type = type;
    }
}
