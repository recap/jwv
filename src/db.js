const {
	fiber,
	await,
	defer
} = require('synchronize');

const log = require('@triggi/triggi-lib-log');
const api = require('@triggi/triggi-lib-api');
const tls = require('@triggi/triggi-lib-service');
const querystring = require('querystring');

api.init(tls.token);

module.exports.createUnit = function(userId, details, cb) {
	fiber(function() {
		const accountId = await(getChannelAccountId(userId, defer()));
		const path = '/api/v1/channelaccounts/' + accountId + '/units';
		const response = await(api.post(path, userId, details, defer()));
		if (response.ok) {
			return response.responseData;
		} else {
			throw new Error('Could not create unit: ' + response.responseData);
		}
	}, cb);
}

module.exports.updateUnit = function(userId, unitId, unitUpdate, cb) {
	fiber(function() {
		const accountId = await(getChannelAccountId(userId, defer()));
		const path = ['/api/v1/channelaccounts/', accountId, '/units/', unitId].join('');
		return await(api.patch(path, userId, unitUpdate, defer()));
	}, cb);
};

module.exports.getUnitById = function(userId, unitId, cb) {
	fiber(function() {
		const accountId = await(getChannelAccountId(userId, defer()));
		const path = ['/api/v1/channelaccounts/', accountId, '/units/'].join('');
		const response = await(api.get(path, userId, defer()));
		if (response.ok) {
			let result = null;
			//console.log(response.responseData);
			response.responseData.every(unit => {
				if (unit._id === unitId) {
					result = unit;
					return false;
				}
				return true;
			});
			return result;
		} else {
			throw new Error('Could not get unit: ' + response.responseData);
		}
	}, cb);
}

module.exports.deleteUnit = function(userId, unitId, cb) {
	fiber(function() {
		const accountId = await(getChannelAccountId(userId, defer()));
		const path = '/api/v1/channelaccounts/' + accountId + '/units/' + unitId;
		const response = await(api.delete(path, userId, defer()));
		if (response.ok) {
			//cb(null, response.responseData);
			return response.responseData;
		} else {
			throw new Error('Could not delete unit: ' + response.responseData);
		}
	}, cb);
}

module.exports.getAllUnits = function(query, cb) {
	fiber(function() {
		const q = querystring.stringify(query)
		const path = '/api/v1/management/channelaccounts/' + tls.service.getChannelName() + '/units?' + q;
		const response = await(api.get(path, null, defer()));
		if (response.ok) {  
			 return response.responseData || []; 
		}
		return [];
	}, cb);
}

module.exports.getChannelAccount = function(userId, cb) {
	fiber(function() {
		const path = '/api/v1/channelaccounts?channel=' + tls.service.getChannelName();
		const response = await(api.get(path, userId, defer()));
		if (response.ok) {
			return response.responseData[0];
		} else {
			throw new Error('Could not get channelAccount: ' + response.responseData);
		}
	}, cb);
}

function getChannelAccountId(userId, cb) {
	fiber(function() {
		const channelAccount = await(module.exports.getChannelAccount(userId, defer()));
		return channelAccount._id;
	}, cb);
}
