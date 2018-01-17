/*
 * Copyright 2018 Scott Bender (scott@scottbender.net)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const debug = require("debug")("signalk-empirebus")
const path = require('path')

const manufacturerCode = 10 //Needs updated

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options
  var empireBusInstance

  plugin.id = "signalk-empiebus-nxt";
  plugin.name = "EmpirBus NXT Control";

  plugin.start = function(theOptions) {
    options = theOptions

    debug("start");

    app.on('N2KAnalyzerOut', listener)
  }

  var listener = (msg) => {
    if ( msg.pgn == 65280 && pgn['Manufacturer Code'] == manufacturerCode ) {
      const instancePath = 'electrical.switchbank.0'

      app.handleMessage(plugin.id, {
        updates: [
          {
            timestamp: (new Date()).toISOString(),
            values: [
              {
                path: `${instancePath}.cabinLight.state`,
                value: 'on'
              },
              {
                path: `${instancePath}.anchorLight.state`,
                value: 'off'
              }]
          }
        ]
      })
    }
  }
  
  plugin.stop = () => {
    app.removeListener('N2KAnalyzerOut', listener)
  }

  plugin.registerWithRouter = (router) => {
    router.post('/:bus/:switch/:state', (req, res) => {
      const bus = req.params.bus
      const aswitch = req.params.switch
      const state = req.params.state

      var data = [
        //ManufacturerCode, Reserved, Inductry Code, Data
        0x00,
        0x00,

        //Data
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00
      ]

      //FIXME: need a way to know the n2k device to send to
      app.emit('nmea2000out',
               toActisenseSerialFormat(65280, pgn_data, 123)) 
    })
  }

  plugin.schema = {
    title: "Empire Bus",
    type: 'object',
    properties: {
    }
  }
  
  return plugin;
}


function toActisenseSerialFormat(pgn, data, dst) {
  dst = _.isUndefined(dst) ? '255' : dst
  return (
    new Date().toISOString() +
      ",2," +
      pgn +
      `,0,${dst},` +
      data.length +
      "," +
      new Uint32Array(data)
      .reduce(function(acc, i) {
        acc.push(i.toString(16));
        return acc;
      }, [])
      .map(x => (x.length === 1 ? "0" + x : x))
      .join(",")
  );
}
