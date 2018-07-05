const fs = require('fs');
const {
	NodeVM
} = require('vm2');
const util2 = require('util');
const esprima = require('esprima');
const escodegen = require('escodegen');
const randomstring = require('randomstring');
const Fiber = require('fibers');

const {
	await,
	defer,
	fiber
} = require('synchronize');

const config = require('../config');

const lambdaMap = {};

function transformJS(js, timeout) {
	const ast = esprima.parse(js);
	const context = {};
	context['_global'] = {};
	context['Fiber'] = require('fibers');
	const gTime = randomstring.generate();
	const gFactory = randomstring.generate();
	const gFunctions = randomstring.generate();
	const gFiberTimeout = randomstring.generate();
	context[gTime] = null;
	const timerFunctions = [];

	function timerFactory(timeout, globalMax, globalTimer, naughtyLoopCounter) {
		let t1 = null;
		let t2 = null;
		let counter = 0;

		function yield(ms) {
			const fiber = Fiber.current;
			if (!fiber) {
				console.log("not fiber");
				counter++;
				return (counter < naughtyLoopCounter);
			}
			setTimeout(() => {
				fiber.run();
			}, ms);
			Fiber.yield();
			return true;
		}
		return function() {
			if (!t1) {
				t1 = new Date();
			}
			t2 = new Date();
			return yield(10) && (t2 - t1) < timeout && (t2 - globalTimer) < globalMax;
		}
	}

	function digg(tree) {
		const keys = Object.keys(tree);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const e = tree[key];
			if (e == null) {
				continue;
			}
			if (typeof e === 'object' && e) {
				digg(e);
			}
			if (e.type && (e.type === 'WhileStatement' ||
					e.type === 'ForStatement' ||
					e.type === 'DoWhileStatement' ||
					e.type === 'ArrowFunctionExpression' ||
					e.type === 'FunctionDeclaration' ||
					e.type === 'FunctionExpression')) {

				const obfTimer = randomstring.generate();
				context[obfTimer] = gFactory;
				timerFunctions.push(obfTimer);

				const injection = esprima.parse('if (!' + obfTimer + '()) { throw new LambdaException("Lambda Timeout", lambdaId);}');
				e.body.body.unshift(injection.body[0]);

			}
			if (e.type && e.type === 'Identifier' && e.name === 'global') {
				e.name = '_global';
			}
			if (e.type && e.type === 'Identifier' && e.name === 'setTimeout') {
				e.name = gFiberTimeout;
			}
		}
	}
	digg(ast.body);

	context[gFunctions] = timerFunctions;
	context['LambdaException'] = function(message, id) {
		this.message = message;
		this.name = 'LambdaException';
		this.id = id;
	}
	ast.body.unshift(esprima.parse(timerFactory.toString().replace('timerFactory', gFactory)).body[0]);

	const reMapTimers = gFunctions + '.forEach(f=>{ global[f] = ' + gFactory + '(10000, 3000, ' + gTime + ', 10);});';
	ast.body.unshift(esprima.parse(reMapTimers).body[0]);

	const newTimeoutFunc = "function " + gFiberTimeout + "(functionToExecute, delay) { return setTimeout(function () { Fiber(()=> {  functionToExecute() }).run(); }, delay);}"
	ast.body.unshift(esprima.parse(newTimeoutFunc).body[0]);

	ast.body.unshift(esprima.parse(gTime + ' = new Date();').body[0]);

	const newCode = "Fiber(function() { \n" + escodegen.generate(ast) + "}).run()";
	return {
		code: newCode,
		oldcode: js,
		context: context
	}
}

process.on('uncaughtException', (err) => {
	if (err.name === 'LambdaException') {
		if (err.id === 'TEST4545') {
			console.log('test run OK');
		} else {
			console.log("[LAMBDA] " + err.id + " " + err.message);
		}
	}
});

function initContext(icontext, lambdaId) {
	const context = icontext || {};
	context['lambdaId'] = lambdaId;
	if (context.libs) {
		context.libs.forEach(l => {
			context[l] = require(l);
		});
	}
	delete context['libs'];

	return context;
}

module.exports.run = run;

function run(code, params, schedule, lambdaId) {
	if (!code) {
		return;
	}
	let lambda = null;
	let tryCounter = 0;

	while (!lambda && tryCounter < 10) {
		try {
			lambda = transformJS(code);
		} catch (e) {
			tryCounter++;
			if (e && tryCounter >= 10) {
				log.e(e);
			}
		}
	}

	if (!lambda) {
		return;
	}

	const context = initContext(params, lambdaId);

	Object.keys(lambda.context).forEach(key => {
		const value = lambda.context[key];
		context[key] = value;
	});

	const vm = new NodeVM({
		console: 'inherit',
		sandbox: context
	});

	setTimeout(() => {
		vm.run(lambda.code);
	}, 0);
}
