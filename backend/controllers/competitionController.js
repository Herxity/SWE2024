/**
 * @authors @deshnadoshi @aartirao419 @Emboar02
 * Competition Management Controller
 * This file contains all the required methods necessary to join, create, and manage competitions in Data Royale.
 */
const db = require('../db');
const { readUserById } = require('./userController');

// Create Competition (Main Functions)

/**
 * Create a competition. 
 * @author @deshnadoshi
 * @param {*} userid User ID of the organizer. 
 * @param {*} title Title of the competition. 
 * @param {*} deadline Due date of the competition. 
 * @param {*} prize Prize credits for the competition. 
 * @param {*} desc Description for the competition. 
 * @param {*} cap Maximum player capacity for the competition. 
 */ 
async function createCompetition (userid, title, deadline, prize, desc, cap, datecreated){
    if (authenticateAccess('organizer', userid)){
        let id = generateCompetitionID(); 
        try {
            const query = 'INSERT INTO competitions (id, userid, title, deadline, prize, description, player_cap, date_created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'; 
            const params = [id, userid, title, deadline, prize, desc, cap, datecreated]; 
            await db.query(query, params); 
        } catch (error) {
            console.error("Error creating competition:", error); 
            throw error; 
    
        }
    }
    
}

/**
 * Determine if a competition exists based on the compeititon ID and user ID. 
 * @author @deshnadoshi
 * @param {*} id competition ID. 
 * @param {*} userid user ID. 
 */
async function findCompetitionByID(id, userid){
    try {
        const query = 'SELECT * from `competitions` WHERE `id` = ? AND `userid` = ?'; 
        const params = [id, userid]; 
        return new Promise((resolve, reject) => {
            db.query(query, params, function(err, result){
                if (err){
                    console.error("Error finding competition:", err); 
                    return resolve(null); 
                }

                // Selected competition does not exist. 
                if (result.length === 0 || !result){
                    console.error("Competition does not exist."); 
                    return resolve(null); 
                } else {
                    // Selected competition exists. 
                    return resolve(true); 
                }

            }); 
        }); 

    } catch (error){
        console.error("Error finding competition:", error); 
        throw error;
    }
}

/**
 * Update competition information.
 * @author @deshnadoshi
 * @param {*} id competition ID. 
 * @param {*} userid user ID. 
 * @param {*} deadline Competition submission due date. 
 * @param {*} prize Competition prize credits. 
 * @returns 
 */
async function updateCompetition (id, userid, deadline, prize){

    const competitionExists = await findCompetitionByID(id, userid); 
    
    try {
        return new Promise((resolve, reject) =>{
            if (competitionExists){
                
                if (pairCompetitionToID(userid, id)){
                    
                    let allowedPrizeUpdate = updatePrizeEligibility(id, userid, prize); 
                    let allowedDeadlineUpdate = updateDeadlineEligibility(id, userid, deadline); 

                    if (allowedDeadlineUpdate && allowedPrizeUpdate){
                        const query = 'UPDATE `competitions` SET deadline = ?, prize = ? WHERE id = ? AND userid = ?';
                        const params = [deadline, prize, id, userid]; 
                        db.query(query, params, function(err, result){
                            if (err){
                                console.error("Error updating competition:", err); 
                                return resolve(null); 
                            }
            
                            // Selected competition does not exist. 
                            if (result.length === 0 || !result){
                                console.error("Competition does not exist."); 
                                return resolve(null); 
                            } else {
                                // Selected competition exists. 
                                return resolve(true); 
                            }
            
                        }); 
                    } else {
                        reject("Requirements to update competition parameters are not met (timeframe or value error)."); 
                    }

            }
    
            } else {
                reject("Competition does not exist."); 
            }
            
        }); 
    } catch (error) {

    }
}

/**
 * Determine if the new prize credits are acceptable.
 * @author @deshnadoshi
 * @param {*} id competition ID.
 * @param {*} userid user ID. 
 * @param {*} newPrize Proposed new prize amount.
 */
async function updatePrizeEligibility(id, userid, newPrize){
    const existingCompetition = await findCompetitionByID(id, userid); 
    if (!existingCompetition){
        return false; 
    }

    let allowablePrize = false;
    
    prizeQuery = 'SELECT prize FROM competitions WHERE id = ? AND userid = ?'; 
    prizeParams = [id, userid]; 

    db.query(prizeQuery, prizeParams, (err, results) => {
        if (err){
            console.error("Error retrieving prize credits."); 
        } else {
            if (results.length > 0){
                originalPrize = results[0].prize; 
            } else {
                originalPrize = -1; 
            }
        }
    }); 
    

    if (newPrize > originalPrize && originalPrize != -1){
        allowablePrize = true; 
    }

    return allowablePrize; 
}

