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
      dimmers: {
        "0": {
          "state": {
            "value": 0.5
          }
        },
        "1": {
          "state": {
            "value": 1
          }
        }
      },
      switches: {
        "0": {
          "state": {
            "value": "on"
          }
        },
        "1": {
          "state": {
            "value": "off"
          }
        },
        "2": {
          "state": {
            "value": "on"
          }
        },
        "3": {
          "state": {
            "value": "off"
          }
        },
        "4": {
          "state": {
            "value": "on"
          }
        },
        "5": {
          "state": {
            "value": "off"
          }
        },
        "6": {
          "state": {
            "value": "on"
          }
        },
        "7": {
          "state": {
            "value": "off"
          }
        },
      }
    }
    var actisense = plugin.generateStatePGN(1, state)
    actisense.substr(25).should.equal('2,65280,0,255,8,30,99,01,f4,01,e8,03,55')
  })
})

var expected = {
  "electrical": {
    "controls": {
      "empirBusNxt:instance1:dimmer0": {
        "state": "on",
        "brightness": 0.5,
        "type": "dimmer",
        "name": "Dimmer 1.1",
        "meta": {
          "displayName": "Dimmer 1.1"
        },
        "associatedDevice": "{instance:1,dimmer:0",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:dimmer1": {
        "state": "on",
        "brightness": 1,
        "type": "dimmer",
        "name": "Dimmer 1.2",
        "meta": {
          "displayName": "Dimmer 1.2"
        },
        "associatedDevice": "{instance:1,dimmer:1",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch0": {
        "state": "on",
        "type": "switch",
        "name": "Switch 1.1",
        "meta": {
          "displayName": "Switch 1.1"
        },
        "associatedDevice": "{instance:1,switch:0",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch1": {
        "state": "off",
        "type": "switch",
        "name": "Switch 1.2",
        "meta": {
          "displayName": "Switch 1.2"
        },
        "associatedDevice": "{instance:1,switch:1",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch2": {
        "state": "on",
        "type": "switch",
        "name": "Switch 1.3",
        "meta": {
          "displayName": "Switch 1.3"
        },
        "associatedDevice": "{instance:1,switch:2",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch3": {
        "state": "off",
        "type": "switch",
        "name": "Switch 1.4",
        "meta": {
          "displayName": "Switch 1.4"
        },
        "associatedDevice": "{instance:1,switch:3",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch4": {
        "state": "on",
        "type": "switch",
        "name": "Switch 1.5",
        "meta": {
          "displayName": "Switch 1.5"
        },
        "associatedDevice": "{instance:1,switch:4",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch5": {
        "state": "off",
        "type": "switch",
        "name": "Switch 1.6",
        "meta": {
          "displayName": "Switch 1.6"
        },
        "associatedDevice": "{instance:1,switch:5",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch6": {
        "state": "on",
        "type": "switch",
        "name": "Switch 1.7",
        "meta": {
          "displayName": "Switch 1.7"
        },
        "associatedDevice": "{instance:1,switch:6",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
        }
      },
      "empirBusNxt:instance1:switch7": {
        "state": "off",
        "type": "switch",
        "name": "Switch 1.8",
        "meta": {
          "displayName": "Switch 1.8"
        },
        "associatedDevice": "{instance:1,switch:7",
        "source": "empirBusNxt",
        "dataModel": 2,
        "manufacturer": {
          "name": "EmpirBus",
          "model": "NXT DCU"
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
  delta.updates[0].values[0].path.should.equal('electrical.controls.empirBusNxt:instance1:dimmer0.state')
  delta.updates[0].values[0].value.should.equal('on')

  delta.updates[0].values[1].path.should.equal('electrical.controls.empirBusNxt:instance1:dimmer0.brightness')
  delta.updates[0].values[1].value.should.equal(0.5)

  var expected = 'on'
  for ( var i = 0; i < 8; i++ ) {
    delta.updates[0].values[i+2].path.should.equal(`electrical.controls.empirBusNxt:instance1:switch${i}.state`)
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
