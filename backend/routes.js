const url = require('url');
const userController = require('./controllers/userController');
const competitionController = require('./controllers/competitionController'); 

function processRequest(req, res){
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === '/') { //Test Endpoint
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: "Hi \ud83d\ude00" }));
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
        }
    
    /** 
    YOUR ENDPOINT HERE
    **/

    } else if (pathname === '/competitions'){ // Competitions Endpoint
        if (req.method === 'GET'){
            // View All Competitions
            let body = '';
            
            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                
                const allCompetitions = await competitionController.viewAllCompetitions();  

                if (!allCompetitions || allCompetitions.length == 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Competitions not found' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: allCompetitions }));
            });


        } else if (req.method === 'POST'){
            // Create Competition

            let body = '';
            
            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                
                const {userid, title, deadline, prize, desc, cap, created} = JSON.parse(body);


                if (!userid || !title || !deadline || !prize || !desc || !cap) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Bad Request: Missing competition fields in JSON body' }));
                    return;
                }

                await competitionController.createCompetition(userid, title, deadline, prize, desc, cap, created); 
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: "Competition created!" }));
            });



        } else if (req.method === 'PATCH'){
            // Update Competition Details

            
        }

    } else if (pathname === '/users') { //Users Endpoint
        if (req.method === 'GET') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                const { id } = JSON.parse(body);
                if (!id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Bad Request: Missing user ID in JSON body' }));
                    return;
                }
                const user = await userController.readUserById(id);
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'User not found' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: user }));
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                const { username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token } = JSON.parse(body);
                userController.createUser(username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        } else if (req.method === 'PATCH') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                const { id, username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token } = JSON.parse(body);
                userController.updateUserById(id, username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        } else if (req.method === 'DELETE') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                const id = JSON.parse(body).id;
                userController.deleteUserById(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Endpoint Not Found' }));
    }    
}

module.exports = {
    processRequest
};
