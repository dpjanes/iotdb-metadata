/*
 *  index.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-10-11
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var iotdb = require('iotdb');
var _ = iotdb.helpers;

var FSTransport = require('iotdb-transport-fs').Transport;
var IOTDBTransport = require('iotdb-transport-iotdb').Transport;

var logger = iotdb.logger({
    name: 'iotdb-metadata-fs',
    module: 'index',
});

/**
 *  This is automatically called by IOTDB 
 *  if installed using 'homestar install'.
 *
 *  Basically, this module:
 *  - loads metadata and startup
 *  - loads metadata when things are created
 *  - saves metadata when it is changed
 */
var setup = function() {
    var metadata_transporter = new FSTransport({
        prefix: ".iotdb/things",
        user: iotdb.users.owner(),
    });

    var iotdb_transporter = new IOTDBTransport({
        user: iotdb.users.owner(),
        /*
        authorize: function (authd, callback) {
            authd = _.defaults({}, authd);
            authd.store = "things";

            iotdb.users.authorize(authd, callback);
        },
        */
    }, iotdb.iot().things());

    // When things are changed, save their metata
    iotdb_transporter.updated({}, function (ud) {
        if (ud.band !== "meta") {
            return;
        }

        ud = _.shallowCopy(ud);
        ud.value = _.shallowCopy(ud.value);

        delete ud.value["iot:controller.session-timestamp"];
        delete ud.value["iot:controller.machine-id"];
        delete ud.value["iot:thing"];
        delete ud.value["iot:reachable"];

        metadata_transporter.put(ud, _.noop);
    });

    // When things are discovered, load their metadata from the FS
    var _back_copy = function (ld) {
        if (!ld.id) {
            return;
        }

        metadata_transporter.get({
            id: ld.id,
            band: "meta",
        }, function (gd) {
            if (gd.value) {
                iotdb_transporter.put(gd, _.noop);
            }
        });
    };

    iotdb_transporter.added(_back_copy);
    iotdb_transporter.list(_back_copy);
};

/**
 *  API
 */
exports.setup = setup
