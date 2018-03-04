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
// EmpirBus implementation has to use these instances in the API PGN component:
// “Receive from network”: X (e.g. 0, 2, 4, 6)
// “Transmit to network”: X + 1 (e.g. 1, 3, 5, 7)
//
// EmpirBus devices are numbered 1..8. To avoid confusion Signal K device names numbered accordingly starting from 1, not from 0
//
// electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-dimmer<#1..2>.state
// electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-switch<#1..8>.state

// electrical/switches/<identifier>
// electrical/switches/<identifier>/state  (true|false)
// electrical/switches/<identifier>/dimmingLevel  (0..1)
// electrical/switches/<identifier>/type   (switch | dimmer | relais | etc.)
// electrical/switches/<identifier>/name   (System name of control, e.g. Switch 0.8)
//
// electrical/switches/<identifier>/meta/displayName   (Display name of control)
//
// electrical/switches/<identifier>/meta/associatedDevice/instance (Technical device address: Instance in EmpirBus API)
// electrical/switches/<identifier>/meta/associatedDevice/device (Technical device address: Device in instance in EmpirBus API e.g. "switch 1" or "dimmer 1")

// electrical/switches/<identifier>/meta/source (Information what plugin needs to take care of device)
// electrical/switches/<identifier>/meta/dataModel (Bus Data Model, e.g. from the EmpirBus programming)
//
// electrical/switches/<identifier>/meta/manufacturer/name
// electrical/switches/<identifier>/meta/manufacturer/model
//
// <identifier> is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary decive address (systemname-deviceaddress), e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>
// <instance> is the instance of the respective “Receive from network” EmpirBus NXT API component for 3rd party communication 0..49
// <#> is the ID of the dimmer (1..2) or switch (1..8)
// state is state of switch or dimmer 'on' or 'off'
// dimmingLevel is the dimming value of dimmer from 0.000 to 1.000 (decimal)
// associatedDevice is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT {"instance":0,"switch":1} or {"instance":0,"dimmer":1}

// Values to send to device are expected via PUT method at:
// /plugins/signalk-empirbus-nxt/switches/<identifier>/<state>|<dimmingLevel>, e.g. /plugins/signalk-empirbus-nxt/switches/empirBusNxt-instance0-dimmer0/true


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
const instancePath = 'electrical.switches' // Key path: electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-switch|dimmer<#1..8>.state
const switchingIdentifier = 'empirBusNxt'


