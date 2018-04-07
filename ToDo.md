
## To Do
As Type, Display Name and Data Model are not readable from NMEA in case of EmpirBus, they need to be set manually. This could be done in a configuration file, similar to how it is done in the Homebridge Signal K Plugin. Maybe even via Signal K admin interface in "Signal K Server Plugin Configuration"?

      "displayNames": {  
        "electrical.switches.empirBusNxt-instance0-device0": "Ceiling Lamp",  
        "electrical.switches.empirBusNxt-instance0-switch3": "Engine Room Light",  
        "electrical.switches.empirBusNxt-instance0-switch": "Ceiling Fan",  
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
