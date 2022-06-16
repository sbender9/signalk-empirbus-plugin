function prefix(n2k) {
  return `electrical.switches.empirBusNxt-instance${n2k.fields['Instance']}`
}

module.exports = [
  function (n2k) {
    var res = []

    for ( var i = 1; i < 3; i++ ) {
      var basePath = `${prefix(n2k)}-dimmer` + i
      
      res.push({
        path: basePath + '.dimmingLevel',
        value: n2k.fields['Dimmer' + i] / 1000.0
      })
      
      res.push({
        path: basePath + '.state',
        value: n2k.fields['Indicator' + i] === 'On' ? true : false
      })

      res.push({
        path: `${basePath}.type`,
        value: "dimmer"
      })

      res.push({
        path: `${basePath}.name`,
        value: `Dimmer ${n2k.fields['Instance']}.${i}`
      })
      
      res.push({
        path: `${basePath}.meta.associatedDevice.instance`,
        value: n2k.fields['Instance']                         // Technical address: Instance in EmpirBus API
      })

      res.push({
        path: `${basePath}.meta.associatedDevice.device`,
        value: `dimmer ${i}`               // Technical address: Device in instance of EmpirBus API
      })

      res.push({
        path: `${basePath}.meta.source`,
        value: 'empirBusNxt'
      })
      
      res.push({
        path: `${basePath}.meta.dataModel`,
        value: 2
      })
        
      res.push({
        path: `${basePath}.meta.manufacturer.name`,
        value: "EmpirBus"
      })
      
      res.push({
        path: `${basePath}.meta.manufacturer.model`,
        value: "NXT DCM"
      })
    }
    
    for (var i = 2; i < 9; i++) {
      const field = 'Indicator' + i
      if (typeof n2k.fields[field] !== 'undefined') {
        var basePath = `${prefix(n2k)}-switch${i}`
        
        res.push({
          path: basePath + '.state',
          value: n2k.fields[field] == 'On' ? true : false
        })

        res.push({
          path: basePath + '.order',
          value: i-2
        })
      }
    }
    return res
  }
]
