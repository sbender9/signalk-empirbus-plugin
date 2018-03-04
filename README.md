# signalk-empirbusnxt-plugin
Monitor and control an EmpirBus NXT via EmpirBus Application Specific PGN 65280 using EmpirBus NXT API component for 3rd party communication

This plugin relies on the "Data Model 2" to read and write the status of 2x dimmers with EmpirBus values 0..1000 and 8x switches 0|1 per instance of an EmpirBus Application Specific PGN component. The values of the two dimmers are expected in the 2x uword values of Data Model 2, while the status of the eight switches is expected in the 8x bit values. Find in the docs folder the EmpirBus NXT documentation for details on how to process data model in EmpirBus NXT programming.

The EmpirBus implementation has to use these instances in the EmpirBus Application Specific PGN component:  
“Receive from network”: X (e.g. 0, 2, 4, 6, ...)  
“Transmit to network”: X + 1 (e.g. 1, 3, 5, 7, ...)  

In EmpirBus devices are numbered 1..8. To avoid confusion Signal K device names are numbered accordingly starting from 1, not from 0.

The dimmer values and switch states are stored in the following Rest API keys:

`electrical/switches/<identifier>`  
`electrical/switches/<identifier>/state`  (true|false)  
`electrical/switches/<identifier>/dimmingLevel`  (0..1)  
`electrical/switches/<identifier>/type`   (switch | dimmer)
`electrical/switches/<identifier>/name`   (System name of control. In EmpirBus devices are numbered 1..8, so device names numbered accordingly 1..8, e.g. Switch 0.8)  

`electrical/switches/<identifier>/meta/displayName`   (Display name of control)  

`electrical/switches/<identifier>/meta/associatedDevice/instance` (Technical device address: Instance in EmpirBus API)    
`electrical/switches/<identifier>/meta/associatedDevice/device` (Technical device address: Device in instance in EmpirBus API e.g. "switch 1" or "dimmer 1)  
`electrical/switches/<identifier>/meta/source` (Information what plugin needs to take care of device)  
`electrical/switches/<identifier>/meta/dataModel` (Bus Data Model, e.g. from the EmpirBus programming)  

`electrical/switches/<identifier>/meta/manufacturer/name`  
`electrical/switches/<identifier>/meta/manufacturer/model`  

`<identifier>` is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary device address (systemname-deviceaddress), e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>  
`<instance>` s the instance of the respective “Receive from network” EmpirBus NXT API component for 3rd party communication 0..49  
`<#>` is the ID of the dimmer (1..2) or switch (1..8)  
`state` is state of switch or dimmer 'on' or 'off'  
`dimmingLevel` the dimming value of dimmer as a ratio from 0 to 1, where 1 = 100%  
`associatedDevice` is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT   `{"instance":0,"switch":0}` or `{"instance":0,"dimmer":0}`


Values to send to device are expected via PUT method at:
`/plugins/signalk-empirbus-nxt/switches/<ID>/<state>|<dimmingLevel>`, e.g.`/plugins/signalk-empirbus-nxt/switches/empirBusNxt-instance0-dimmer0/true`


## To Do
As Type, Display Name and Data Model are not readable from NMEA in case of EmpirBus, they need to be set manually. This could be done in a configuration file, similar to how it is done in the Homegridge Signal K Plugin. Maybe even via Signal K admin interface in "Signal K Server Plugin Configuration"?

      "displayNames": {  
        "electrical.switches.empirBusNxt-instance0-device0": "Ceiling Lamp",  
        "electrical.switches.empirBusNxt-instance0-switch0": "Engine Room Light",  
        "electrical.switches.empirBusNxt-instance0-switch1": "Ceiling Fan",  
      },  

      "controlTypes": {  
        "electrical.switches.empirBusNxt-instance0-device0": "LightBulb",  
        "electrical.switches.empirBusNxt-instance0-switch0": "Switch",  
        "electrical.switches.empirBusNxt-instance0-switch1": "Fan",  
      },  

      "dataModel": 2


The devices to be ignored could also be set here, since e. g. EmpirBus always sends the complete set of elements in the data model, regardless of whether a device is connected or not.

      "ignoredPaths": [  
        "electrical.switches.empirBusNxt-instance0-switch2",  
        "electrical.switches.empirBusNxt-instance0-switch3",  
        "electrical.switches.empirBusNxt-instance0-switch4"  
      ]  
