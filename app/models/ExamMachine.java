package models;

/*
 * Tenttikone jolla opiskelija tekee tentin
 * Kone sijaitsee Tenttiakvaariossa
 * 
 */
public class ExamMachine {

	// TODO: varausaikataulu
	
	/* 
	 * jonkinlainen ID jolla kone tunnistetaan
	 * 
	 * Esim akvaario-koneenID  IT103-7
	 */
	private String name;
	
	private ExamRoom examRoom;
	
	private Reservation reservation;
	
}
