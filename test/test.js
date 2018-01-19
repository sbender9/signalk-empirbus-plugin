const assert = require('assert')
var chai = require('chai')
chai.Should()
chai.use(require('chai-things'))


var app = {}

/*
app.on = function() {
}

app.emit = function() {
}
*/

var result
app.handleMessage = (id, delta) => {
  result = delta
}

const plugin = require('../index')(app)

const pgn = {"timestamp":"2018-01-19T15:37:01.781Z","prio":2,"src":0,"dst":255,"pgn":65280,"description":"Manufacturer Proprietary single-frame non-addressed","fields":{ "Manufacturer Code": "Empirbus","Industry Code":"Marine","Data":"280392242426880"}}

describe('Read pgn 65280', () => {
  it('works', () => {
    plugin.listener(pgn)
    assert.ok(result, 'no result')
    //console.log(JSON.stringify(result))
    
    result.updates[0].values[0].path.should.equal('electrical.empirBusNxt.1.dimmers.0.state')
    //result.updates[0].values[0].value.should.equal(0.5)

    result.updates[0].values[1].path.should.equal('electrical.empirBusNxt.1.dimmers.1.state')
    //result.updates[0].values[1].value.should.equal(1)

    var expected = 'on'
    for ( var i = 0; i < 8; i++ ) {
      result.updates[0].values[i+2].path.should.equal(`electrical.empirBusNxt.1.switches.${i}.state`)
      result.updates[0].values[i+2].value.should.equal(expected)
      expected = expected === 'on' ? 'off' : 'on'
    }
  })
})
