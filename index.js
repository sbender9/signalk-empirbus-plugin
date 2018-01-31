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
// electrical.controls.empirBusNxt-instance<NXT component instance 0..49>-switch<#0..7>.state
// electrical.controls.empirBusNxt-instance<NXT component instance 0..49>-dimmer<#0..1>.state

// electrical/controls/<ID>
// electrical/controls/<ID>/state  (on|off)
// electrical/controls/<ID>/brightness  (0..1)
// electrical/controls/<ID>/type   (switch/dimmer/relais/etc.)
// electrical/controls/<ID>/name   (System name of control. In EmpirBus devices are numbered 1..8, so device names numbered accordingly 1..8, e.g. Switch 0.8)
//
// electrical/controls/<ID>/meta/displayName   (Display name of control)
//
// electrical/controls/<ID>/associatedDevice (Address of device, e.g. {"instance":0,"switch":0} or {"instance":0,"dimmer":0})
// electrical/controls/<ID>/source (Information what plugin needs to take care of device)
// electrical/controls/<ID>/dataModel (Bus Data Model, e.g. from the EmpirBus programming)
//
// electrical/controls/<ID>/manufacturer/name
// electrical/controls/<ID>/manufacturer/model
//
// <ID> is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary decive address (systemname-deviceaddress), e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>
// <instance> is the ID of the respective EmpirBus NXT API component for 3rd party communication 0..49
// <#> is the ID of the dimmer (0..1) or switch (0..7)
// state is state of switch or dimmer 'on' or 'off'
// brightness the dimming value of dimmer from 0.000 to 1.000 (decimal)
// associatedDevice is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT {"instance":0,"switch":0} or {"instance":0,"dimmer":0}


const debug = require("debug")("signalk-empirbusnxt")
const path = require('path')
const Concentrate2 = require("concentrate2");
const Bitfield = require("bitfield")
const Int64LE = require('int64-buffer').Int64LE
const _ = require('lodash')

