function _asyncToGenerator(fn) {
    return function () {
        var gen = fn.apply(this, arguments);return new Promise(function (resolve, reject) {
            function step(key, arg) {
                try {
                    var info = gen[key](arg);var value = info.value;
                } catch (error) {
                    reject(error);return;
                }if (info.done) {
                    resolve(value);
                } else {
                    return Promise.resolve(value).then(function (value) {
                        step("next", value);
                    }, function (err) {
                        step("throw", err);
                    });
                }
            }return step("next");
        });
    };
}

const sdk = require('kinvey-flex-sdk');

var Botkit = require('botkit');
var bot_options = {
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    // debug: true,
    scopes: ['bot']
};
var controller = Botkit.slackbot(bot_options);
var bot = controller.spawn({});

sdk.service({ port: 3000 }, (err, flex) => {
    const flexFunctions = flex.functions;
    flexFunctions.register('postWorkOrders', postWorkOrders);
    flexFunctions.register('preSaveWOCount', preSaveWOCount);
    let postWorkOrders = (() => {
        var _ref2 = _asyncToGenerator(function* (context, complete, modules) {
            var allWorkorders = yield modules.dataStore().collection('workorders').find();
            var length = allWorkorders.length;
            var prevLength = modules.tempObjectStore.get('recordsCount');
            if (length !== prevLength) {
                bot.api.channels.list({
                    token: process.env.BOT_TOKEN
                }, function () {
                    var _ref = _asyncToGenerator(function* (err, res) {
                        for (channel in res.channels) {
                            const channelName = res.channels[channel].name;
                            if (channelName === "rotate_tires" || channelName === "change_oil" || channelName === "car_wash") {
                                var query = new modules.Query();
                                query.equalTo('serviceType', channelName);
                                query.ascending('_id');
                                query.equalTo('completed', 0);
                                const workorders = yield modules.dataStore().collection('workorders').find(query);
                                var list = '';
                                var index = 0;
                                for (workorderIndex in workorders) {
                                    const workorder = workorders[workorderIndex];
                                    const vehicleId = workorder.vehicleId;
                                    const vehicle = yield modules.dataStore().collection('vehicles').findById(vehicleId);
                                    const vehicleName = vehicle.model + ' ' + vehicle.make + ': ' + vehicle.registrationPLate;
                                    if (workorder.completed === 0) {
                                        list = list + '> `' + (index + 1) + '`) ' + vehicleName + '\n';
                                        index += 1;
                                    }
                                }
                                if (list === '') {
                                    bot.api.chat.postMessage({
                                        token: process.env.BOT_TOKEN,
                                        text: 'There are no pending vehicles for this service',
                                        channel: '#' + channelName
                                    });
                                } else {
                                    bot.api.chat.postMessage({
                                        token: process.env.BOT_TOKEN,
                                        text: 'List of vehicles pending for ' + channelName + ' service are as follows: \n' + list + 'Reply with `done _number_` to mark service as completed.',
                                        channel: '#' + channelName
                                    });
                                }
                            }
                        }
                        return complete().ok().done();
                    });

                    return function (_x, _x2) {
                        return _ref.apply(this, arguments);
                    };
                }());
            } else {
                return complete().ok().done();
            }
        });

        return function postWorkOrders(_x3, _x4, _x5) {
            return _ref2.apply(this, arguments);
        };
    })();

    function preSaveWOCount(context, complete, modules) {
        modules.dataStore().collection('workorders').find(function (err, workorders) {
            modules.tempObjectStore.set('recordsCount', workorders.length);
            complete().ok().next();
        });
    }
});