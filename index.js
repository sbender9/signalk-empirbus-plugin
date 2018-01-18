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

// Key path according to EmpirBus Application Specific PGN Data Model 2 (2x word + 8x bit) per instance:
// 2x dimmer values 0 = off .. 1000 = 100%, 8x switch values 0 = off / 1 = on
//
// electrical.empirBusNxt.<NXT component instance 0..49>.dimmer.<#1..2>.value
// electrical.empirBusNxt.<NXT component instance 0..49>.switch.<#1..8>.value


const debug = require("debug")("signalk-empirbusnxt")
const path = require('path')
const Concentrate = require("concentrate");
const Bitfield = require("bitfield")
const Int64LE = require('int64-buffer').Int64LE

const manufacturerCode = 304 // According to http://www.nmea.org/Assets/20140409%20nmea%202000%20registration%20list.pdf
const pgnNumber = 65280 // NMEA2000 Proprietary PGN 65280 – Single Frame, Destination Address Global
const pgnAddress = 255 // Device to send to, 255 = global address, used for sending addressed messages to all nodes

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options
  var empirBusInstance

  plugin.id = "signalk-empirbus-nxt";
  plugin.name = "EmpirBus NXT Control";

  plugin.start = function(theOptions) {
    options = theOptions

    debug("start");

    app.on('N2KAnalyzerOut', listener)
  }

  var listener = (msg) => {
    if ( msg.pgn == pgnNumber && pgn['Manufacturer Code'] == manufacturerCode ) {
      const instancePath = 'electrical.empirBusNxt' // Key path: electrical.empirBusNxt.<instance>.dimmer/switch.<#>.state/value

      var status = readData(msg.fields['Data'])

      var values = status.dimmers.map((value, index) => {
        return {
          path: `${instancePath}.${status.instance}.dimmers.${index}.state`,
          value: value / 1000.0
        }
      })

      values = values.concat(status.switches.map((value, index) => {
        return {
          path: `${instancePath}.${status.instance}.switches.${index}.state`,
          value: value ? 'on' : 'off'
        }
      })
                                      

      app.handleMessage(plugin.id, {
        updates: [
          {
            timestamp: (new Date()).toISOString(),
            values: values
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

      var pgn_data = Concentrate()
          .tinyInt(manufacturerCode, 11)
          .tinyInt(0x00) //Reserved
          .tinyInt(4, 3) //Industry code?
      
          //Data 4x dimmer values + 8x switch states according to "Data Model 1"     
          .uint8(<dimmer1.value>)
          .uint8(<dimmer2.value>)
          .uint8(<dimmer3.value>)
          .uint8(<dimmer4.value>)
      
          .tinyInt(<switch1.state>, 1)
          .tinyInt(<switch2.state>, 1)
          .tinyInt(<switch3.state>, 1)
          .tinyInt(<switch4.state>, 1)
          .tinyInt(<switch5.state>, 1)
          .tinyInt(<switch6.state>, 1)
          .tinyInt(<switch7.state>, 1)
          .tinyInt(<switch8.state>, 1)
                 

      .result()

      // Send out to all devices with pgnAddress = 255
      app.emit('nmea2000out',
               toActisenseSerialFormat(pgnNumber, pgn_data, pgnAddress)) 
    })
  }

  plugin.schema = {
    title: "Empire Bus NXT",
    type: 'object',
    properties: {
      dataModel: {
        title: 'Data Model',
        type: number,
        enum: [ 1, 2, 3, 4, 5],
        enumNames: [ 'Model 1', 'Model 2', 'Model 3', 'Model 4', 'Model 5']
      }
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

function readData(data) {
  var buf = new Int64LE(Number(data)).toBuffer()

  var instance = buf.readUInt8(2)
      
  var dimmers = [ buf.readUInt16(3), buf.readUInt16(4) ]

  var fields = new Bitfield(buf.slice(4))
  var switches = []
  for ( var i = 0; i < 8; i++ ) {
    switches.push(fields.get(i))
  }
  return { instance: instance, dimmers: dimmers, switches: switches }
}
