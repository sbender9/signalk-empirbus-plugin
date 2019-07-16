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

// Key path according to EmpirBus Application Specific PGN 65280 Data Model 2 (2x word + 8x bit) per instance:
// 2x dimmer dimmingLevel 0 = 0% .. 1000 = 100%,
// 8x switch states true = on / false = off
// First two switches represent the state of the two dimmers
//
// EmpirBus implementation has to use these instances in the API PGN component:
// “Receive from network”: X (e.g. 0, 2, 4, 6)
// “Transmit to network”: X + 1 (e.g. 1, 3, 5, 7)
//
// EmpirBus API PGN component connectors are numbered Word 1..2 + Bit 1..8.
// To avoid confusion Signal K device names are numbered accordingly starting from 1, not from 0
// electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-dimmer<#1..2>.dimmingLevel
// electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-switch<#1..8>.state
// The first two switches represent the state of the two dimmers
//
// Signak K API keys for EmpirBus NXT devices:
// electrical/switches/<identifier>
// electrical/switches/<identifier>/state  (true|false)
// electrical/switches/<identifier>/dimmingLevel  (0..1)
// electrical/switches/<identifier>/type   (switch | dimmer)
// electrical/switches/<identifier>/name   (System name of control, e.g. Switch 0.8)
//
// electrical/switches/<identifier>/meta/displayName   (Display name of control)
//
// electrical/switches/<identifier>/meta/associatedDevice/instance (Technical device address: Instance in EmpirBus API)
// electrical/switches/<identifier>/meta/associatedDevice/device (Technical device address: Device in instance in EmpirBus API e.g. "switch 1" or "dimmer 1")

// electrical/switches/<identifier>/meta/source (Information what plugin needs to take care of the device)
// electrical/switches/<identifier>/meta/dataModel (Bus Data Model used in the EmpirBus programming, currently only Data Model 2 is supported)
//
// electrical/switches/<identifier>/meta/manufacturer/name ("EmpirBus")
// electrical/switches/<identifier>/meta/manufacturer/model ("NXT DCM")
//
//
// <identifier> is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary decive address (systemname-deviceaddress),
// e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>
// <instance> is the instance of the respective “Receive from network” EmpirBus NXT API component for 3rd party communication 0..49
// <#> is the ID of the dimmer (1..2) or switch (1..8)
// state is state of switch or dimmer 'on' or 'off'
// dimmingLevel is the dimming value of dimmer from 0.000 to 1.000 (decimal)
// associatedDevice is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT {"instance":0,"switch":1} or {"instance":0,"dimmer":1}

// Values to send to device are expected via PUT method at: electrical/switches/<identifier>/state|dimmingLevel
// e.g. electrical/switches/empirBusNxt-instance0-dimmer0/dimmingLevel
// body: {value:0.75}
// body: JSON.stringify({value: value})


const debug = require("debug")("signalk-empirbusnxt")
const path = require('path')
const Concentrate2 = require("concentrate2");
const Bitfield = require("bitfield")
const Int64LE = require('int64-buffer').Int64LE
const _ = require('lodash')

const manufacturerCode = "Empir Bus" // According to http://www.nmea.org/Assets/20140409%20nmea%202000%20registration%20list.pdf
const pgnApiNumber = 65280 // NMEA2000 Proprietary PGN 65280 – Single Frame, Destination Address Global
const pgnIsoNumber = 059904 // NMEA 2000 ISO request PGN 059904 - Single Frame, Destination Address Global
const pgnAddress = 255 // Device to send to, 255 = global address, used for sending addressed messages to all nodes
const instancePath = 'electrical.switches' // Key path: electrical.switches.empirBusNxt-instance<NXT component instance 0..49>-switch|dimmer<#1..8>.state
const switchingIdentifier = 'empirBusNxt'

const validSwitchValues = [true, false, 'on', 'off', 0, 1]

