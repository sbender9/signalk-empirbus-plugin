# signalk-empirbusnxt-plugin
Monitor and control an EmpirBus NXT via EmpirBus Application Specific PGN 65280 using EmpirBus NXT API component for 3rd party communication

This plugin relies on the "Data Model 2" to read and write the status of 2x dimmers with EmpirBus values 0..1000 and 8x switches 0/1 per instance of an EmpirBus Application Specific PGN component. The values of the two dimmers are expected in the 2x uword values of Data Model 2, while the status of the eight switches is expected in the 8x bit values.

Find in the docs folder the EmpirBus NXT documentation for details on how to process data model in EmpirBus NXT programming.

The dimmer values and switch states are stored in the following Rest API keys:

`electrical/controls/<ID>`  
`electrical/controls/<ID>/state`  (on|off)  
`electrical/controls/<ID>/brightness`  (0..1)  
`electrical/controls/<ID>/type`   (switch/dimmer/relais/etc.)  
`electrical/controls/<ID>/name`   (System name of control. In EmpirBus devices are numbered 1..8, so device names numbered accordingly 1..8, e.g. Switch 0.8)  

`electrical/controls/<ID>/meta/displayName`   (Display name of control)  

`electrical/controls/<ID>/associatedDevice/instance` (Technical device address: Instance in EmpirBus API)    
`electrical/controls/<ID>/associatedDevice/device` (Technical device address: Device in instance in EmpirBus API e.g. "switch 0" or "dimmer 0")  
`electrical/controls/<ID>/source` (Information what plugin needs to take care of device)  
`electrical/controls/<ID>/dataModel` (Bus Data Model, e.g. from the EmpirBus programming)  

`electrical/controls/<ID>/manufacturer/name`  
`electrical/controls/<ID>/manufacturer/model`  

`<ID>` is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary device address (systemname-deviceaddress), e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>  
`<instance>` is the ID of the respective EmpirBus NXT API component for 3rd party communication 0..49  
`<#>` is the ID of the dimmer (0..1) or switch (0..7)  
`state` is state of switch or dimmer 'on' or 'off'  
`brightness` the dimming value of dimmer from 0.000 to 1.000 (decimal)  
`associatedDevice` is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT   `{"instance":0,"switch":0}` or `{"instance":0,"dimmer":0}`


Values to send to device are expected via PUT method at:
`/plugins/signalk-empirbus-nxt/controls/<ID>/<state>|<brightness>`, e.g.`/plugins/signalk-empirbus-nxt/controls/empirBusNxt-instance0-dimmer0/on`

As Type, Display Name and Data Model are not readable from NMEA in case of EmpirBus, they need to be set manually. This could be done in a configuration file, similar to how it is done in the Homegridge Signal K Plugin. Maybe even via Signal K admin interface in "Signal K Server Plugin Configuration"?

      "displayNames": {  
        "electrical.controls.empirBusNxt-instance0-device0": "Ceiling Lamp",  
        "electrical.controls.empirBusNxt-instance0-switch0": "Engine Room Light",  
        "electrical.controls.empirBusNxt-instance0-switch1": "Ceiling Fan",  
      },  

      "controlTypes": {  
        "electrical.controls.empirBusNxt-instance0-device0": "LightBulb",  
        "electrical.controls.empirBusNxt-instance0-switch0": "Switch",  
        "electrical.controls.empirBusNxt-instance0-switch1": "Fan",  
      },  

      "dataModel": 2


The devices to be ignored could also be set here, since e. g. EmpirBus always sends the complete set of elements in the data model, regardless of whether a device is connected or not.

      "ignoredPaths": [  
        "electrical.controls.empirBusNxt-instance0-switch2",  
        "electrical.controls.empirBusNxt-instance0-switch3",  
        "electrical.controls.empirBusNxt-instance0-switch4"  
      ]  
