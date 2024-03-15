const { PrometheusDaemonManager } = require('./manager');
const { PrometheusDaemon } = require('./daemon');
const SECONDS = 1000;
jest.setTimeout(70 * SECONDS)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


describe('Tests for full deployment and use lifecycle', () => {
    let manager;
    //const processID = 'testProcess';
    const containerIDs = ['12345', '31234'];
    const maxMemory = 100;
    const cpus = 0.5;

    beforeEach(() => {
        const ports = Array.from({ length: 101 }, (_, index) => 5000 + index);
        manager = new PrometheusDaemonManager(5,500,ports);
        manager.startMonitoring(1);
      });


    test('Queue and Start Process, Initialize a Container, and kill Process.', async () =>  {

      //Simulate user sending START request which gets placed on queue.
      manager.addMessageToQueue({type: "START", body:{processID: 'testProcess',ports:4,cpu:.5,memory:500,uptime:20,interval:50}});


      await sleep(10);

      expect(Object.keys(manager.daemons).length).toBe(1) //Initialized
      expect(manager.ports.size).toBe(101-4) //Ports allocated

      //Simulate user sending request to start container
      manager.initializeContainer('testProcess',{cpus:.5, memory:500,priority:1,containerID: 345674,model:"/api-platform/Pythagoras"}); //May take a while
      await sleep(100);
      expect(manager.daemons['testProcess'].containerStack.stack.length).toBe(1);
      await sleep(30000);
      expect(manager.daemons['testProcess'].containerStack.stack.length).toBe(0)
    });
});




