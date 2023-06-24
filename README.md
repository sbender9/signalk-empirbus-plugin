# Signal K EmpirBus NXT Plugin
<a href="https://www.npmjs.com/package/signalk-empirbusnxt-plugin"><img title="npm version" src="https://badgen.net/npm/v/signalk-empirbusnxt-plugin" ></a>
<a href="https://www.npmjs.com/package/signalk-empirbusnxt-plugin"><img title="npm downloads" src="https://badgen.net/npm/dt/signalk-empirbusnxt-plugin"></a>

Monitor and control an EmpirBus NXT via EmpirBus application specific PGN 65280 using EmpirBus NXT API component for 3rd party communication

This plugin relies on the "Data Model 2" to read and write the status of 2x dimmers with EmpirBus values 0..1000 and 8x switches 0|1 per instance of an EmpirBus Application Specific PGN component. The first two switches represent the state of the two dimmers.

The values of the two dimmers are expected in the 2x uword values of Data Model 2, while the status of the eight switches is expected in the 8x bit values. Find in the docs folder the EmpirBus NXT documentation for details on how to process data model in EmpirBus NXT programming.

The EmpirBus implementation has to use these instances in the EmpirBus Application Specific PGN component:  
“Receive from network”: X (e.g. 0, 2, 4, 6, ...)  
“Transmit to network”: X + 1 (e.g. 1, 3, 5, 7, ...)  

EmpirBus API PGN component connectors are numbered Word 1..2 + Bit 1..8. To avoid confusion Signal K device names are numbered accordingly starting from 1, not from 0.

The dimmer values and switch states are stored in the following Rest API keys:

`electrical/switches/<identifier>`  
`electrical/switches/<identifier>/state`  (true|false)  
`electrical/switches/<identifier>/dimmingLevel`  (0..1)  
`electrical/switches/<identifier>/type`   ("switch" | "dimmer")  

`electrical/switches/<identifier>/state/meta/units`   ("bool")  
`electrical/switches/<identifier>/state/meta/displayName`   (System name of control. While instances start with 0, in EmpirBus devices are numbered 1..8, so device names numbered accordingly 1..8, e.g. Switch 0.8)  
`electrical/switches/<identifier>/state/meta/associatedDevice/instance` (Technical device address: Instance in EmpirBus API)   
`electrical/switches/<identifier>/state/meta/associatedDevice/device` (Technical device address: Device in instance in EmpirBus API e.g. "switch 1" or "dimmer 1)  

`electrical/switches/<identifier>/state/meta/units`   ("ratio")  
`electrical/switches/<identifier>/state/meta/description`   ("Dimmer brightness ratio, 0<=ratio<=1, 1 is 100%")  
`electrical/switches/<identifier>/state/meta/displayName`   (System name of brightness, e.g. "Switch 0.8 brightness")  

`<identifier>` is the device identifier, concattenated from the name of digital switching system and a system plugin proprietary device address (systemname-deviceaddress), e.g. for EmpirBus NXT devices this is empirBusNxt-instance<instance>-dimmer|switch<#>  
`<instance>` is the instance of the respective “Receive from network” EmpirBus NXT API component for 3rd party communication 0..49  
`<#>` is the ID of the dimmer (1..2) or switch (1..8)  
`state` is state of switch or dimmer 'on' or 'off'  
`dimmingLevel` the dimming value of dimmer as a ratio from 0 to 1, where 1 = 100%  
`associatedDevice` is the address of device proprietary to the plugin and digital switching system, e.g. for EmpirBus NXT   `{"instance":0,"switch":0}` or `{"instance":0,"dimmer":0}`


Values to send to device are expected via PUT method at: `electrical/switches/<identifier>/state|dimmingLevel` with `body: JSON.stringify({value: value})`
e.g. electrical/switches/empirBusNxt-instance0-dimmer0/dimmingLevel, body: {value:0.75}  
