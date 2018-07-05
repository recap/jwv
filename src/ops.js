const tls = require('@triggi/triggi-lib-service');
const tk = tls.token;
const express = tls.express;
const util = require('@triggi/triggi-lib-util');
const log = require('@triggi/triggi-lib-log');
const {
	await,
	defer,
	fiber
} = require('synchronize');

const db = require('./db');

const router = tls.express.Router();
const lambdaCache = {};

router.put('/', util.checkLogin, function(req, res) {
	const userId = tk.getId(req);
	log.i("update unit for user: ", userId);
	fiber(function() {
		const unitId = req.body.id;
		const updateResponse = await (db.updateUnit(userId, unitId, req.body, defer()));
		if (updateResponse.ok) {
			log.i("updated unit: ", unitId);
		}
		return res.status(updateResponse.statusCode).send(updateResponse.responseData);
	}, util.defaultExpressFailHandler(req, res));
});

router.delete('/:id', util.checkLogin, function(req, res) {
	fiber(function() {
		const unitId = req.params.id;
		const userId = tk.getId(req);
		log.i('Deleting unit ' + unitId + ' for user ' + userId);

		const deletedUnit = await (db.deleteUnit(userId, unitId, defer()));
		res.status(200).send(deletedUnit);
	}, util.defaultExpressFailHandler(req, res));
});

router.get('/', function(req, res) {
	log.d("test");
	res.status(200).send("ok");
});

router.post('/', util.checkLogin, util.checkBodyArgs(['name', 'details']), function(req, res, next) {
	fiber(function() {
		log.d(req.body);

		const userId = tk.getId(req);
		const channelAccount = await (db.getChannelAccount(userId, defer()));
		const internalId = req.body.details.internalId;
		const type = req.body.type;

		const unitData = {
			name: req.body.name,
			channelAccount: channelAccount._id,
			owner: userId,
			type: type,
			details: req.body.details
		}
		if (internalId) {
			unitData.internalId = internalId;
			unitData.details.internalId = internalId;
			unitData.endpoint = tls.service.createUnitEndpoint(internalId);
		}
		const newUnit = await (db.createUnit(userId, unitData, defer()));


		/*if (!lambdaCache[channelAccount._id]) {

			lambdaCache[channelAccount._id] = true;

			const triggCreationEvent = service.subscribe('channels', 'management.triggs.update.' + channelAccount._id);

			triggCreationEvent.onMessage(function(message, header, info, metaData) {
				message.trigg.usedUnits.forEach(unit => {
					if (unit.startsWith("lambda")) {
						const unitId = unit.split('.')[1].replace('\s+', '');
						log.v(message);

						
					}
				});
			});
		}*/


		res.status(201).send(newUnit);
	}, util.defaultExpressFailHandler(req, res));
});

module.exports = router;
