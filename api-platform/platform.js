var shell = require('shelljs');
var chalk = require("chalk");
var Prometheus = require('./daemon')

//Program-level constants
const _ = undefined;

//Testing constants
const containerIDs = ["7295434","34554466","6857458"]





 
let daemon = new Prometheus.PrometheusDaemon(_,.5,500,"user123")
daemon.startMonitoring(500)
containerIDs.forEach((id)=>{
  console.log(chalk.gray("Enqueuing " + id.toString()))
  daemon.containerQueue.enqueue({cpus:.2, memory:100},1,id)
})



process.on('SIGINT', () => {
  console.log(chalk.red("[Prometheus] Shutdown signal recieved, performing cleanup."));
  
  daemon.stopMonitoring();
  daemon.killContainers(daemon.getRunningContainers());
  // Exit with status code 0 (success)
});