/**
 * Determine if the new deadline is acceptable.
 * @author @deshnadoshi
 * @param {} id competition ID.
 * @param {*} userid user ID. 
 * @param {*} newDeadline Proposed deadline change
 */
async function updateDeadlineEligibility(id, userid, newDeadline){
    const existingCompetition = await findCompetitionByID(id, userid); 
    if (!existingCompetition){
        return false; 
    }
    
    let allowableExtension = false; 
    let allowableUpdateTimeframe = false;
    let today = new Date(); 
    
    deadlineQuery = 'SELECT deadline FROM competitions WHERE id = ? AND userid = ?'; 
    deadlineParams = [id, userid]; 

    db.query(deadlineQuery, deadlineParams, (err, results) => {
        if (err){
            console.error("Error retrieving deadline."); 
        } else {
            if (results.length > 0){
                originalDeadline = results[0].deadline; 
            } else {
                originalDeadline = -1; 
            }
        }
    }); 

    if (originalDeadline != -1){

        allowableUpdateTimeframe = overOneWeek(today, originalDeadline); 

        if (newDeadline > originalDeadline){
            allowableExtension = true; 
        }
    }

    return allowableExtension && allowableUpdateTimeframe; 
}

// Create Competition (Validation Functions)


function validateTitle(title){

}

function validateDescription(desc){

}

function validatePrize(prize){

}

function validatePlayerCap(cap){

}

function validateDeadline(deadline){

}


// Create Competition (Helper Functions)

/**
 * Determine if the deadline of a competition is over one week away from today. 
 * @author @deshnadoshi
 * @param {*} today Today's date. 
 * @param {*} deadline Competition deadline.
 */
function overOneWeek(today, deadline){
    let todayTimestamp = today.getTime();
    let deadlineTimestamp = deadline.getTime(); 

    let timeDifference = Math.abs(todayTimestamp - deadlineTimestamp);
    let daysDifference = timeDifference / (1000 * 3600 * 24);
  
    return daysDifference >= 7;
  
}

/**
 * Generate a randomized 11-digit competition ID. 
 * @author @deshnadoshi
 */
function generateCompetitionID(){
    const min = 1; 
    const max = 2147483647; 
    const uniqueRandomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    return uniqueRandomNumber;

}

// Join Competition (Main Functions)


// Join Competition (Validation Functions)


// Join Competition (Helper Functions)


// Manage Competition (Main Functions)

/**
 * Determine if a given competition can be created/joined by a given userid's role.  
 * @author @deshnadoshi
 * @param {*} role 
 * @param {*} userid 
 */
async function authenticateAccess(role, userid){

    try {
        const user = await readUserById(userid);
        const userRole = user.role;

        if (role.toLowerCase() === 'competitor' && userRole.toLowerCase() === 'competitor') {
            return true;
        } else if (role.toLowerCase() === 'organizer' && userRole.toLowerCase() === 'organizer') {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error in authorizing user:', error);
        throw error; 
    }

}

/**
 * Determine if a given competition ID belongs to a given user ID. 
 * @author @deshnadoshi
 * @param {*} userid user ID. 
 * @param {*} compid competition ID. 
 */
async function pairCompetitionToID(userid, compid){
    
    return new Promise((resolve, reject) => {
        try {
            query = 'SELECT * FROM competitions WHERE id = ? AND userid = ?'; 
            params = [compid, userid]; 
        
            db.query(query, params, function (err, result, fields) {
                if (err) {
                    reject('Error executing query:', err);
                } else {
                    resolve(true); 
                }
            });
            

        } catch (error){
            reject("User ID does not own the given Competition ID."); 
        }

    });
}

/**
 * View all open and running competitions. 
 * @author @deshnadoshi
 */
async function viewAllCompetitions(){
    
    return new Promise((resolve, reject) => {

        try {
            
            const today = new Date().toISOString().split('T')[0];
            const queryStr = `SELECT * FROM competitions WHERE deadline > ?`;
    
            db.query(queryStr, [today], (err, competitions) => {
                if (err) {
                    console.error("Error executing query:", err);
                    reject("Error in retrieving all competitions.");
                } else {
                    const formattedCompetitions = competitions.map(competition => {
                        return {
                            id: competition.id,
                            userid: competition.userid,
                            title: competition.title,
                            deadline: competition.deadline,
                            prize: competition.prize,
                            desc: competition.description,
                            player_cap: competition.player_cap,
                            date_created: competition.date_created
                        };
                    });

                    resolve(formattedCompetitions);
                }
            });

        } catch (error){
            reject("Error in retrieving all competitions."); 
            throw new Error('Error in retrieving all competitions'); 
        }
    
    });
}




// Exports

module.exports = {
    createCompetition,
    findCompetitionByID,
    updateCompetition, 
    viewAllCompetitions
};