module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var options
  var empirBusInstance

  plugin.id = "signalk-empirbus-nxt";
  plugin.name = "EmpirBus NXT Control";

  plugin.start = function(theOptions) {
    debug("Starting: EmpirBus NXT Control");

    options = theOptions

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
          console.log('ISO request PGN 059904 sent on poweron for easy sync')
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
    var empirbusIndex = 0  // EmpirBus devices are numbered 1..8, satrting with 1
    var values = []

    status.instance--;    // "Receive from network" instance = "Transmit to network" instance + 1

    status.dimmers.forEach((value, index) => {
      empirbusIndex = index +1
      values = values.concat([
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.state`,
          value: value ? true : false
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.type`,
          value: "dimmer"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.name`,
          value: `Dimmer ${status.instance}.${empirbusIndex}`
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.displayName`,
          value: `Dimmer ${status.instance}.${empirbusIndex}`     // FIXME: Should be read from defaults.json
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.associatedDevice.instance`,
          value: status.instance                         // Technical address: Instance in EmpirBus API
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.associatedDevice.device`,
          value: `dimmer ${empirbusIndex}`               // Technical address: Device in instance of EmpirBus
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.source`,
          value: switchingIdentifier
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.dataModel`,
          value: 2
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.meta.manufacturer.model`,
          value: "NXT DCM"
        }
      ])
      if  (Number(value)>0 ) { // Do not save dimmingLevel=0 if dimmer is off, so last dimmingLevel can be restored when switching back on
        values.push({
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}.dimmingLevel`,
          value: value / 1000.0
        })
      }
    })

    // FIXME: Code is very redundant
    status.switches.forEach((value, index) => {
      empirbusIndex = index +1
      values = values.concat([
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.state`,
          value: value ? true : false
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.type`,
          value: "switch"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.name`,
          value: `Switch ${status.instance}.${empirbusIndex}`
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.displayName`,
          value: `Switch ${status.instance}.${empirbusIndex}`     // FIXME: Should be read from defaults.json
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.associatedDevice.instance`,
          value: status.instance                         // Technical address: Instance in EmpirBus API
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.associatedDevice.device`,
          value: `switch ${empirbusIndex}`               // Technical address: Device in instance of EmpirBus
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.source`,
          value: switchingIdentifier
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.dataModel`,
          value: 2
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}.meta.manufacturer.model`,
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
    // EmpirBus handles only one value per device: state 'off' is dimmingLevel 0
    // So API PUT needs only one parameter
    // even though Signal K plugin stores state and dimmingLevel separately for HomeKit

    router.put('/switches/:identifier/:state', (req, res) => {
      const identifier = req.params.identifier
      const value = req.params.state

      // Now we need to collect states of all devices of this instances
      // Simple way: Relay on Data Model 2 to collect dimmers 0+1 and switches 0-7
      // Potential later complex way: Parse all electrical.switches and filter for associatedDevice.instance

      var current_state = _.get(app.signalk.self, `${instancePath}`)

      // 501 No electrical switches keys at all
      if ( _.isUndefined(current_state) ) {
        res.status(501)
        res.send(`EmpirBus NXT not connected: No devices found at ${instancePath}`)
        return
      }

      // 404 No EmpirBus keys for that instance
      if ( _.isUndefined(current_state[`${identifier}`]) ) {
        res.status(404)
        res.send(`Device not found: No EmpirBus NXT device for ${identifier}`)
        return
      }

      //make a copy since we're going to modify it
      current_state = JSON.parse(JSON.stringify(current_state))

      // Set respective parameter for the adressed dimmer or switch
      if (Number(value)>=0 && Number(value)<=1 && current_state[`${identifier}`].type.value == 'dimmer') {  // :state is value of dimmingLevel
        current_state[`${identifier}`].dimmingLevel.value = value
      } else if (value == 'true' || value == 'on' || value == 'false' || value == 'off') {
        current_state[`${identifier}`].state.value = (value == 'true' || value == 'on') ? true : false;
      } else {
        res.status(400) // 400 No valid parameter for EmpirBus device
        res.send(`Invalid parameter: ${value} is no valid setting for device ${identifier}`)
        return
      }

      // Send out to all devices by pgnAddress = 255
      app.emit('nmea2000out', plugin.generateStatePGN(Number(current_state[`${identifier}`].meta.associatedDevice.instance.value), current_state))
      res.send(`Ok: Setting ${value} sent to device ${identifier} via NMEA`)

      // Signal K keys are not updated here. EmpirBus implemenation needs to answer with new device state PNG for keys update
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
    .uint16(state[`${switchingIdentifier}-instance${instance}-dimmer1`].state.value == false ?
        0 : state[`${switchingIdentifier}-instance${instance}-dimmer1`].dimmingLevel.value * 1000.0)     // Dimmer state converted back to EmpirBus format 0...1000
    .uint16(state[`${switchingIdentifier}-instance${instance}-dimmer2`].state.value == false ?
        0 : state[`${switchingIdentifier}-instance${instance}-dimmer2`].dimmingLevel.value * 1000.0)     // Dimmer state converted back to EmpirBus format 0...1000

    for ( var i = 1; i < 9; i++ ) {
      concentrate.tinyInt(state[`${switchingIdentifier}-instance${instance}-switch${i}`].state.value == false ? 0 : 1, 1) // Switch state converted back to EmpirBus format 0/1
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

  plugin.schema = function() {

    var switches = _.get(app.signalk.self, `${instancePath}`)

    // Error Message if no electrical switches keys at all
    if ( _.isUndefined(switches) ) {
      dynamicSchema = {
        "description": `EmpirBus NXT not connected: No devices found at ${instancePath}`,
        "type": "object",
        "properties": {
        }
      }
      return dynamicSchema;
    }

    var devices = []
    _.keys(switches).forEach(device => {
      if ((device.slice(0,switchingIdentifier.length)) == switchingIdentifier ) {
        devices = devices.concat(switches[device].name.value)
          //     identifier: device,
          //     type: switches[device].type.value,
          //     name: switches[device].name.value,
          //     displayName: switches[device].meta.displayName.value,
          //     instance : switches[device].associatedDevice.instance.value,
          //     device : switches[device].associatedDevice.device.value
      }
    })

    dynamicSchema = {
      "description": `EmpirBus NXT devices found at ${instancePath}`,
      "type": "object",
      "properties": {
        "activeDevicesList": {
          "type": "array",
          "title": "Deactivate blind devices in list",
          "items": {
            "type": "string",
            "enum": devices
          },
          "uniqueItems": true
        }
      }
    }

    return dynamicSchema;
  }

  plugin.uiSchema = {
    "activeDevicesList": {
       "ui:widget": "checkboxes"
     },
  }

  // /*
  //   dataModel: {
  //   title: 'Data Model',
  //   type: 'number',
  //   enum: [ 1, 2, 3, 4, 5],
  //   enumNames: [ 'Model 1', 'Model 2', 'Model 3', 'Model 4', 'Model 5']
  // */

  // plugin.schema = {
  //   "title": "Empire Bus NXT",
  //   "type": "object",
  //   "properties": {
  //     "devices": {
  //       "type": "array",
  //       "title": "Devices",
  //       "items": {
  //         "type": "object",
  //         "properties": {
  //           "enabled": {
  //             "title": "Enabled",
  //             "type": "boolean"
  //           },
  //           "deviceType": {
  //             "title": "Device Type",
  //             "type": "string"
  //           },
  //           "displayName": {
  //             "title": "Display Name",
  //             "type": "string"
  //           }
  //         }
  //       }
  //     },
  //     "ignoredDevices" : {
  //       "type": "object",
  //       "title": "Ignored Devices",
  //       "properties": {
  //         "ignoredDevicesList": {
  //           "type": "string",
  //           "title": "Enter devices to ignore one per line:"
  //         }
  //       }
  //     }
  //   }
  // }
  //
  // plugin.uiSchema = {
  //   "ignoredDevices": {
  //     "ignoredDevicesList": {
  //       "ui:widget": "textarea",
  //       "ui:options": {
  //         "rows": 7
  //       }
  //     }
  //   }
  // }

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
