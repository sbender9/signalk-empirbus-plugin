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
// electrical.empirBusNxt.<NXT component instance 0..49>.dimmers.<#1..2>.state
// electrical.empirBusNxt.<NXT component instance 0..49>.switches.<#1..8>.state


const debug = require("debug")("signalk-empirbusnxt")
const path = require('path')
const Concentrate2 = require("concentrate2");
const Bitfield = require("bitfield")
const Int64LE = require('int64-buffer').Int64LE

const manufacturerCode = 304 // According to http://www.nmea.org/Assets/20140409%20nmea%202000%20registration%20list.pdf
const pgnApiNumber = 65280 // NMEA2000 Proprietary PGN 65280 – Single Frame, Destination Address Global
const pgnIsoNumber = 059904 // NMEA 2000 ISO request PGN 059904 - Single Frame, Destination Address Global
const pgnAddress = 255 // Device to send to, 255 = global address, used for sending addressed messages to all nodes
const instancePath = 'electrical.empirBusNxt' // Key path: electrical.empirBusNxt.<instance>.dimmers/switches.<#>.state


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

    app.on("pipedProvidersStarted", (config) => {
      config.pipeElements.forEach(function(element) {
        var sendit = false
        if ( typeof element.options != 'undefined' ) {
          if ( typeof element.options.toChildProcess != 'undefined'
               && element.options.toChildProcess == 'nmea2000out' )
          {
            sendit = true
          }
          else if ( element.type == 'providers/simple'
                    && element.options.type == 'NMEA2000' ) {
          }
        }
        if ( sendit ) {
          sendStatusRequest()
        }
      })
    })
  }
           
  var listener = (msg) => {
    if ( msg.pgn == pgnApiNumber && pgn['Manufacturer Code'] == manufacturerCode ) 
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
      }))
                                      

      app.handleMessage(plugin.id, {
        updates: [
          {
            timestamp: (new Date()).toISOString(),
            values: values
          }
        ]
      })
  }
  
  plugin.stop = () => {
    app.removeListener('N2KAnalyzerOut', listener)
  }

  plugin.registerWithRouter = (router) => {
    router.post('/:instance/:switch_or_dimmer/:switch/:state', (req, res) => {
      const instance = req.params.instance
      const switch_or_dimmer = req.params.switch_or_dimmer == 'switch' ? 'switches' : 'dimmers'
      const aswitch = req.params.switch
      const state = req.params.state

      var current_state = _.get(app.signalk, `${instancePath}.${instance}`)

      if ( _.isUndefined(current_state) ) {
        res.status(501)
        res.send('No current state')
        return
      }

      //make a copy since we're going to modify it
      current_state = JSON.parse(JSON.stringify(current_state))

      current_state[switch_or_dimmer][aswitch].state.value = state

      var concentrate = Concentrate2()
      
          // FIXME: Do we need to send that? If yes how?
          .tinyInt(manufacturerCode, 11)
          .tinyInt(0x00) //Reserved
          .tinyInt(4, 3) //Industry code?
      
          // PGN 65280 CAN Identifier
          // ID:        Complete 29Bit Identifier = 0x1CFF00XX, where XX is SA of 3rd party device
          // Priority:  0x07
          // EDP:       0
          // DP:        0
          // PF:        0xFE
          // PS:        0x04 (Group Extention)
          // Source Address: [0...252] assumed to be handeled by Actisense NGT-1?
          .uint32(0x1CFF0000,29) // FIXME: Is this a 29bit format?
      
          // Frame Data Contents according to EmpirBus Application Specific PGN
          // Header required by NMEA2000 Protocol to contain IdentifierTag defined by Manufacturer Code
          // Byte 0 EmpirBus fixed value 0x30
          // Byte 1 EmpirBus fixed value 0x99
          .uint8(0x30)
          .uint8(0x99)

          // Byte 2 Instance 0..49, Unique Instance Field to distinguish / route the data
          .uint8(instance)  // Instance of EmpirBus API component to send states to

          // Byte 3 .. byte 7 user data payload according to "Data Model 2"
          // 2x Dimmer states as uword/uint(16) + 8x Switch states as 1 Bit
          .uint16(current_state.dimmers['0'].state.value * 1000.0)     // Dimmer state converted back to EmpirBus format 0...1000
          .uint16(current_state.dimmers['1'].state.value * 1000.0)     
      
      for ( var i = 0; i < 8; i++ ) {
        concentrate.tinyInt(current_state.switches[i.toString()].state.value == "off" ? 0 : 1, 1) // Switch state converted back to EmpirBus format 0/1
      }
      
      var pgn_data = concentrate.result()
      
      // Send out to all devices by pgnAddress = 255
      app.emit('nmea2000out',
               toActisenseSerialFormat(pgnApiNumber, pgn_data, pgnAddress)) 
    })
  }

  function sendStatusRequest() {
    
    // An ISO request PGN 059904 may be done to PGN 65280 on poweron for “easy sync”. 
    // The ISO request will result in the NXT transmitting all configured instances of PGN 65280, 
    // allowing a 3rd party product to “sync in” when it is powered up. 
        
    var pgn_data = Concentrate2()

        // FIXME: Do we need to send that? If yes how?
        .tinyInt(manufacturerCode, 11)
        .tinyInt(0x00) //Reserved
        .tinyInt(4, 3) //Industry code?
    
        // PGN 059904 CAN Identifier
        // ID:        Complete 29Bit Identifier = 0x1CEAFFXX, where XX is SA of 3rd party device
        // Priority:  0x07
        // EDP:       0
        // DP:        0
        // PF:        0xEA
        // PS:        0xFF (Global)
        // Source Address: [0...252] assumed to be handeled by Actisense NGT-1?
        .uint32(0x1CEAFF00,29) // FIXME: Is this a 29bit format?
    
        // Frame Data Contents 0x00 0xFF 0x00 0xFF 0xFF 0xFF 0xFF 0xFF
        .uint8(0x00)
        .uint8(0xff)
        .uint8(0x00)
        .uint8(0xff)
        .uint8(0xff)
        .uint8(0xff)
        .uint8(0xff)
        .uint8(0xff)
        .result()
    
    app.emit('nmea2000out',
             toActisenseSerialFormat(pgnIsoNumber, pgn_data, 255)) 
  }

  plugin.schema = {
    title: "Empire Bus NXT",
    type: 'object',
    properties: {
      /*
      dataModel: {
        title: 'Data Model',
        type: number,
        enum: [ 1, 2, 3, 4, 5],
        enumNames: [ 'Model 1', 'Model 2', 'Model 3', 'Model 4', 'Model 5']
      }
      */
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
