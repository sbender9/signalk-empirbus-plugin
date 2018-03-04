const assert = require('assert')
const _ = require('lodash')
var chai = require('chai')
chai.Should()
chai.use(require('chai-things'))
chai.use(require('chai-json-equal'));

var app = {}
var result

app.handleMessage = (id, delta) => {
  result = delta
}

const plugin = require('../index')(app)

describe('Read pgn 65280', () => {
  it('from buffer works', () => {
    const correct_buffer = new Buffer(new Uint8Array([0x01,0xf4,0x01,0xe8,0x03,0x55]))
    var state = plugin.readDataBuffer(correct_buffer)
    var delta = plugin.createDelta(state)
    validate(delta)
  }),
  it('from actisense works', () => {
    const pgn = {"timestamp":"2018-01-19T15:37:01.781Z","prio":2,"src":0,"dst":255,"pgn":65280,"description":"Manufacturer Proprietary single-frame non-addressed","fields":{ "Manufacturer Code": "Empirbus","Industry Code":"Marine","Data":"93475265704961"}}
    plugin.listener(pgn)
    assert.ok(result, 'no result')
    validate(result)
  }),
  it('to actisense', () => {
    const state = {
      "empirBusNxt-instance0-dimmer1": {
        "state": {
          "value": true
        },
        "dimmingLevel": {
          "value": 0.5
        }
      },
      "empirBusNxt-instance0-dimmer2": {
        "state": {
          "value": true
        },
        "dimmingLevel": {
          "value": 1
        }
      },
      "empirBusNxt-instance0-switch1": {
        "state": {
          "value": true
        }
      },
      "empirBusNxt-instance0-switch2": {
        "state": {
          "value": false
        }
      },
      "empirBusNxt-instance0-switch3": {
        "state": {
          "value": true
        }
      },
      "empirBusNxt-instance0-switch4": {
        "state": {
          "value": false
        }
      },
      "empirBusNxt-instance0-switch5": {
        "state": {
          "value": true
        }
      },
      "empirBusNxt-instance0-switch6": {
        "state": {
          "value": false
        }
      },
      "empirBusNxt-instance0-switch7": {
        "state": {
          "value": true
        }
      },
      "empirBusNxt-instance0-switch8": {
        "state": {
          "value": false
        }
      }
    }
    var actisense = plugin.generateStatePGN(0, state)
    actisense.substr(25).should.equal('2,65280,0,255,8,30,99,00,f4,01,e8,03,55')
  })
})

var expected = {
  "electrical": {
    "switches": {
      "empirBusNxt-instance0-dimmer1": {
        "state": true,
        "dimmingLevel": 0.5,
        "type": "dimmer",
        "name": "Dimmer 0.1",
        "meta": {
          "displayName": "Dimmer 0.1",
          "associatedDevice": {"instance":0,"device":"dimmer 1"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-dimmer2": {
        "state": true,
        "dimmingLevel": 1,
        "type": "dimmer",
        "name": "Dimmer 0.2",
        "meta": {
          "displayName": "Dimmer 0.2",
          "associatedDevice": {"instance":0,"device":"dimmer 2"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch1": {
        "state": true,
        "type": "switch",
        "name": "Switch 0.1",
        "meta": {
          "displayName": "Switch 0.1",
          "associatedDevice": {"instance":0,"device":"switch 1"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch2": {
        "state": false,
        "type": "switch",
        "name": "Switch 0.2",
        "meta": {
          "displayName": "Switch 0.2",
          "associatedDevice": {"instance":0,"device":"switch 2"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch3": {
        "state": true,
        "type": "switch",
        "name": "Switch 0.3",
        "meta": {
          "displayName": "Switch 0.3",
          "associatedDevice": {"instance":0,"device":"switch 3"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch4": {
        "state": false,
        "type": "switch",
        "name": "Switch 0.4",
        "meta": {
          "displayName": "Switch 0.4",
          "associatedDevice": {"instance":0,"device":"switch 4"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch5": {
        "state": true,
        "type": "switch",
        "name": "Switch 0.5",
        "meta": {
          "displayName": "Switch 0.5",
          "associatedDevice": {"instance":0,"device":"switch 5"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch6": {
        "state": false,
        "type": "switch",
        "name": "Switch 0.6",
        "meta": {
          "displayName": "Switch 0.6",
          "associatedDevice": {"instance":0,"device":"switch 6"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch7": {
        "state": true,
        "type": "switch",
        "name": "Switch 0.7",
        "meta": {
          "displayName": "Switch 0.7",
          "associatedDevice": {"instance":0,"device":"switch 7"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      },
      "empirBusNxt-instance0-switch8": {
        "state": false,
        "type": "switch",
        "name": "Switch 0.8",
        "meta": {
          "displayName": "Switch 0.8",
          "associatedDevice": {"instance":0,"device":"switch 8"},
          "source": "empirBusNxt",
          "dataModel": 2,
          "manufacturer": {
            "name": "EmpirBus",
            "model": "NXT DCM"
          }
        }
      }
    }
  }
}

function validate(delta) {
  var flat = toFlat(delta)
  //console.log(JSON.stringify(flat, null, 2))

  flat.should.jsonEqual(expected)

  //console.log(delta.updates[0].values[0])
  /*
  delta.updates[0].values[0].path.should.equal('electrical.controls.empirBusNxt-instance1-dimmer1.state')
  delta.updates[0].values[0].value.should.equal('on')

  delta.updates[0].values[1].path.should.equal('electrical.controls.empirBusNxt-instance1-dimmer1.brightness')
  delta.updates[0].values[1].value.should.equal(0.5)

  var expected = 'on'
  for ( var i = 0; i < 8; i++ ) {
    delta.updates[0].values[i+2].path.should.equal(`electrical.controls.empirBusNxt-instance1-switch${i+1}.state`)
    delta.updates[0].values[i+2].value.should.equal(expected)
    expected = expected === 'on' ? 'off' : 'on'
  }
*/
}

function toFlat(delta) {
  var res = {}
  delta.updates.forEach(update => {
    update.values.forEach(pathValue => {
      _.set(res, pathValue.path, pathValue.value)
    })
  })
  return res
}
