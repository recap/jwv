const fs = require('fs');
const {NodeVM} = require('vm2');
const randomstring = require('randomstring');
const lambda = require('./src/lambda');

const myArgs = process.argv.slice(2);
const context = JSON.parse(myArgs[1]);
const runTimes = parseInt(myArgs[2]) || 1;


setTimeout(()=>{
	console.log("running");
	lambda.run("setTimeout(()=>{while(true){console.log('in func')};}, 0);", {}, 'once', 'TEST4545', null);
	//lambda.run(code, context, 'once', unitId, null);
}, 0);

