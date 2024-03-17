const { PlatformDaemon } = require("./platformDaemon");
const csv = require('csv-parser');
const fs = require('fs');
const chalk = require('chalk');
const { default: container } = require("node-docker-api/lib/container");

class AthenaDaemon extends PlatformDaemon {
    constructor( port, maxCPU, maxMemory, processID, maxUptime) {
        super( port, maxCPU, maxMemory, processID, maxUptime,0,"Athena");
    }

    async evaluateModel(filePath, containerID, columnNamesX, columnNamesY, metric) {
        const results = [];
        const readStream = fs.createReadStream(filePath);
    
        const readCSV = new Promise((resolve, reject) => {
            readStream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results)) // Resolve with results
                .on('error', error => reject(error));
        });
    
        const csvResults = await readCSV; // Now this contains the results directly
    
        const labels = csvResults.map(row => row[columnNamesY]);
    
        // Wrap the entire operation in a promise to be awaited
        const score = await new Promise(async (resolve, reject) => {
            await this.checkUntilHealthy(containerID, 10000, 6, async () => {
                try {
                    const predictions = await Promise.all(csvResults.map(row => {
                        const body = this.bodyMapper(row, columnNamesX, columnNamesY).inputs;
                        return this.forward({ containerID, body }).then(response => JSON.parse(response).result);
                    }));
                    const calculatedScore = this.model_performance(predictions, labels, metric);
                    console.log(`Final score ${metric}: ${calculatedScore}`);
                    resolve({ score: calculatedScore }); // Resolve the promise with the score
                } catch (error) {
                    reject(error); // In case of error, reject the promise
                }
            });
        });
    
        return score; // Return the awaited score from the promise
    }
    

    async checkUntilHealthy(containerTag, retryInterval = 10000,attempts = 5, fn) {
        if(attempts){
            try {
                const status = await this.checkContainerHealth(containerTag);
                if (status.status=="healthy") {
                    console.log('Container is healthy.');
                    fn();
                } else {
                    console.log('Container is not healthy yet. Retrying...');
                    setTimeout(async () => await this.checkUntilHealthy(containerTag, retryInterval,attempts-=1, fn), retryInterval, );
                }
            } catch (error) {
                console.error('Error checking container health:', error);
                setTimeout(async () => await this.checkUntilHealthy(containerTag, retryInterval,attempts-=1, fn));
            }
        } else{
            console.log('Error checking container health:'); 
        }
    }


    bodyMapper(row, inputColumns, outputColumns) {
        let requestBody = { inputs: {}, outputs: {} };
        
        // Assuming inputColumns and outputColumns are arrays of column names
        inputColumns.forEach(columnName => {
          requestBody.inputs[columnName] = row[columnName];
        });
      
        outputColumns.forEach(columnName => {
          requestBody.outputs[columnName] = row[columnName];
        });
      
        return requestBody;
    }

    //calculate performance
    model_performance(predictions, labels,metric){
        //Regression Metrics

        //MAE
        if(metric === 'mae'){
            let sum = 0;
            for (let i = 0; i < predictions.length; i++) {
                sum += Math.abs(labels[i] - predictions[i]);
            }
            return sum / predictions.length;
        }
        //MSE
        if(metric === 'mse'){
            let sum = 0;
            for (let i = 0; i < predictions.length; i++) {
                sum += Math.pow(labels[i] - predictions[i], 2);
            }
            return sum / predictions.length;
        }
        //RMSE
        if(metric === 'rmse'){
            let sum = 0;
            for (let i = 0; i < predictions.length; i++) {
                sum += Math.pow(labels[i] - predictions[i], 2);
            }
            return Math.sqrt(sum / predictions.length);
        }
        //R-squared
        if(metric === 'r2'){
            const mean = labels.reduce((a, b) => a + b) / labels.length;
            const ssTot = labels.reduce((acc, cur) => acc + Math.pow(cur - mean, 2), 0);
            const ssRes = predictions.reduce((acc, cur, i) => acc + Math.pow(cur - labels[i], 2), 0);
            return 1 - (ssRes / ssTot);
        }
        //Classification Metrics(DO LATER)
        //Accuracy
        if(metric === 'accuracy'){
            let correct = 0;
            for (let i = 0; i < predictions.length; i++) {
                if (predictions[i] === labels[i]) {
                    correct++;
                }
            }
            return correct / predictions.length;
        }
        //Precision
        if(metric === 'precision'){
            const truePositives = 0;
            const falsePositives = 0;
            return truePositives / (truePositives + falsePositives);
        }
        //Recall
        if(metric === 'recall'){
            const truePositives = 0;
            const falseNegatives = 0;
            return truePositives / (truePositives + falseNegatives);
        }
        //F1 score
        if(metric === 'f1'){
            const truePositives = 0;
            const falsePositives = 0;
            const falseNegatives = 0;
            const precision = truePositives / (truePositives + falsePositives);
            const recall = truePositives / (truePositives + falseNegatives);
            return 2 * (precision * recall) / (precision + recall);
        }

    }


    isPredictionCorrect(expected, predicted) {
        const threshold = 0.1;
        return Math.abs(expected - predicted) < threshold;
    }
}

module.exports = AthenaDaemon;