const manufacturerCode = "Empirbus" // According to http://www.nmea.org/Assets/20140409%20nmea%202000%20registration%20list.pdf
const pgnApiNumber = 65280 // NMEA2000 Proprietary PGN 65280 – Single Frame, Destination Address Global
const pgnIsoNumber = 059904 // NMEA 2000 ISO request PGN 059904 - Single Frame, Destination Address Global
const pgnAddress = 255 // Device to send to, 255 = global address, used for sending addressed messages to all nodes
const instancePath = 'electrical.controls' // Key path: electrical.controls.empirBusNxt-instance<NXT component instance 0..49>-switch|dimmer<#0..7>.state
const switchingIdentifier = 'empirBusNxt'


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

    app.on('N2KAnalyzerOut', plugin.listener)

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

  plugin.listener = (msg) => {

    if ( msg.pgn == pgnApiNumber && msg.fields['Manufacturer Code'] == manufacturerCode ) {
      var status = readData(msg.fields['Data'])
      app.handleMessage(plugin.id, createDelta(status))
    }
  }

  function createDelta(status) {
    var values = []
    status.dimmers.forEach((value, index) => {
      values = values.concat([
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.state`,
          value: value ? 'on' : 'off'
        },
        // FIXME: Do not save brightness=0 if dimmer is off, so last brightness can be restored when switching back on
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.brightness`,
          value: value / 1000.0
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.type`,
          value: "dimmer"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.name`,
          value: `Dimmer ${status.instance}.${Number(index)+1}`     // EmpirBus devices numbered 1..8
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.meta.displayName`,
          value: `Dimmer ${status.instance}.${Number(index)+1}`     // FIXME: Should be read from defaults.json
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.associatedDevice.instance`,
          value: status.instance                                   // Technical address: Instance in EmpirBus API
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.associatedDevice.device`,
          value: `dimmer ${status.instance}`                       // Technical address: Device in instance of EmpirBus
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.source`,
          value: switchingIdentifier
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.dataModel`,
          value: 2
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.manufacturer.model`,
          value: "NXT DCM"
        }
      ])
    })

      // FIXME: Code is very redundant
    status.switches.forEach((value, index) => {
      values = values.concat([
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${index}.state`,
          value: value ? 'on' : 'off'
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${index}.type`,
          value: "switch"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${index}.name`,
          value: `Switch ${status.instance}.${Number(index)+1}`     // In EmpirBus devices are numbered 1..8
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${index}.meta.displayName`,
          value: `Switch ${status.instance}.${Number(index)+1}`     // FIXME: Should be read from defaults.json
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.associatedDevice.instance`,
          value: status.instance                                   // Technical address: Instance in EmpirBus API
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${index}.associatedDevice.device`,
          value: `dimmer ${status.instance}`                       // Technical address: Device in inst^ance of EmpirBus
        },
        {
          path: `${instancePath}.${switchingIdentifier}:instance${status.instance}:switch${index}.source`,
          value: switchingIdentifier
        },
        {
          path: `${instancePath}.${switchingIdentifier}:instance${status.instance}:switch${index}.dataModel`,
          value: 2
        },
        {
          path: `${instancePath}.${switchingIdentifier}:instance${status.instance}:switch${index}.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${instancePath}.${switchingIdentifier}:instance${status.instance}:switch${index}.manufacturer.model`,
          value: "NXT DCM"
        }
      ])
    })


    return {
      updates: [
        {
          timestamp: (new Date()).toISOString(),
          values: values
        }
      ]
    }
  }
  plugin.createDelta = createDelta

  plugin.stop = () => {
    app.removeListener('N2KAnalyzerOut', plugin.listener)
  }

  plugin.registerWithRouter = (router) => {
    // EmpirBus handles only one value per device: state 'off' is brightness 0
    // So API PUT needs only one parameter
    // even though Signal K plugin stores state and brightness separately for HomeKit

    router.put('/controls/:identifier/:state', (req, res) => {
      const identifier = req.params.identifier
      const value = req.params.state

      // Now we need to collect states of all devices of this instances
      // Simple way: Relay on Data Model 2 to collect dimmers 0+1 and switches 0-7
      // Potential later complex way: Parse all electrical.controls and filter for associatedDevice.instance

      var current_state = _.get(app.signalk.self, `${instancePath}`)

      if ( _.isUndefined(current_state) ) {
        res.status(501)
        res.send('Unknown device: No current state')
        return
      }

      //make a copy since we're going to modify it
      current_state = JSON.parse(JSON.stringify(current_state))

      // Set respective parameter for dimmer or switch
      if ( identifier.indexOf('dimmer') ) {
        current_state[`${identifier}`].brightness.value = value
      } else {
        current_state[`${identifier}`].state.value = value
      }

      // Send out to all devices by pgnAddress = 255
      app.emit('nmea2000out', plugin.generateStatePGN(Number(current_state[`${identifier}`].associatedDevice.instance.value), current_state))

      // Signal K keys are not updated here, as EmpirBus implemenation needs to answer with new device state PNG for keys update
    })
  }

  plugin.generateStatePGN = (instance, state) => {
    var concentrate = Concentrate2()

    // PGN 65280 Frame Data Contents according to EmpirBus Application Specific PGN
    // Header required by NMEA2000 Protocol to contain IdentifierTag defined by Manufacturer Code
    // Byte 0 + Byte 1 EmpirBus manufacturer code and industry code: 0x30 0x99 = { "Manufacturer Code": "Empirbus","Industry Code":"Marine" }
        .uint8(0x30)
        .uint8(0x99)

    // Byte 2 Instance 0..49, Unique Instance Field to distinguish / route the data
        .uint8(instance)  // Instance of EmpirBus API component to send states to

    // Byte 3 .. byte 7 user data payload according to "Data Model 2"
    // 2x Dimmer states as uword/uint(16) + 8x Switch states as 1 Bit
    .uint16(state[`${switchingIdentifier}-instance${instance}-dimmer0`].brightness.value * 1000.0)     // Dimmer state converted back to EmpirBus format 0...1000
    .uint16(state[`${switchingIdentifier}-instance${instance}-dimmer1`].brightness.value * 1000.0)

    for ( var i = 0; i < 8; i++ ) {
console.log(state)
console.log(state[`${switchingIdentifier}-instance${instance}-switch${i}`])
      concentrate.tinyInt(state[`${switchingIdentifier}-instance${instance}-switch${i}`].state.value == "off" ? 0 : 1, 1) // Switch state converted back to EmpirBus format 0/1
    }

    var pgn_data = concentrate.result()

    // Send out to all devices by pgnAddress = 255
    return toActisenseSerialFormat(pgnApiNumber, pgn_data, pgnAddress)
  }

  function sendStatusRequest() {

    // An ISO request PGN 059904 may be done to PGN 65280 on poweron for “easy sync”.
    // The ISO request will result in the NXT transmitting all configured instances of PGN 65280,
    // allowing a 3rd party product to “sync in” when it is powered up.

    var pgn_data = Concentrate2()

        // PGN 059904 Frame Data Contents according to EmpirBus Application Specific PGN
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

  function readData(data) {
    var buf = new Int64LE(Number(data)).toBuffer()
    return readDataBuffer(buf)
  }
  plugin.readData = readData

  function readDataBuffer(buf) {
    var instance = buf.readUInt8(0)

    var dimmers = [ buf.readUInt16LE(1), buf.readUInt16LE(3) ]

    var bits = buf.readUInt8(5)
    var switches = []
    for ( var i = 0; i < 8; i++ ) {
      switches.push(bits >> i & 0x01)
    }
    return { instance: instance, dimmers: dimmers, switches: switches }
  }
  plugin.readDataBuffer = readDataBuffer


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
