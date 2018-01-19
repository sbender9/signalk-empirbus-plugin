const assert = require('assert')
var chai = require('chai')
chai.Should()
chai.use(require('chai-things'))


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

function validate(delta) {
  delta.updates[0].values[0].path.should.equal('electrical.empirBusNxt.1.dimmers.0.state')
  delta.updates[0].values[0].value.should.equal(0.5)
  
  delta.updates[0].values[1].path.should.equal('electrical.empirBusNxt.1.dimmers.1.state')
  delta.updates[0].values[1].value.should.equal(1)
  
  var expected = 'on'
  for ( var i = 0; i < 8; i++ ) {
    delta.updates[0].values[i+2].path.should.equal(`electrical.empirBusNxt.1.switches.${i}.state`)
    delta.updates[0].values[i+2].value.should.equal(expected)
    expected = expected === 'on' ? 'off' : 'on'
  }
}