module.exports = function(app) {
  var plugin = {};
  var onStop = []
  var options
  var empirBusInstance
  var registeredForPut = {}
  var currentStateByInstance = {}

  plugin.id = "signalk-empirbus-nxt"
  plugin.name = "EmpirBus NXT Control"

  plugin.start = function(theOptions) {
    debug('Starting: EmpirBus NXT Control')

    options = theOptions

    app.on('N2KAnalyzerOut', plugin.listener)
    app.setProviderStatus('Waiting for NMEA2000 connect')

    app.on('nmea2000OutAvailable', () => {
      setTimeout( () => {
        sendStatusRequest()
        app.setProviderStatus('ISO request PGN 059904 sent for sync')
        console.log('ISO request PGN 059904 sent on poweron for easy sync')
      }, 2000)
    })
  }

  plugin.listener = (msg) => {

    if ( msg.pgn == pgnApiNumber && msg.fields['Manufacturer Code'] == manufacturerCode ) {
      var state = readData(msg.fields['Data'])

      state.instance--;    // "Receive from network" instance = "Transmit to network" instance + 1

      if ( currentStateByInstance[state.instance] ) {
        state.restoreDimmingLevels = currentStateByInstance[state.instance].restoreDimmingLevels
      }
      app.handleMessage(plugin.id, createDelta(state))
      currentStateByInstance[state.instance] = state
      app.setProviderStatus(`EmpirBus instance ${state.instance} status recieved`)
      debug('\nRecieved:\n %O', state)
    } else if ( msg.pgn == pgnApiNumber ) {
      app.setProviderStatus(`PGN 65280 Manufacturer Code ${msg.fields['Manufacturer Code']} ignored`)
      console.log('\nPGN 65280 ignored:\n %O', msg)
    }
  }

  function createDelta(status) {
    var values = []

    status.dimmers.forEach((value, index) => {
      var empirbusIndex = index +1   // EmpirBus devices are numbered 1..8, starting with 1
      var dimmerPath = `${instancePath}.${switchingIdentifier}-instance${status.instance}-dimmer${empirbusIndex}`
      var dimmerValues = [
        {
          path: `${dimmerPath}.state`,
          value: status.switches[index] ? true : false
        },
        {
          path: `${dimmerPath}.dimmingLevel`,      // Save even dimmingLevel 0 to create API key in any case
          value: value / 1000.0
        },
        {
          path: `${dimmerPath}.type`,
          value: "dimmer"
        },
        {
          path: `${dimmerPath}.name`,
          value: `Dimmer ${status.instance}.${empirbusIndex}`
        },
        {
          path: `${dimmerPath}.meta.associatedDevice.instance`,
          value: status.instance                         // Technical address: Instance in EmpirBus API
        },
        {
          path: `${dimmerPath}.meta.associatedDevice.device`,
          value: `dimmer ${empirbusIndex}`               // Technical address: Device in instance of EmpirBus API
        },
        {
          path: `${dimmerPath}.meta.source`,
          value: switchingIdentifier
        },
        {
          path: `${dimmerPath}.meta.dataModel`,
          value: 2
        },
        {
          path: `${dimmerPath}.meta.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${dimmerPath}.meta.manufacturer.model`,
          value: "NXT DCM"
        }
      ]

      if ( !registeredForPut[status.instance] && app.registerActionHandler ) {
        app.registerActionHandler('vessels.self',
                                  `${dimmerPath}.state`,
                                  getActionHandler({
                                    instance: status.instance,
                                    empirbusIndex: empirbusIndex,
                                    type: 'state'
                                  }))
        app.registerActionHandler('vessels.self',
                                  `${dimmerPath}.dimmingLevel`,
                                  getActionHandler({
                                    instance: status.instance,
                                    empirbusIndex: empirbusIndex,
                                    type: 'dimmerLevel'
                                  }))
      }
      if  (Number(value)>0 ) { // Do not save dimmingLevel=0 if dimmer is off, so last dimmingLevel can be restored when switching back on
        status.restoreDimmingLevels[index] = value
        debug('Dimmer Level saved:', Number(value))
      }

      values = values.concat(dimmerValues)
    })

    for (var index = 2; index < status.switches.length; index++) {  // status.switches[0] and [1] handled above as dimmer states

      var value = status.switches[index]
      var empirbusIndex = index +1
      var switchPath = `${instancePath}.${switchingIdentifier}-instance${status.instance}-switch${empirbusIndex}`
      var switchValues = [
        {
          path: `${switchPath}.state`,
          value: value ? true : false
        },
        {
          path: `${switchPath}.type`,
          value: "switch"
        },
        {
          path: `${switchPath}.name`,
          value: `Switch ${status.instance}.${empirbusIndex}`
        },
        {
          path: `${switchPath}.meta.associatedDevice.instance`,
          value: status.instance                         // Technical address: Instance in EmpirBus API
        },
        {
          path: `${switchPath}.meta.associatedDevice.device`,
          value: `switch ${empirbusIndex}`               // Technical address: Device in instance of EmpirBus
        },
        {
          path: `${switchPath}.meta.source`,
          value: switchingIdentifier
        },
        {
          path: `${switchPath}.meta.dataModel`,
          value: 2
        },
        {
          path: `${switchPath}.meta.manufacturer.name`,
          value: "EmpirBus"
        },
        {
          path: `${switchPath}.meta.manufacturer.model`,
          value: "NXT DCM"
        }
      ]
      if ( !registeredForPut[status.instance] && app.registerActionHandler ) {
        app.registerActionHandler('vessels.self',
                                              `${switchPath}.state`,
                                              getActionHandler({
                                                instance: status.instance,
                                                empirbusIndex: empirbusIndex,
                                                type: 'state'
                                              }))
      }
      values = values.concat(switchValues)
    }

    registeredForPut[status.instance] = true

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
    onStop.forEach(f => f())
  }

  function getActionHandler(data) {
    return (context, path, value, cb) => {
      return actionHandler(context, path, value, data, cb)
    }
  }

  function actionHandler(context, path, value, data, cb) {
    // Now we need to collect states of all devices of this instances
    // Simple way: Relay on Data Model 2 to collect dimmers 0+1 and switches 0-7
    // Potential later complex way: Parse all electrical.switches and filter for associatedDevice.instance

    var currentState = currentStateByInstance[data.instance]

    debug('\n')
    // debug('Path: %O', path)
    // debug('Value: %O', value)
    // debug('Data: %O', data)
    debug(`Setting ${data.type} ${data.instance}.${data.empirbusIndex} to ${value} (Instance ${data.instance})`)
    app.setProviderStatus(`Setting device ${data.instance}.${data.empirbusIndex} ${data.type} to ${value} (Instance ${data.instance})`)

    // Set respective parameter for the adressed dimmer or switch
    if ( data.type === 'state' ) {
      if ( validSwitchValues.indexOf(value) == -1 ) {
        app.setProviderError(`Invalid switch value ${value} (Instance ${data.instance})`)
        return { state: 'COMPLETED', statusCode:400, message: `Invalid switch value ${value}` }
      }
    }

    if ( data.type === 'state' ) {      // maybe I should add: || (data.type === 'dimmerLevel' && value == 0)
      currentState.switches[data.empirbusIndex-1] = (value === true || value === 'on' || value === 1) ? 1 : 0;
      if (currentState.switches[data.empirbusIndex-1] == 1 && currentState.dimmers[data.empirbusIndex-1] == 0 ) {  // Switching on with dimmingLevel 0 is not possible
        currentState.dimmers[data.empirbusIndex-1] = 1000
      }
    } else if ( data.type === 'dimmerLevel' )  {
      if ( value >= 0 && value <= 1 ) {
        currentState.dimmers[data.empirbusIndex-1] = value * 1000
      } else {
        app.setProviderError(`Invalid dimmer level ${value} (Instance ${data.instance})`)
        return { state: 'COMPLETED', statusCode:400, message: `Invalid dimmer level ${value}` }
      }
    }

    // Send out to all devices by pgnAddress = 255
    var pgn = plugin.generateStatePGN(data.instance, currentState)
    debug('Send %O', currentState)
    debug('Sending pgn %j', pgn)
    app.emit('nmea2000out', pgn)
    app.setProviderStatus(`Device ${data.instance}.${data.empirbusIndex} ${data.type} set to ${value} (Instance ${data.instance})`)

    return { state: 'COMPLETED', statusCode:200 }

    // Signal K keys are not updated here. EmpirBus implementation needs to answer with new device state PNG for keys update
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
        .uint16(state.dimmers[0])
        .uint16(state.dimmers[1])

    for ( var i = 0; i < 8; i++ ) {
      concentrate.tinyInt(state.switches[i], 1) // Switch state converted back to EmpirBus format 0/1
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

    var switches = app.getSelfPath(instancePath)

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
          // "title": "Deactivate blind devices in list",
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
    return {
      instance: instance,
      dimmers: dimmers,
      switches: switches,
      restoreDimmingLevels: [ 1000, 1000 ]
    }
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
