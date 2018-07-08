const express = require('express');
const bodyParser = require('body-parser');
const lambda = require('./src/lambda.js');
const beautify = require('js-beautify').js

const config = require('./config.json');
const app = express();
const objDB = {};
const cbDB = {};
const funcDB = {};
const serveFolder = [
	__dirname, 
	'/', 
	'public'
].join('');

app.use(express.static(serveFolder));

app.use(bodyParser.json());

app.get('/u/:key', (req, res) => {
	const key = req.params.key;
	const parts = key.split('.');
	const result = get(parts, objDB);
	
	if (result) {
		res.status(200).send(JSON.stringify(result));
		return;
	}

	res.status(404).send();
});



app.put('/f/:function', (req, res) => {
	const functionName = req.params.function;
	const functionBody = req.body.function;
	funcDB[functionName] = functionBody;
	res.status(200).send("OK");
});

app.get('/l/:function', (req, res) => {
	const functionName = req.params.function;
	const functionBody = funcDB[functionName];
	if (functionBody) {
		res.status(200).send(beautify(functionBody));
	} else {
		res.status(404).send("");
	}
});

app.get('/f/:function', (req, res) => {
	const functionName = req.params.function;
	if (!funcDB[functionName]) {
		res.status(404).send();
	}
	lambda.run(funcDB[functionName],{
		res:res,
		objDB:objDB,
		get:function(key) {
			const k = key.split('.');
			return get(k, objDB);
		}
	},
	'once',
	'TEST4545', null);
});



function get(parts, obj) {
	const k = parts.shift();
	if (parts.length === 0) {
		return obj[k];
	}
	if(!obj[k]) {
		return undefined;
	}
	obj = obj[k];
	const r = get(parts, obj);
	console.log("rec: " + r);
	return r;
}

function put(parts, value, obj) {
	const k = parts.shift();
	if(!obj[k]) {
		obj[k] = {};
	}
	if (parts.length === 0) {
		obj[k] = value;
		return obj;
	}

	obj = obj[k];
	put(parts, value, obj);
}

app.put('/u/:key', (req, res) => {
	const key = req.params.key;
	const cb = req.body.callback;
	if (!key) {
		res.status(400).send();
		return;
	}
	const parts = key.split('.');
	put(parts, req.body.value, objDB);

	let resTakeover = false;
	if (cb) {
		put(key.split('.'), cb, cbDB);
	}
	const registeredCb = get(key.split('.'), cbDB);
	if (funcDB[registeredCb]) {
		resTakeover = true;
		lambda.run(funcDB[registeredCb],{
			res:res,
			objDB:objDB,
			get:function(key) {
				const k = key.split('.');
				return get(k, objDB);
			}
		},
		'once',
		'TEST4545', null);
	}

	if(!resTakeover) { 
		res.status(200).send('OK');
	}
});



app.listen(config.port);
