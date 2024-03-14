/**
 * @authors @deshnadoshi @aartirao419 @Emboar02
 * Competition Management Controller
 * This file contains all the required methods necessary to join, create, and manage competitions in Data Royale.
 */
const db = require('../db');
const fs = require('fs');
const unzipper = require('unzipper');
const csv = require('csv-parser');
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
async function createCompetition (userid, title, deadline, prize, metrics, desc, cap, datecreated, filepath){
    if (authenticateAccess('organizer', userid)){
        let id = generateCompetitionID(); 

        let isValidCompetition = true; 

        // Insert validation functions here: 
        if (!processCompetitionDatsets(filepath)){
            isValidCompetition = false; 
        }


        if (isValidCompetition){
            try {
                const query = 'INSERT INTO competitions (id, userid, title, deadline, prize, metrics, description, player_cap, date_created, filepath) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'; 
                const params = [id, userid, title, deadline, prize, metrics, desc, cap, datecreated, filepath]; 
                await db.query(query, params); 
            } catch (error) {
                console.error("Error creating competition:", error); 
                throw error; 
        
            }
        } else {
            throw new Error("Invalid entries for competition creation."); 
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
    let allowedPrizeUpdate = await updatePrizeEligibility(id, userid, prize); 
    let allowedDeadlineUpdate = await updateDeadlineEligibility(id, userid, deadline); 
    return new Promise((resolve, reject) =>{

        try {
                if (competitionExists){
                    
                    if (pairCompetitionToID(userid, id)){
                        

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
                
        } catch (error) {

        }

}); 

}

/**
 * Determine if the new prize credits are acceptable.
 * @author @deshnadoshi
 * @param {*} id competition ID.
 * @param {*} userid user ID. 
 * @param {*} newPrize Proposed new prize amount.
 */
async function updatePrizeEligibility(id, userid, newPrize) {
    const existingCompetition = await findCompetitionByID(id, userid);
    if (!existingCompetition) {
        return false;
    }

    return new Promise((resolve, reject) => {
        const prizeQuery = 'SELECT prize FROM competitions WHERE id = ? AND userid = ?';
        const prizeParams = [id, userid];

        db.query(prizeQuery, prizeParams, (err, results) => {
            if (err) {
                console.error("Error retrieving prize credits.");
                reject(err);
            } else {
                if (results.length > 0) {
                    const originalPrize = results[0].prize;

                    const allowablePrize = newPrize > originalPrize && originalPrize !== -1;

                    resolve(allowablePrize);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

/**
 * Determine if the new deadline is acceptable.
 * @author @deshnadoshi
 * @param {} id competition ID.
 * @param {*} userid user ID. 
 * @param {*} newDeadline Proposed deadline change
 */
async function updateDeadlineEligibility(id, userid, newDeadline) {
    const existingCompetition = await findCompetitionByID(id, userid);
    if (!existingCompetition) {
        return false;
    }

    return new Promise((resolve, reject) => {
        const deadlineQuery = 'SELECT deadline FROM competitions WHERE id = ? AND userid = ?';
        const deadlineParams = [id, userid];
        const today = new Date();
        const newDate = new Date(newDeadline);

        db.query(deadlineQuery, deadlineParams, (err, results) => {
            if (err) {
                console.error("Error retrieving deadline.");
                reject(err);
            } else {
                if (results.length > 0) {
                    const originalDeadline = results[0].deadline;
                    let allowableExtension = false;
                    let allowableUpdateTimeframe = false;

                    allowableUpdateTimeframe = overOneWeek(today, originalDeadline);

                    if (newDate.getTime() > originalDeadline.getTime()) {
                        allowableExtension = true;
                    }


                    resolve(allowableExtension && allowableUpdateTimeframe);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

/**
 * Determine if the competition datasets are appropriate, as per requirements.
 * @author @deshnadoshi
 * @param {*} filepath .zip File's path
 */
async function processCompetitionDatsets(filepath){
    await fs.createReadStream(filepath)
    .pipe(unzipper.Extract({ path: 'tempCompDatasetExtracts' }))
    .promise();

    const files = fs.readdirSync('temp_extracted_files');

    if (files.length !== 2) {
        return false;
    }

    for (const file of files) {
        const inidivdualFilePath = `tempCompDatasetExtracts/${file}`;
        const rowCount = await countRows(inidivdualFilePath);

        if (rowCount < 500) {
            return false; 
        } else {
            return true; 
        }
    }

}

// Create Competition (Validation Functions)

/**
 * Determines if the competition title is of the correct type and within 60 characters.
 * @author @aartirao419
 * @param {*} title Competition title. 
 */
function validateTitle(title){
    if (typeof title != 'string'){
        return false;
    } 
    // title must have 60 character limit and be a string
    if (title.length > 60){
        return false;
    }

    return true;

}

/**
 * Determines if the description is within the 1000 word limit.
 * @author @aartirao419
 * @param {} desc Competition description. 
 */
function validateDescription(desc){ 
    //description has a 1000 word limit cannot exceed 1000
    let words = desc.trim().split(/\s+/);
    if (words.length > 1000){
        desc = words.slice(0,1000);
    }
    return desc;
}

/**
 * Determine if the prize credits selected is of a valid amount. 
 * @author @aartirao419
 * @param {*} prize Competition prize credits.
 */
function validatePrize(prize){
    
}

/**
 * Determine if the player capacity is within 500 people.
 * @author @aartirao419 @deshnadoshi
 * @param {} cap Competition player capacity. 
 */
function validatePlayerCap(cap){ 
    //only a max of 500 players are allowed per competition
    if (cap > 500){
        return false; 
    }

    return true; 

}

/**
 * Determine if the competition deadline is at least one month away from the date of creation.
 * @author @aartirao419
 * @param {*} deadline Competition deadline. 
 */
function validateDeadline(deadline) {
    let compDeadline = new Date(deadline);
    let currDate = new Date();

    let oneMonthFromNow = new Date(currDate);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    if (compDeadline < oneMonthFromNow) {
        return false; 
    } else {
        return true; 
    }
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

/**
 * Determine if a given file is a .csv file or not.
 * @author @deshnadoshi
 * @param {} filepath .csv file path.
 */
function countRows(filepath) {
    return new Promise((resolve, reject) => {
        let count = 0;
        fs.createReadStream(filepath)
            .pipe(csv())
            .on('data', () => count++)
            .on('end', () => resolve(count))
            .on('error', reject);
    });
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
                            metrics: competition.metrics,
                            desc: competition.description,
                            player_cap: competition.player_cap,
                            date_created: competition.date_created,
                            file_path: competition.filepath
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

/**
 * View all the user scores for a given competition.  
 * @author @deshnadoshi 
 * @param {*} compid competition ID.
 */
async function viewLeaderboard(compid){

    return new Promise((resolve, reject) => {

        try {
            
            const queryStr = `SELECT * FROM leaderboard WHERE comp_id = ?`;
    
            db.query(queryStr, [compid], (err, leaderboard) => {
                if (err) {
                    console.error("Error executing query:", err);
                    reject("Error in retrieving leaderboard.");
                } else {
                    const formattedLeaderboard = leaderboard.map(stats => {
                        return {
                            user_id: stats.user_id,
                            score: stats.score
                        };
                    });

                    resolve(formattedLeaderboard);
                }
            });

        } catch (error){
            reject("Error in retrieving leaderboard."); 
            throw new Error('Error in retrieving leaderboard'); 
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
